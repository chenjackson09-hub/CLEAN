// Shared shape + URL (de)serialization for the "Add a clean" host-schedule
// feature. A "clean" is a candidate-days group: multiple dates tagged with the
// same clean_group_id/color, any one of which becomes the actual booking once
// a cleaner accepts it (see respondToBooking's scoped sibling-cancel). This
// mirrors the same days-in-a-set idea migration 0031 already models on
// `bookings`, just held client-side (in the URL, per the rest of /browse's
// state pattern) until a specific day/cleaner pair is actually requested.
export type CleanGroup = { id: string; color: string; dates: string[] }

// Clean 1 never makes the host pick a color — it just uses the same blue
// /browse already used for a plain selected day, so the very first tap needs
// no extra step. Only a second (or later) clean prompts an explicit color.
export const DEFAULT_CLEAN_COLOR = '#2563EB'

export function parseCleans(raw: string | undefined | null): CleanGroup[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((g): g is { id: unknown; color: unknown; dates: unknown } => !!g && typeof g === 'object')
      .filter(g => typeof g.id === 'string' && Array.isArray(g.dates))
      .map(g => ({
        id: g.id as string,
        color: typeof g.color === 'string' ? g.color : DEFAULT_CLEAN_COLOR,
        dates: (g.dates as unknown[]).filter((d): d is string => typeof d === 'string'),
      }))
  } catch {
    return []
  }
}

export function serializeCleans(cleans: CleanGroup[]): string {
  return JSON.stringify(cleans)
}

export function allCleanDates(cleans: CleanGroup[]): string[] {
  return Array.from(new Set(cleans.flatMap(g => g.dates))).sort()
}

export function findOwningClean(cleans: CleanGroup[], date: string): CleanGroup | undefined {
  return cleans.find(g => g.dates.includes(date))
}

// Resolves which focused date to actually show: the URL's `focus` param when
// it's still a live marked day, else the earliest marked date, else none.
export function resolveFocusedDate(cleans: CleanGroup[], focusParam: string | undefined | null): string | null {
  const all = allCleanDates(cleans)
  if (focusParam && all.includes(focusParam)) return focusParam
  return all[0] ?? null
}
