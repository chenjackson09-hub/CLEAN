// Pure helpers for the admin Locations screens (no I/O).

export type SetStatus = 'open' | 'closed' | 'inherit'
export const SET_STATUSES: SetStatus[] = ['open', 'closed', 'inherit']
export function isSetStatus(v: unknown): v is SetStatus {
  return typeof v === 'string' && (SET_STATUSES as string[]).includes(v)
}

// ── URL filters ───────────────────────────────────────────────────────────
// Every filter lives in the URL so the page is shareable, Back works, and the
// Customers/Cleaners pages can link here and return to the same view.
export type UsersFilter = '' | 'customers' | 'cleaners' | 'waiting' | 'waiting_customers' | 'waiting_cleaners'
export type SortKey = 'name' | 'status' | 'customers' | 'cleaners' | 'waiting' | 'relevance'
export type Tab = 'manage' | 'regions'

export type LocationFilters = {
  tab: Tab
  q: string
  district: string
  region: string
  status: '' | 'open' | 'closed'
  users: UsersFilter
  sort: SortKey
  dir: 'asc' | 'desc'
  page: number
}

const USERS: UsersFilter[] = ['customers', 'cleaners', 'waiting', 'waiting_customers', 'waiting_cleaners']
const SORTS: SortKey[] = ['name', 'status', 'customers', 'cleaners', 'waiting']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export function parseFilters(sp: SP): LocationFilters {
  const q = one(sp.q).trim().slice(0, 60)
  const users = one(sp.users) as UsersFilter
  const sortRaw = one(sp.sort) as SortKey
  const status = one(sp.status)
  const region = one(sp.region)
  const hasSort = SORTS.includes(sortRaw)
  return {
    tab: one(sp.tab) === 'regions' ? 'regions' : 'manage',
    q,
    district: one(sp.district).slice(0, 40),
    region: UUID.test(region) ? region : '',
    status: status === 'open' || status === 'closed' ? status : '',
    users: USERS.includes(users) ? users : '',
    // With a search the best match comes first unless the admin picked a sort.
    sort: hasSort ? sortRaw : q ? 'relevance' : 'customers',
    dir: one(sp.dir) === 'asc' ? 'asc' : one(sp.dir) === 'desc' ? 'desc' : hasSort && sortRaw === 'name' ? 'asc' : q && !hasSort ? 'asc' : 'desc',
    page: Math.max(1, parseInt(one(sp.page), 10) || 1),
  }
}

export function hasActiveFilters(f: LocationFilters): boolean {
  return !!(f.q || f.district || f.region || f.status || f.users)
}

// Which summary card matches the current filters (so it can be highlighted).
export type CardKey = 'total' | 'open' | 'customers' | 'cleaners' | 'waiting_customers' | 'waiting_cleaners'
export function activeCard(f: LocationFilters): CardKey | null {
  if (f.q || f.district || f.region) return null
  if (!f.status && !f.users) return 'total'
  if (f.status === 'open' && !f.users) return 'open'
  if (!f.status && f.users === 'customers') return 'customers'
  if (!f.status && f.users === 'cleaners') return 'cleaners'
  if (!f.status && f.users === 'waiting_customers') return 'waiting_customers'
  if (!f.status && f.users === 'waiting_cleaners') return 'waiting_cleaners'
  return null
}

// What each card filters the table to.
export const CARD_FILTER: Record<CardKey, { status: '' | 'open' | 'closed'; users: UsersFilter }> = {
  total: { status: '', users: '' },
  open: { status: 'open', users: '' },
  customers: { status: '', users: 'customers' },
  cleaners: { status: '', users: 'cleaners' },
  waiting_customers: { status: '', users: 'waiting_customers' },
  waiting_cleaners: { status: '', users: 'waiting_cleaners' },
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
  'אזור יהודה ושומרון': 'Judea and Samaria Area',
  'יהודה והשומרון': 'Judea and Samaria Area',
}
export function districtLabel(he: string | null | undefined, lang: 'en' | 'he'): string {
  if (!he) return '—'
  return lang === 'he' ? he : DISTRICT_EN[he] ?? he
}

// The name shown for a locality: Hebrew for Hebrew, otherwise the display
// spelling ("Beit Hillel") when set, else the official CBS spelling.
export function localityName(l: { name_he: string; name_en: string | null; name_en_display?: string | null }, lang: 'en' | 'he'): string {
  return lang === 'he' ? l.name_he : l.name_en_display?.trim() || l.name_en || l.name_he
}
