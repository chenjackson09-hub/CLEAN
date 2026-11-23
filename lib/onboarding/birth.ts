// Checks the three birth-date selects as the person fills them in. The server runs the same
// rule again (birthdateFromParts), so this only decides what to say on screen.
// Everyone on Clean (hosts and cleaners) must be at least this old, as the Terms of Use say.
export const MIN_AGE = 18

export type BirthProblem = 'incomplete' | 'invalid' | 'tooYoung' | null

export function birthProblem(d: string, m: string, y: string, now: Date = new Date()): BirthProblem {
  if (!d || !m || !y) return 'incomplete'
  const day = Number(d), month = Number(m), year = Number(y)
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day || year < 1920) return 'invalid'
  return ageFromParts(d, m, y, now)! < MIN_AGE ? 'tooYoung' : null
}

export function ageFromParts(d: string, m: string, y: string, now: Date = new Date()): number | null {
  if (!d || !m || !y) return null
  const birth = new Date(Number(y), Number(m) - 1, Number(d))
  let age = now.getFullYear() - birth.getFullYear()
  const md = now.getMonth() - birth.getMonth()
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--
  return age
}
