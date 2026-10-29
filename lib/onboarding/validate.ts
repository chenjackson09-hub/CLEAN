// Small, strict helpers shared by the onboarding checks. Everything a wizard sends is
// untrusted text, so each value is trimmed, length-limited and range-checked here.

export class DraftError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export const str = (v: unknown, field: string, max: number): string => {
  if (v == null) return ''
  if (typeof v !== 'string') throw new DraftError(`${field} must be text`)
  const t = v.trim()
  if (t.length > max) throw new DraftError(`${field} is too long`)
  return t
}

export const bool = (v: unknown, field: string): boolean => {
  if (v == null) return false
  if (typeof v !== 'boolean') throw new DraftError(`${field} must be yes or no`)
  return v
}

// "" stays "" (not answered); otherwise a number within [min, max].
export const numText = (v: unknown, field: string, min: number, max: number): string => {
  if (v == null || v === '') return ''
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN
  if (!Number.isFinite(n)) throw new DraftError(`${field} must be a number`)
  if (n < min || n > max) throw new DraftError(`${field} must be between ${min} and ${max}`)
  return String(n)
}

export const oneOf = <T extends string>(v: unknown, field: string, allowed: readonly T[]): T | null => {
  if (v == null || v === '') return null
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw new DraftError(`${field} is not a valid choice`)
  return v as T
}

export const listOf = <T extends string>(v: unknown, field: string, allowed: readonly T[], maxItems = 30): T[] => {
  if (v == null) return []
  if (!Array.isArray(v)) throw new DraftError(`${field} must be a list`)
  if (v.length > maxItems) throw new DraftError(`${field} has too many choices`)
  const out: T[] = []
  for (const item of v) {
    if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item)) throw new DraftError(`${field} has an invalid choice`)
    if (!out.includes(item as T)) out.push(item as T)
  }
  return out
}

export const uuidOrNull = (v: unknown, field: string): string | null => {
  if (v == null || v === '') return null
  if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new DraftError(`${field} is not valid`)
  return v
}

// A photo URL is only accepted if it points at THIS person's own folder in our storage.
export const ownPhotoUrl = (v: unknown, field: string, userId: string, supabaseUrl: string): string | null => {
  if (v == null || v === '') return null
  if (typeof v !== 'string') throw new DraftError(`${field} is not valid`)
  const prefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/avatars/${userId}/`
  if (!v.startsWith(prefix) || v.length > 500) throw new DraftError(`${field} is not valid`)
  return v
}

// A real calendar date for someone born between 1920 and 14 years ago.
export function birthdateFromParts(d: string, m: string, y: string, now: Date = new Date()): string | null {
  if (!d && !m && !y) return null
  const day = Number(d), month = Number(m), year = Number(y)
  if (![day, month, year].every(Number.isInteger)) throw new DraftError('Birth date is not valid')
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) throw new DraftError('Birth date is not valid')
  if (year < 1920) throw new DraftError('Birth date is not valid')
  const youngest = new Date(Date.UTC(now.getUTCFullYear() - 14, now.getUTCMonth(), now.getUTCDate()))
  if (dt > youngest) throw new DraftError('Birth date is not valid')
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
