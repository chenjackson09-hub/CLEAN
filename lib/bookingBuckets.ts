import type { BookingResult } from '@/lib/types/booking'

// How the host's Bookings page sorts a flat list of bookings into what it shows:
//   upcoming — confirmed cleans from today on, and pending requests (in date order);
//   history  — completed cleans, confirmed cleans that were later cancelled, and
//              confirmed cleans whose day has passed (newest first);
//   closed   — requests that never became a booking (declined, expired, closed
//              automatically, withdrawn) — quiet, collapsed, dismissible.
// A cancelled booking counts as a "cancelled clean" only when it has the
// cancellation record saying it was confirmed first (migration 0036); older ones
// land in closed.
export type BookingBuckets = {
  upcoming: BookingResult[]
  history: BookingResult[]
  closed: BookingResult[]
}

const byDateAsc = (a: BookingResult, b: BookingResult) =>
  a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_start.localeCompare(b.scheduled_start)

export function isCancelledClean(b: BookingResult): boolean {
  return b.status === 'cancelled' && b.cancelled_from_status === 'accepted'
}

export function splitBookings(bookings: BookingResult[], todayStr: string): BookingBuckets {
  const upcoming: BookingResult[] = []
  const history: BookingResult[] = []
  const closed: BookingResult[] = []
  for (const b of bookings) {
    if (b.status === 'pending' || (b.status === 'accepted' && b.scheduled_date >= todayStr)) upcoming.push(b)
    else if (b.status === 'completed' || b.status === 'accepted' || isCancelledClean(b)) history.push(b)
    else if (!b.customer_ack_inactive) closed.push(b)
  }
  return {
    upcoming: upcoming.sort(byDateAsc),
    history: history.sort((a, b) => byDateAsc(b, a)),
    closed: closed.sort((a, b) => byDateAsc(b, a)).slice(0, 30),
  }
}

// History grouped by "YYYY-MM", newest month first, for the month headings.
export function groupByMonth(bookings: BookingResult[]): { month: string; items: BookingResult[] }[] {
  const groups: { month: string; items: BookingResult[] }[] = []
  for (const b of bookings) {
    const month = b.scheduled_date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.items.push(b)
    else groups.push({ month, items: [b] })
  }
  return groups
}
