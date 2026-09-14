// Pure date-string math (no Date.now()) so relative-day labels can never
// hydrate-mismatch — both dates are plain YYYY-MM-DD strings, computed once
// server-side and passed down as props/precomputed fields.
export function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split('-').map(Number)
  const [ty, tm, td] = toStr.split('-').map(Number)
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000)
}
