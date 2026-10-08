// Pure model behind the host's schedule calendar: what each day looks like
// (booked / requested / cleaners free), built from the host's own bookings and
// the per-day cleaner availability the page computed.

export type HostBookingStatus = 'pending' | 'accepted' | 'completed' | 'declined' | 'cancelled'

export type ClosedReason =
  | 'declined' // the cleaner said no
  | 'expired' // no answer within 24 hours
  | 'you_cancelled' // the host cancelled / withdrew it
  | 'cleaner_cancelled' // the cleaner cancelled a confirmed clean
  | 'cleaner_unavailable' // the cleaner removed the time it relied on
  | 'other_accepted' // closed automatically when another request was accepted

export type HostBooking = {
  id: string
  date: string // YYYY-MM-DD
  start: string // HH:MM
  durationHours: number
  status: HostBookingStatus
  cleanerId: string
  cleanerName: string
  // The flexible-days frame this request belongs to (bookings.clean_group_id).
  groupId: string | null
  // The cleaner's whole availability slot this booking consumed (migration 0035);
  // null for bookings accepted before that.
  slotStart: string | null
  slotEnd: string | null
  // Why a declined/cancelled request is closed (null while it's live).
  closedReason?: ClosedReason | null
}

export type DayAvailEntry = { id: string; slots: { start: string; end: string }[] }

export type DayModel = {
  booked: HostBooking[]
  requested: HostBooking[]
  closed: HostBooking[]
  free: DayAvailEntry[]
}

export function buildDayModel(date: string, bookings: HostBooking[], dayAvail: Record<string, DayAvailEntry[]>): DayModel {
  const mine = bookings.filter((b) => b.date === date)
  const booked = mine.filter((b) => b.status === 'accepted' || b.status === 'completed')
  const requested = mine.filter((b) => b.status === 'pending')
  const closed = mine.filter((b) => b.status === 'declined' || b.status === 'cancelled')
  // A cleaner you've already asked (or booked) for this day isn't offered again.
  const taken = new Set([...booked, ...requested].map((b) => b.cleanerId))
  const free = (dayAvail[date] ?? []).filter((e) => !taken.has(e.id))
  return { booked, requested, closed, free }
}

// "9-15" — the cleaner's whole block, like the cleaner's own calendar — or just
// the start time ("09:00") for a booking accepted before blocks were recorded
// (a booking only has a start and an *estimated* length, never a firm end).
export function bookedHours(b: HostBooking): string {
  if (b.slotStart && b.slotEnd) return `${parseInt(b.slotStart.slice(0, 2), 10)}-${parseInt(b.slotEnd.slice(0, 2), 10)}`
  return b.start.slice(0, 5)
}

// Dates that belong to a still-open flexible window: days of a frame (a group of
// 2+ days) that has live requests, so the outline survives a reload.
export function openFrameDates(bookings: HostBooking[]): Set<string> {
  const byGroup = new Map<string, HostBooking[]>()
  for (const b of bookings) {
    if (!b.groupId || b.status !== 'pending') continue
    byGroup.set(b.groupId, [...(byGroup.get(b.groupId) ?? []), b])
  }
  const out = new Set<string>()
  Array.from(byGroup.values()).forEach((group) => {
    const dates = new Set(group.map((b) => b.date))
    if (dates.size >= 2) dates.forEach((d) => out.add(d))
  })
  return out
}

// A cancelled booking being re-requested ("Find another cleaner"): the same
// request, reopened on its day, with its details carried over and the cleaner
// who cancelled left out of the choices.
export type RebookInfo = {
  bookingId: string
  date: string
  cleanerId: string
  cleanerName: string
  address: string | null
  duration: number
  prefill: {
    startTime: string
    notes: string
    cleaningType?: 'regular' | 'deep'
    extras: string[]
    petsPresent: boolean | null
    hostPresent: boolean | null
  }
}

// Why a request is closed, from what the booking row records. Requests closed by
// the app itself (another request was accepted) are the ones with a response time
// but no "cancelled by" record; a lapse is a "decline" the cleaner never made
// (responded after the deadline).
export function closedReasonFor(b: {
  status: string
  pendingExpired?: boolean
  respondedAt?: string | null
  responseDeadline?: string | null
  cancelledBy?: 'host' | 'cleaner' | null
  statusReason?: string | null
}): ClosedReason | null {
  if (b.status === 'pending' && b.pendingExpired) return 'expired'
  if (b.status === 'declined') {
    const lapsed = b.respondedAt && b.responseDeadline && new Date(b.respondedAt) >= new Date(b.responseDeadline)
    return lapsed ? 'expired' : 'declined'
  }
  if (b.status !== 'cancelled') return null
  if (b.statusReason === 'cleaner_unavailable') return 'cleaner_unavailable'
  if (b.cancelledBy === 'host') return 'you_cancelled'
  if (b.cancelledBy === 'cleaner') return 'cleaner_cancelled'
  return b.respondedAt ? 'other_accepted' : 'you_cancelled'
}
