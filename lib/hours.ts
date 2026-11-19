// Job lengths are stored in hours (numeric(4,2)) but chosen in whole minutes: any 5-minute step,
// never below 20 minutes. 20 min is stored as 0.33 h, so everything that reads a stored value
// goes through whole minutes (Math.round(hours * 60)) and the 2-decimal rounding never shows.
export const MIN_JOB_MINUTES = 20
export const JOB_MINUTE_STEP = 5

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}
export const MIN_JOB_HOURS = minutesToHours(MIN_JOB_MINUTES) // 0.33

// A valid job length: a whole number of 5-minute steps, at least 20 minutes (tolerating the
// 2-decimal rounding of values like 0.33 h = 19.8 min).
export function isJobLengthHours(n: number): boolean {
  if (!Number.isFinite(n)) return false
  const minutes = n * 60
  const nearest = Math.round(minutes / JOB_MINUTE_STEP) * JOB_MINUTE_STEP
  return nearest >= MIN_JOB_MINUTES && Math.abs(minutes - nearest) <= 0.5
}

// One click of a "+" / "−" button: 5 minutes at a time below an hour (20, 25 … 55 min), then
// 15 minutes at a time (1 h, 1 h 15 …) so a long job isn't dozens of clicks. Every minute
// value in between can still be typed on the profile form.
export function stepHours(hours: number, dir: 1 | -1): number {
  const m = hoursToMinutes(hours)
  const next =
    dir > 0
      ? m < 60 ? m + JOB_MINUTE_STEP : (Math.floor(m / 15) + 1) * 15
      : m <= 60 ? m - JOB_MINUTE_STEP : (Math.ceil(m / 15) - 1) * 15
  return minutesToHours(next)
}

// 0.33 -> "20 min", 0.5 -> "30 min", 3 -> "3 h", 3.25 -> "3 h 15 min"
// (Hebrew: "20 דק׳", "3 ש׳", "3 ש׳ 15 דק׳").
export function formatHours(n: number, lang: 'en' | 'he' = 'en'): string {
  const total = hoursToMinutes(n)
  const h = Math.floor(total / 60)
  const m = total % 60
  const [H, M] = lang === 'he' ? ['ש׳', 'דק׳'] : ['h', 'min']
  if (h === 0) return `${m} ${M}`
  if (m === 0) return `${h} ${H}`
  return `${h} ${H} ${m} ${M}`
}
