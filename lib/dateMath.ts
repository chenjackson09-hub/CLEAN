// Pure date-string math (no Date.now()) so relative-day labels can never
// hydrate-mismatch — both dates are plain YYYY-MM-DD strings, computed once
// server-side and passed down as props/precomputed fields.
export function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split('-').map(Number)
  const [ty, tm, td] = toStr.split('-').map(Number)
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000)
}

// 0 = Sunday … 6 = Saturday, from a plain YYYY-MM-DD string.
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

// Whether two YYYY-MM-DD dates fall in the same calendar week (weeks run
// Sunday–Saturday, as in Israel) — drives "show the weekday only when it's this
// week" on the home screens.
export function isSameWeek(aStr: string, bStr: string): boolean {
  const startOfWeek = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d - weekdayOf(s)).getTime()
  }
  return startOfWeek(aStr) === startOfWeek(bStr)
}
