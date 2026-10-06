import { respondToBooking } from './actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/geocode', () => ({ geocodeAddress: jest.fn() }))
jest.mock('@/lib/resend', () => ({ sendBookingAccepted: jest.fn(), sendBookingDeclined: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

type Op = [string, unknown[]]
type Result = unknown | ((ops: Op[]) => unknown)

// Chainable, thenable stand-in for a supabase query builder; a table's result
// may be a function of the ops chained so far (to answer one query differently).
function fakeDb(results: Record<string, Result>) {
  const calls: { table: string; ops: Op[] }[] = []
  const resolve = (table: string, ops: Op[], key = table) => {
    const r = results[key] ?? { data: [], error: null }
    return typeof r === 'function' ? (r as (o: Op[]) => unknown)(ops) : r
  }
  return {
    calls,
    from(table: string) {
      const entry = { table, ops: [] as Op[] }
      calls.push(entry)
      const chain: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (res: (v: unknown) => void) => res(resolve(table, entry.ops))
          if (prop === 'maybeSingle' || prop === 'single') {
            return () => { entry.ops.push([prop, []]); return Promise.resolve(resolve(table, entry.ops, `${table}:one`)) }
          }
          return (...args: unknown[]) => { entry.ops.push([prop, args]); return chain }
        },
      })
      return chain
    },
    auth: { getUser: async () => ({ data: { user: { id: 'cleaner-1' } } }) },
  }
}
const opsOf = (db: ReturnType<typeof fakeDb>, table: string, op: string) =>
  db.calls.filter((c) => c.table === table).flatMap((c) => c.ops.filter(([o]) => o === op).map(([, a]) => a))

const future = new Date(Date.now() + 3600_000).toISOString()
const pendingBooking = {
  id: 'b1', status: 'pending', response_deadline: future, scheduled_date: '2099-01-10', scheduled_start: '10:00:00',
  duration_hours: 3, customer_id: 'host-1', clean_group_id: null,
}
const slot = { id: 's1', start_time: '09:00:00', end_time: '15:00:00' }

function setup(user: Record<string, Result>, admin: Record<string, Result> = {}) {
  const u = fakeDb(user)
  const a = fakeDb(admin)
  ;(createClient as jest.Mock).mockResolvedValue(u)
  ;(createAdminClient as jest.Mock).mockReturnValue(a)
  jest.spyOn(console, 'error').mockImplementation(() => {})
  return { u, a }
}

describe('accepting a request takes the whole availability slot', () => {
  it('remembers the slot on the booking and removes it — no remainders are left open', async () => {
    const { u } = setup({
      'bookings:one': { data: pendingBooking, error: null },
      cleaner_availability: { data: [slot], error: null },
      cleaner_weekly_availability: { data: [], error: null },
    })
    expect(await respondToBooking('b1', 'accepted')).toEqual({ success: true })

    expect(opsOf(u, 'bookings', 'update')).toContainEqual([{ slot_start: '09:00:00', slot_end: '15:00:00' }])
    expect(opsOf(u, 'cleaner_availability', 'delete')).toHaveLength(1)
    // The old behavior re-inserted 09:00–10:00 and 13:00–15:00; that must not happen any more.
    expect(opsOf(u, 'cleaner_availability', 'insert')).toHaveLength(0)
  })

  it('falls back to the old carve-out when the slot cannot be recorded (migration not applied)', async () => {
    const { u } = setup({
      'bookings:one': { data: pendingBooking, error: null },
      cleaner_availability: { data: [slot], error: null },
      cleaner_weekly_availability: { data: [], error: null },
      bookings: (ops: Op[]) =>
        JSON.stringify(ops).includes('slot_start') ? { data: null, error: { message: 'column does not exist' } } : { data: [], error: null },
    })
    expect(await respondToBooking('b1', 'accepted')).toEqual({ success: true })
    const inserted = opsOf(u, 'cleaner_availability', 'insert').map(([row]) => row)
    expect(inserted).toEqual([
      expect.objectContaining({ start_time: '09:00', end_time: '10:00' }),
      expect.objectContaining({ start_time: '13:00', end_time: '15:00' }),
    ])
  })
})
