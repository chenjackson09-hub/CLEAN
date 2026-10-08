import { closedReasonFor, bookedHours, buildDayModel, openFrameDates, type HostBooking } from './hostCalendar'

const bk = (over: Partial<HostBooking>): HostBooking => ({
  id: 'b', date: '2026-10-15', start: '09:00', durationHours: 4, status: 'pending', cleanerId: 'c1', cleanerName: 'Noa R.',
  groupId: null, slotStart: null, slotEnd: null, ...over,
})

describe('buildDayModel', () => {
  const avail = { '2026-10-15': [{ id: 'c1', slots: [{ start: '09:00', end: '15:00' }] }, { id: 'c2', slots: [{ start: '08:00', end: '12:00' }] }] }

  it('splits a day into booked, requested and closed, and offers only cleaners not already asked', () => {
    const day = buildDayModel('2026-10-15', [
      bk({ id: 'a', status: 'accepted', cleanerId: 'c1' }),
      bk({ id: 'p', status: 'pending', cleanerId: 'c3' }),
      bk({ id: 'x', status: 'cancelled', cleanerId: 'c4' }),
      bk({ id: 'other', date: '2026-10-16' }),
    ], avail)
    expect(day.booked.map((b) => b.id)).toEqual(['a'])
    expect(day.requested.map((b) => b.id)).toEqual(['p'])
    expect(day.closed.map((b) => b.id)).toEqual(['x'])
    expect(day.free.map((e) => e.id)).toEqual(['c2']) // c1 is already booked that day
  })

  it('a cleaner whose earlier request was closed can be asked again', () => {
    const day = buildDayModel('2026-10-15', [bk({ status: 'declined', cleanerId: 'c1' })], avail)
    expect(day.free.map((e) => e.id)).toEqual(['c1', 'c2'])
  })

  it('an empty day has nothing', () => {
    expect(buildDayModel('2026-11-01', [], avail)).toEqual({ booked: [], requested: [], closed: [], free: [] })
  })
})

describe('bookedHours', () => {
  it("shows the cleaner's whole block like their own calendar", () => {
    expect(bookedHours(bk({ slotStart: '09:00:00', slotEnd: '15:00:00' }))).toBe('9-15')
  })
  it('falls back to the start time, never an invented end', () => {
    expect(bookedHours(bk({ start: '09:00' }))).toBe('09:00')
  })
})

describe('openFrameDates', () => {
  it('outlines the days of a still-pending multi-day frame, and only those', () => {
    const dates = openFrameDates([
      bk({ id: '1', date: '2026-10-12', groupId: 'g' }),
      bk({ id: '2', date: '2026-10-16', groupId: 'g' }),
      bk({ id: '3', date: '2026-10-20', groupId: 'solo' }), // one day isn't a frame
      bk({ id: '4', date: '2026-10-21', groupId: 'g', status: 'cancelled' }),
    ])
    expect(Array.from(dates).sort()).toEqual(['2026-10-12', '2026-10-16'])
  })
})

describe('closedReasonFor', () => {
  it('tells apart why a request is closed', () => {
    expect(closedReasonFor({ status: 'pending' })).toBeNull()
    expect(closedReasonFor({ status: 'pending', pendingExpired: true })).toBe('expired')
    expect(closedReasonFor({ status: 'declined', respondedAt: '2026-10-05T10:00:00Z', responseDeadline: '2026-10-06T10:00:00Z' })).toBe('declined')
    expect(closedReasonFor({ status: 'declined', respondedAt: '2026-10-06T12:00:00Z', responseDeadline: '2026-10-06T10:00:00Z' })).toBe('expired')
    expect(closedReasonFor({ status: 'cancelled', cancelledBy: 'host' })).toBe('you_cancelled')
    expect(closedReasonFor({ status: 'cancelled', cancelledBy: 'cleaner' })).toBe('cleaner_cancelled')
    expect(closedReasonFor({ status: 'cancelled', statusReason: 'cleaner_unavailable' })).toBe('cleaner_unavailable')
    // closed by the app when another request was accepted: a response time, no "cancelled by"
    expect(closedReasonFor({ status: 'cancelled', respondedAt: '2026-10-05T19:21:39Z' })).toBe('other_accepted')
    // an older host cancel (before 0036): no response time
    expect(closedReasonFor({ status: 'cancelled' })).toBe('you_cancelled')
  })
})
