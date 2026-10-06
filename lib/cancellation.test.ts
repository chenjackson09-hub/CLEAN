import { cancelBookingCore, sanitizeCancelInput, minutesBeforeStart, describeLead } from './cancellation'
import { subtractRanges } from './availability'

// A small in-memory stand-in for the parts of supabase-js the cancellation uses,
// so the real business rules run end to end (status guard, availability, dedupe).
type Row = Record<string, unknown>
function memoryDb(seed: Record<string, Row[]>, opts: { missingColumns?: boolean } = {}) {
  const tables: Record<string, Row[]> = JSON.parse(JSON.stringify(seed))
  let idc = 0
  const META = ['cancelled_by', 'cancelled_at', 'cancellation_reason', 'cancellation_message', 'cancelled_from_status']
  function from(name: string) {
    const rows = (tables[name] ??= [])
    let mode: 'select' | 'update' | 'delete' | 'insert' = 'select'
    let patch: Row = {}
    const filters: ((r: Row) => boolean)[] = []
    let wantRows = false
    const matched = () => rows.filter((r) => filters.every((f) => f(r)))
    const run = (single = false) => {
      if (mode === 'update') {
        if (opts.missingColumns && name === 'bookings' && META.some((k) => k in patch)) {
          return { data: null, error: { message: "Could not find the 'cancelled_by' column of 'bookings' in the schema cache" } }
        }
        const hit = matched()
        hit.forEach((r) => Object.assign(r, patch))
        return { data: wantRows ? hit.map((r) => ({ id: r.id })) : null, error: null }
      }
      if (mode === 'delete') {
        const hit = new Set(matched())
        tables[name] = rows.filter((r) => !hit.has(r))
        rows.length = 0
        rows.push(...tables[name])
        return { data: null, error: null }
      }
      const data = matched()
      return single ? { data: data[0] ?? null, error: null } : { data, error: null }
    }
    const api: Record<string, unknown> = {
      select: () => { if (mode === 'update') wantRows = true; return api },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api },
      neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return api },
      in: (c: string, v: unknown[]) => { filters.push((r) => v.includes(r[c])); return api },
      is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return api },
      update: (p: Row) => { mode = 'update'; patch = p; return api },
      delete: () => { mode = 'delete'; return api },
      insert: (p: Row | Row[]) => { (Array.isArray(p) ? p : [p]).forEach((r) => rows.push({ id: `n${++idc}`, ...r })); return Promise.resolve({ error: null }) },
      upsert: (p: Row[]) => {
        for (const r of p) {
          const dup = r.dedupe_key && rows.some((x) => x.user_id === r.user_id && x.dedupe_key === r.dedupe_key)
          if (!dup) rows.push({ id: `n${++idc}`, ...r })
        }
        return Promise.resolve({ error: null })
      },
      maybeSingle: () => Promise.resolve(run(true)),
      single: () => Promise.resolve(run(true)),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    }
    return api
  }
  return { tables, from }
}

const base = {
  id: 'b1', customer_id: 'host', cleaner_id: 'cleaner', status: 'accepted',
  scheduled_date: '2099-01-10', scheduled_start: '10:00:00', duration_hours: 3, slot_start: '08:00:00', slot_end: '16:00:00',
}
const people = [
  { id: 'host', full_name: 'Chen Jackson' },
  { id: 'cleaner', full_name: 'Maya Levi' },
]
const run = (db: ReturnType<typeof memoryDb>, actorId: string, bookingId = 'b1', input?: Parameters<typeof cancelBookingCore>[1]['input']) =>
  cancelBookingCore(db as never, { bookingId, actorId, input })

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => jest.restoreAllMocks())

