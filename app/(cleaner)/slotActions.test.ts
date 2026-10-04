import { deleteAvailability, updateAvailability } from './actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/availability', () => ({ restoreAvailability: jest.fn() }))
jest.mock('@/lib/geocode', () => ({ geocodeAddress: jest.fn() }))
jest.mock('@/lib/resend', () => ({ sendBookingAccepted: jest.fn(), sendBookingDeclined: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

// Chainable, thenable stand-in for a supabase query builder; records every
// call so tests can assert what was written.
type Op = [string, unknown[]]
function fakeDb(results: Record<string, unknown>) {
  const calls: { table: string; ops: Op[] }[] = []
  return {
    calls,
    from(table: string) {
      const entry = { table, ops: [] as Op[] }
      calls.push(entry)
      const chain: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(results[table] ?? { data: [], error: null })
          if (prop === 'maybeSingle' || prop === 'single') {
            return () => { entry.ops.push([prop, []]); return Promise.resolve(results[`${table}:one`] ?? { data: null, error: null }) }
          }
          return (...args: unknown[]) => { entry.ops.push([prop, args]); return chain }
        },
      })
      return chain
    },
    auth: { getUser: async () => ({ data: { user: { id: 'cleaner-1' } } }) },
  }
}
const updatesTo = (db: ReturnType<typeof fakeDb>, table: string) =>
  db.calls.filter((c) => c.table === table).flatMap((c) => c.ops.filter(([o]) => o === 'update').map(([, a]) => a[0]))
const insertsTo = (db: ReturnType<typeof fakeDb>, table: string) =>
  db.calls.filter((c) => c.table === table).flatMap((c) => c.ops.filter(([o]) => o === 'insert').map(([, a]) => a[0]))

const FUTURE = '2099-01-10'
const pendingRow = { id: 'b1', scheduled_start: '10:00:00', duration_hours: 3 }

function setup(userResults: Record<string, unknown>, adminResults: Record<string, unknown>) {
  const user = fakeDb(userResults)
  const admin = fakeDb(adminResults)
  ;(createClient as jest.Mock).mockResolvedValue(user)
  ;(createAdminClient as jest.Mock).mockReturnValue(admin)
  return { user, admin }
}

describe('deleteAvailability side effects', () => {
  it('cancels the pending requests it was carrying as "cleaner no longer available" and flags admin', async () => {
    const { admin } = setup(
      {
        'cleaner_availability:one': { data: { date: FUTURE }, error: null },
        cleaner_availability: { data: [{ id: 's1', start_time: '09:00:00', end_time: '15:00:00' }], error: null },
        cleaner_weekly_availability: { data: [], error: null },
      },
      { bookings: { data: [pendingRow], error: null } },
    )
    const res = await deleteAvailability('s1')
    expect(res).toEqual({ success: true })

    expect(updatesTo(admin, 'bookings')[0]).toMatchObject({
      status: 'cancelled', status_reason: 'cleaner_unavailable', cleaner_ack_cancelled: true,
    })
    expect(insertsTo(admin, 'schedule_events')[0]).toMatchObject({ kind: 'slot_deleted', cleaner_id: 'cleaner-1', affected_count: 1 })
  })

  it('leaves requests alone when another slot still covers them', async () => {
    const { admin } = setup(
      {
        'cleaner_availability:one': { data: { date: FUTURE }, error: null },
        cleaner_availability: {
          data: [{ id: 's1', start_time: '09:00:00', end_time: '15:00:00' }, { id: 's2', start_time: '08:00:00', end_time: '16:00:00' }],
          error: null,
        },
        cleaner_weekly_availability: { data: [], error: null },
      },
      { bookings: { data: [pendingRow], error: null } },
    )
    await deleteAvailability('s1')
    expect(updatesTo(admin, 'bookings')).toHaveLength(0)
    expect(insertsTo(admin, 'schedule_events')).toHaveLength(0)
  })

  it('still succeeds if the host/admin follow-up fails (e.g. migration not applied)', async () => {
    const { admin } = setup(
      {
        'cleaner_availability:one': { data: { date: FUTURE }, error: null },
        cleaner_availability: { data: [{ id: 's1', start_time: '09:00:00', end_time: '15:00:00' }], error: null },
        cleaner_weekly_availability: { data: [], error: null },
      },
      { bookings: { data: [pendingRow], error: null } },
    )
    admin.from = () => { throw new Error('relation does not exist') }
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(await deleteAvailability('s1')).toEqual({ success: true })
  })
})

describe('updateAvailability side effects', () => {
  const base = {
    'cleaner_availability:one': { data: { date: FUTURE, start_time: '09:00:00', end_time: '15:00:00' }, error: null },
    cleaner_availability: { data: [{ id: 's1', start_time: '09:00:00', end_time: '15:00:00' }], error: null },
    cleaner_weekly_availability: { data: [], error: null },
    bookings: { data: [], error: null },
  }

  it('shrinking past a pending request leaves it pending but notes the new times for the host, and flags admin', async () => {
    const { admin } = setup(base, { bookings: { data: [pendingRow], error: null } })
    const res = await updateAvailability('s1', '09:00', '12:00', '')
    expect(res).toEqual({ success: true })

    const upd = updatesTo(admin, 'bookings')[0] as Record<string, unknown>
    expect(upd).toMatchObject({ availability_notice: '09:00–12:00' })
    expect(upd).not.toHaveProperty('status')
    expect(insertsTo(admin, 'schedule_events')[0]).toMatchObject({ kind: 'slot_changed', affected_count: 1 })
  })

  it('a note-only edit never touches requests', async () => {
    const { admin } = setup(base, { bookings: { data: [pendingRow], error: null } })
    await updateAvailability('s1', '09:00', '15:00', 'new note')
    expect(updatesTo(admin, 'bookings')).toHaveLength(0)
    expect(insertsTo(admin, 'schedule_events')).toHaveLength(0)
  })

  it('extending a slot never notifies anyone', async () => {
    const { admin } = setup(base, { bookings: { data: [pendingRow], error: null } })
    await updateAvailability('s1', '08:00', '17:00', '')
    expect(updatesTo(admin, 'bookings')).toHaveLength(0)
  })

  it('refuses to edit a past day, bad times, and overlaps with another slot', async () => {
    setup({ ...base, 'cleaner_availability:one': { data: { date: '2000-01-01', start_time: '09:00:00', end_time: '15:00:00' }, error: null } }, {})
    expect(await updateAvailability('s1', '09:00', '12:00', '')).toEqual({ error: "Past days can't be edited." })

    setup(base, {})
    expect(await updateAvailability('s1', '12:00', '09:00', '')).toEqual({ error: 'End time must be after start time.' })

    setup({ ...base, cleaner_availability: { data: [{ id: 's1', start_time: '09:00:00', end_time: '15:00:00' }, { id: 's2', start_time: '16:00:00', end_time: '18:00:00' }], error: null } }, {})
    expect(await updateAvailability('s1', '09:00', '17:00', '')).toEqual({ error: 'This time overlaps availability you already added.' })
  })
})
