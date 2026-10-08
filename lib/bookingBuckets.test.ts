import { splitBookings, groupByMonth } from './bookingBuckets'
import type { BookingResult } from '@/lib/types/booking'

const b = (id: string, over: Partial<BookingResult>): BookingResult => ({
  id, cleaner_name: 'Maya Levi', cleaner_avatar_url: null, service_type: 'residential',
  scheduled_date: '2026-10-20', scheduled_start: '09:00', duration_hours: 3, address: 'x', status: 'accepted', ...over,
})
const today = '2026-10-10'

describe('splitBookings', () => {
  it('upcoming = confirmed from today on + pending, soonest first', () => {
    const r = splitBookings([
      b('late', { scheduled_date: '2026-10-25' }),
      b('pend', { status: 'pending', scheduled_date: '2026-10-12' }),
      b('today', { scheduled_date: today }),
    ], today)
    expect(r.upcoming.map((x) => x.id)).toEqual(['today', 'pend', 'late'])
  })

  it('history = completed, past confirmed, and confirmed-then-cancelled, newest first', () => {
    const r = splitBookings([
      b('done', { status: 'completed', scheduled_date: '2026-09-01' }),
      b('stale', { status: 'accepted', scheduled_date: '2026-10-01' }),
      b('cx', { status: 'cancelled', cancelled_from_status: 'accepted', scheduled_date: '2026-09-20' }),
    ], today)
    expect(r.history.map((x) => x.id)).toEqual(['stale', 'cx', 'done'])
    expect(r.upcoming).toHaveLength(0)
  })

  it('requests that never became a booking are "closed", and dismissed ones vanish', () => {
    const r = splitBookings([
      b('declined', { status: 'declined' }),
      b('withdrawn', { status: 'cancelled', cancelled_from_status: 'pending' }),
      b('legacy', { status: 'cancelled' }),
      b('dismissed', { status: 'declined', customer_ack_inactive: true }),
    ], today)
    expect(r.closed.map((x) => x.id).sort()).toEqual(['declined', 'legacy', 'withdrawn'])
    expect(r.history).toHaveLength(0)
  })
})

describe('groupByMonth', () => {
  it('groups consecutive bookings by month', () => {
    const groups = groupByMonth([
      b('1', { scheduled_date: '2026-10-05' }), b('2', { scheduled_date: '2026-10-01' }), b('3', { scheduled_date: '2026-09-28' }),
    ])
    expect(groups.map((g) => [g.month, g.items.length])).toEqual([['2026-10', 2], ['2026-09', 1]])
  })
})