describe('host cancels a confirmed cleaning', () => {
  it('keeps the booking, records who/when/why, restores the original slot and tells the cleaner', async () => {
    const db = memoryDb({ bookings: [base], profiles: people, cleaner_availability: [], notifications: [] })
    const res = await run(db, 'host', 'b1', { reason: 'plans_changed', message: '  Sorry!  ' })
    expect(res).toMatchObject({ ok: true, role: 'host', wasConfirmed: true })

    expect(db.tables.bookings).toHaveLength(1) // never deleted
    expect(db.tables.bookings[0]).toMatchObject({
      status: 'cancelled', cancelled_by: 'host', cancellation_reason: 'plans_changed', cancellation_message: 'Sorry!', cancelled_from_status: 'accepted',
    })
    expect(typeof db.tables.bookings[0].cancelled_at).toBe('string')

    // exactly the slot the cleaner originally marked — no more, no less
    expect(db.tables.cleaner_availability).toEqual([expect.objectContaining({ cleaner_id: 'cleaner', date: '2099-01-10', start_time: '08:00', end_time: '16:00' })])

    expect(db.tables.notifications).toEqual([
      expect.objectContaining({ user_id: 'cleaner', kind: 'booking_cancelled_by_host', booking_id: 'b1', href: '/cleaner/chat/host' }),
    ])
  })

  it('does not invent availability beyond what the cleaner marked (window-only legacy booking)', async () => {
    const db = memoryDb({ bookings: [{ ...base, slot_start: null, slot_end: null }], profiles: people, cleaner_availability: [], notifications: [] })
    await run(db, 'host')
    expect(db.tables.cleaner_availability).toEqual([expect.objectContaining({ start_time: '10:00', end_time: '13:00' })])
  })
})

describe('cleaner cancels a confirmed cleaning', () => {
  it('notifies the host (pointing at the chat, where Find another cleaner lives) and releases the time', async () => {
    const db = memoryDb({ bookings: [base], profiles: people, cleaner_availability: [], notifications: [] })
    const res = await run(db, 'cleaner', 'b1', { reason: 'unexpected' })
    expect(res).toMatchObject({ ok: true, role: 'cleaner' })
    expect(db.tables.bookings[0]).toMatchObject({ status: 'cancelled', cancelled_by: 'cleaner', cleaner_ack_cancelled: true })
    expect(db.tables.cleaner_availability).toHaveLength(1)
    expect(db.tables.notifications).toEqual([
      expect.objectContaining({ user_id: 'host', kind: 'booking_cancelled_by_cleaner', href: '/chat/cleaner', data: expect.objectContaining({ name: 'Maya L.' }) }),
    ])
  })

  it('cannot cancel a pending request (that is a decline)', async () => {
    const db = memoryDb({ bookings: [{ ...base, status: 'pending' }], profiles: people, cleaner_availability: [], notifications: [] })
    expect(await run(db, 'cleaner')).toMatchObject({ ok: false, code: 'not_cancellable' })
    expect(db.tables.bookings[0].status).toBe('pending')
  })
})

describe('a host withdrawing a pending request', () => {
  it('cancels it without touching availability', async () => {
    const db = memoryDb({ bookings: [{ ...base, status: 'pending' }], profiles: people, cleaner_availability: [], notifications: [] })
    const res = await run(db, 'host')
    expect(res).toMatchObject({ ok: true, wasConfirmed: false })
    expect(db.tables.cleaner_availability).toHaveLength(0)
    expect(db.tables.bookings[0]).toMatchObject({ status: 'cancelled', cancelled_from_status: 'pending' })
    expect(db.tables.notifications[0]).toMatchObject({ kind: 'request_cancelled_by_host', href: '/cleaner/requests' })
  })
})

