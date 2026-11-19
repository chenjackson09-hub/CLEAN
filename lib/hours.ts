// Job lengths are kept in hours but chosen in quarter-hour steps (15 min), never below 30 min.
export const MIN_JOB_HOURS = 0.5
export const HOURS_STEP = 0.25

export function isQuarterHour(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n * 4 - Math.round(n * 4)) < 1e-9
}

// 0.5 -> "30 min", 3 -> "3 h", 3.25 -> "3 h 15 min" (Hebrew: "30 דק׳", "3 ש׳", "3 ש׳ 15 דק׳").
export function formatHours(n: number, lang: 'en' | 'he' = 'en'): string {
  const total = Math.round(n * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  const [H, M] = lang === 'he' ? ['ש׳', 'דק׳'] : ['h', 'min']
  if (h === 0) return `${m} ${M}`
  if (m === 0) return `${h} ${H}`
  return `${h} ${H} ${m} ${M}`
}
