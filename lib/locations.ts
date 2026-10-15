// Pure helpers for the admin Locations screens (no I/O).
import { normalizeQuery } from '@/lib/localities/normalize'

export type LocationStatus = 'open' | 'coming_soon' | 'not_open'
export const LOCATION_STATUSES: LocationStatus[] = ['open', 'coming_soon', 'not_open']

export function isLocationStatus(v: unknown): v is LocationStatus {
  return typeof v === 'string' && (LOCATION_STATUSES as string[]).includes(v)
}

// ── Reporting period ──────────────────────────────────────────────────────
export type PeriodKey = '7d' | '30d' | '90d' | 'all' | 'custom'
export const PERIOD_KEYS: PeriodKey[] = ['7d', '30d', '90d', 'all', 'custom']

export type Period = { key: PeriodKey; since: Date; until: Date; from?: string; to?: string }

const DAY = 24 * 60 * 60 * 1000
// "All time" starts well before the product existed; the previous-period window
// then holds nothing, so growth reads as "no data" instead of a made-up figure.
const ALL_TIME_START = new Date('2000-01-01T00:00:00Z')

const ymdOk = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

// `until` is exclusive and always "now" (or end of the chosen day for custom).
export function resolvePeriod(key: string | undefined, from: string | undefined, to: string | undefined, now: Date = new Date()): Period {
  if (key === 'all') return { key: 'all', since: ALL_TIME_START, until: new Date(now.getTime() + 1000) }
  if (key === 'custom' && ymdOk(from) && ymdOk(to)) {
    const since = new Date(`${from}T00:00:00Z`)
    const until = new Date(new Date(`${to}T00:00:00Z`).getTime() + DAY)
    if (until > since) return { key: 'custom', since, until, from, to }
  }
  const days = key === '7d' ? 7 : key === '90d' ? 90 : 30
  const k: PeriodKey = key === '7d' ? '7d' : key === '90d' ? '90d' : '30d'
  return { key: k, since: new Date(now.getTime() - days * DAY), until: new Date(now.getTime() + 1000) }
}

// ── Search ────────────────────────────────────────────────────────────────
// Splits what the admin typed into the three kinds of key the SQL function
// understands: a Hebrew name key, an English name key, or an official code.
export function searchKeys(raw: string): { he: string; en: string; code: string } {
  const q = raw.trim()
  if (!q) return { he: '', en: '', code: '' }
  if (/^\d{1,6}$/.test(q)) return { he: '', en: '', code: String(parseInt(q, 10)) }
  const { script, key } = normalizeQuery(q)
  return script === 'he' ? { he: key, en: '', code: '' } : { he: '', en: key, code: '' }
}

// ── Districts ─────────────────────────────────────────────────────────────
// The CBS file stores district names in Hebrew; these are the official names in English.
const DISTRICT_EN: Record<string, string> = {
  'הצפון': 'Northern District',
  'חיפה': 'Haifa District',
  'המרכז': 'Central District',
  'תל אביב': 'Tel Aviv District',
  'ירושלים': 'Jerusalem District',
  'הדרום': 'Southern District',
  'יהודה והשומרון': 'Judea and Samaria Area',
}
export function districtLabel(he: string | null | undefined, lang: 'en' | 'he'): string {
  if (!he) return '—'
  return lang === 'he' ? he : DISTRICT_EN[he] ?? he
}

// ── Growth ────────────────────────────────────────────────────────────────
// Percent change vs the previous equal period; null when there is no earlier
// baseline (never invent a percentage out of nothing).
export function growthPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}