describe('duplicate, stale and forbidden cancellations', () => {
  it('a second cancel does nothing: one notification, availability unchanged', async () => {
    const db = memoryDb({ bookings: [base], profiles: people, cleaner_availability: [], notifications: [] })
    await run(db, 'host')
    const again = await run(db, 'host')
    expect(again).toMatchObject({ ok: false, code: 'already_cancelled' })
    expect(db.tables.notifications).toHaveLength(1)
    expect(db.tables.cleaner_availability).toHaveLength(1)
  })

  it('two simultaneous cancels: only one wins and runs the follow-ups', async () => {
    const db = memoryDb({ bookings: [base], profiles: people, cleaner_availability: [], notifications: [] })
    const [a, b] = await Promise.all([run(db, 'host'), run(db, 'cleaner')])
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1)
    expect(db.tables.notifications).toHaveLength(1)
    expect(db.tables.cleaner_availability).toHaveLength(1)
  })

  it('a stale screen cancelling after the other person already did gets "already cancelled"', async () => {
    const db = memoryDb({ bookings: [{ ...base, status: 'cancelled', cancelled_by: 'cleaner' }], profiles: people, cleaner_availability: [], notifications: [] })
    expect(await run(db, 'host')).toMatchObject({ ok: false, code: 'already_cancelled' })
    expect(db.tables.notifications).toHaveLength(0)
    expect(db.tables.cleaner_availability).toHaveLength(0)
  })

  it('never cancels a completed (or declined) booking', async () => {
    for (const status of ['completed', 'declined']) {
      const db = memoryDb({ bookings: [{ ...base, status }], profiles: people, cleaner_availability: [], notifications: [] })
      expect(await run(db, 'host')).toMatchObject({ ok: false, code: 'not_cancellable' })
      expect(db.tables.bookings[0].status).toBe(status)
    }
  })

  it('refuses anyone who is not part of the booking, and does not reveal the booking exists', async () => {
    const db = memoryDb({ bookings: [base], profiles: people, cleaner_availability: [], notifications: [] })
    expect(await run(db, 'stranger')).toMatchObject({ ok: false, code: 'not_found' })
    expect(await run(db, 'host', 'does-not-exist')).toMatchObject({ ok: false, code: 'not_found' })
    expect(db.tables.bookings[0].status).toBe('accepted')
  })
})

describe('other bookings stay untouched', () => {
  it('only the cancelled booking changes; another confirmed booking the same day keeps its time', async () => {
    const other = { ...base, id: 'b2', scheduled_start: '14:00:00', duration_hours: 2, slot_start: '14:00:00', slot_end: '16:00:00', customer_id: 'host2' }
    const db = memoryDb({ bookings: [{ ...base, slot_start: '08:00:00', slot_end: '16:00:00' }, other], profiles: people, cleaner_availability: [], notifications: [] })
    await run(db, 'host')
    expect(db.tables.bookings.find((b) => b.id === 'b2')).toMatchObject({ status: 'accepted' })
    // the released time stops where the other booking begins (14:00)
    expect(db.tables.cleaner_availability).toEqual([expect.objectContaining({ start_time: '08:00', end_time: '14:00' })])
  })
})

describe('when the cancellation columns are not there yet (migration 0036 not applied)', () => {
  it('still cancels, with the status alone', async () => {
    const db = memoryDb({ bookings: [base], profiles: people, cleaner_availability: [], notifications: [] }, { missingColumns: true })
    expect(await run(db, 'host')).toMatchObject({ ok: true })
    expect(db.tables.bookings[0].status).toBe('cancelled')
    expect(db.tables.cleaner_availability).toHaveLength(1)
  })
})

describe('helpers', () => {
  it('drops unknown reasons and trims/caps the message', () => {
    expect(sanitizeCancelInput({ reason: 'because', message: '   ' })).toEqual({ reason: null, message: null })
    expect(sanitizeCancelInput({ reason: 'other', message: 'x'.repeat(900) }).message).toHaveLength(500)
  })

  it('subtracts booked ranges from a slot', () => {
    expect(subtractRanges([480, 960], [[600, 780]])).toEqual([[480, 600], [780, 960]])
    expect(subtractRanges([480, 960], [[400, 1000]])).toEqual([])
    expect(subtractRanges([480, 960], [])).toEqual([[480, 960]])
  })

  it('works out how long before the clean a cancellation happened (Israel time)', () => {
    // 10:00 Israel (UTC+2 in January) = 08:00Z
    expect(minutesBeforeStart('2026-01-13', '10:00:00', '2026-01-10T08:00:00Z')).toBe(3 * 1440)
    expect(minutesBeforeStart('2026-01-13', '10:00:00', '2026-01-13T07:40:00Z')).toBe(20)
    expect(describeLead(3 * 1440)).toBe('3 days before')
    expect(describeLead(20)).toBe('20 min before')
    expect(describeLead(-5)).toBe('after it started')
  })
})
