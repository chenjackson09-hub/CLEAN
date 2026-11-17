import { runHousekeeping } from './housekeeping'
import { sweepExpiredRequests } from './expireRequests'

const mockNotify = jest.fn()
const mockNotifyNew = jest.fn()
jest.mock('./notifications', () => ({
  notify: (...a: unknown[]) => mockNotify(...a),
  notifyNew: (...a: unknown[]) => mockNotifyNew(...a),
  profileNames: async () => new Map([['h1', 'Dana Levi'], ['c1', 'Noa Regev']]),
}))
const mockAnswered = jest.fn()
const mockTomorrow = jest.fn()
const mockExpiring = jest.fn()
jest.mock('./appEmails', () => ({
  emailRequestAnswered: (...a: unknown[]) => mockAnswered(...a),
  emailCleanTomorrow: (...a: unknown[]) => mockTomorrow(...a),
  emailRequestExpiring: (...a: unknown[]) => mockExpiring(...a),
}))
jest.mock('./supabase/admin', () => ({ createAdminClient: jest.fn() }))

type Row = { id: string; customer_id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string }
const row = (id: string): Row => ({ id, customer_id: 'h1', cleaner_id: 'c1', scheduled_date: '2026-10-15', scheduled_start: '09:00:00' })

// A tiny stand-in for the database: `selects` answers the three list queries in the order the
// job asks them (expired, expiring, tomorrow); `wins` says which guarded updates succeed.
function fakeAdmin(selects: Row[][], wins: string[] = []) {
  let call = 0
  const updated: string[] = []
  return {
    updated,
    from: () => {
      const q: Record<string, unknown> = {}
      let mode: 'select' | 'update' = 'select'
      let id = ''
      q.select = () => q
      q.update = () => { mode = 'update'; return q }
      q.eq = (col: string, val: string) => { if (col === 'id') id = val; return q }
      q.lt = () => q
      q.gt = () => q
      q.then = (resolve: (v: unknown) => void) => {
        if (mode === 'update') {
          updated.push(id)
          resolve({ data: wins.includes(id) ? [{ id }] : [] })
        } else {
          resolve({ data: selects[call++] ?? [] })
        }
      }
      return q
    },
  }
}

beforeEach(() => { jest.clearAllMocks(); mockNotifyNew.mockResolvedValue(true) })

describe('sweepExpiredRequests', () => {
  it('tells the host only about the requests THIS sweep closed', async () => {
    const admin = fakeAdmin([[row('b1'), row('b2')]], ['b1'])
    await expect(sweepExpiredRequests(admin as never)).resolves.toBe(1)
    expect(admin.updated).toEqual(['b1', 'b2'])
    expect(mockNotify.mock.calls[0][1]).toHaveLength(1)
    expect(mockNotify.mock.calls[0][1][0]).toMatchObject({ userId: 'h1', kind: 'request_expired', bookingId: 'b1', once: true })
    expect(mockAnswered).toHaveBeenCalledTimes(1)
    expect(mockAnswered.mock.calls[0][1]).toMatchObject({ kind: 'expired', bookingId: 'b1', hostId: 'h1', cleanerId: 'c1' })
  })

  it('does nothing when no request has lapsed', async () => {
    await expect(sweepExpiredRequests(fakeAdmin([[]]) as never)).resolves.toBe(0)
    expect(mockNotify).not.toHaveBeenCalled()
    expect(mockAnswered).not.toHaveBeenCalled()
  })
})

describe('runHousekeeping', () => {
  it('warns the cleaner about a closing request and reminds both sides of tomorrow, with emails', async () => {
    const admin = fakeAdmin([[], [row('b3')], [row('b4')]])
    await expect(runHousekeeping(admin as never)).resolves.toEqual({ expired: 0, expiringWarned: 1, tomorrowReminded: 2 })
    expect(mockNotifyNew.mock.calls[0][1]).toMatchObject({ userId: 'c1', kind: 'request_expiring', bookingId: 'b3' })
    expect(mockExpiring).toHaveBeenCalledTimes(1)
    expect(mockTomorrow.mock.calls.map((c) => c[1].recipientRole)).toEqual(['host', 'cleaner'])
    // a host sees the cleaner as "First L."
    expect(mockNotifyNew.mock.calls[1][1].data.name).toBe('Noa R.')
  })

  it('sends no email when the bell entry already existed (someone was told before)', async () => {
    mockNotifyNew.mockResolvedValue(false)
    const admin = fakeAdmin([[], [row('b3')], [row('b4')]])
    await expect(runHousekeeping(admin as never)).resolves.toEqual({ expired: 0, expiringWarned: 0, tomorrowReminded: 0 })
    expect(mockExpiring).not.toHaveBeenCalled()
    expect(mockTomorrow).not.toHaveBeenCalled()
  })

  it('keeps going when one part fails', async () => {
    const admin = { from: () => { throw new Error('boom') } }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(runHousekeeping(admin as never)).resolves.toEqual({ expired: 0, expiringWarned: 0, tomorrowReminded: 0 })
    spy.mockRestore()
  })
})
