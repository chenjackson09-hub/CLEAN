// Pure helpers for "which pending requests does this availability change
// break?" — shared by the server actions (to notify the host / flag admin) and
// the calendar (to warn the cleaner before they delete or shrink a slot).

export type SlotLike = { start_time: string; end_time: string }
export type RequestLike = { id: string; scheduled_start: string; duration_hours: number }

export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}

// Same rule respondToBooking uses to accept: one slot has to fully contain the
// requested start..start+duration window.
export function isCovered(req: RequestLike, slots: SlotLike[]): boolean {
  const start = minutesOf(req.scheduled_start)
  const end = start + req.duration_hours * 60
  return slots.some((s) => minutesOf(s.start_time) <= start && minutesOf(s.end_time) >= end)
}

// Requests that the `before` availability covered but the `after` one doesn't
// — i.e. broken by this change. Requests that were never covered aren't
// "affected": the change didn't cause their problem.
export function findAffectedRequests<T extends RequestLike>(
  pending: T[],
  before: SlotLike[],
  after: SlotLike[],
): T[] {
  return pending.filter((p) => isCovered(p, before) && !isCovered(p, after))
}

// "10:00–13:00, 15:00–17:00" — the times a host is told about.
export function formatSlotTimes(slots: SlotLike[]): string {
  return [...slots]
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((s) => `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`)
    .join(', ')
}
