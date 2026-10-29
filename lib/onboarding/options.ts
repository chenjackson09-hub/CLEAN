// The answer options both the wizards, the profile editors and the server-side checks use —
// ONE list, so what a screen offers and what the server accepts can never drift apart.

// What a cleaner offers: 11 choices in three groups (+ "Other"). The stored value is the
// English text (profiles show it as saved); `key` is the translation key of the label.
export const CLEANER_SERVICES: { value: string; key: string; group: 'home' | 'places' | 'also' | 'other' }[] = [
  { value: 'Regular cleaning', key: 'svcRegular', group: 'home' },
  { value: 'Deep cleaning', key: 'svcDeep', group: 'home' },
  { value: 'Windows', key: 'svcWindows', group: 'home' },
  { value: 'Laundry & ironing', key: 'svcLaundry', group: 'home' },
  { value: 'Move-in / move-out', key: 'svcMove', group: 'home' },
  { value: 'Post-renovation', key: 'svcRenovation', group: 'home' },
  { value: 'Pesach & holidays', key: 'svcPesach', group: 'home' },
  { value: 'Airbnb & guesthouses', key: 'svcAirbnb', group: 'places' },
  { value: 'Offices & commercial', key: 'svcOffices', group: 'places' },
  { value: 'Pet-friendly', key: 'svcPetFriendly', group: 'also' },
  { value: 'Organizing', key: 'svcOrganizing', group: 'also' },
  { value: 'Other', key: 'svcOther', group: 'other' },
]
export const SERVICE_GROUPS: { group: 'home' | 'places' | 'also'; key: string }[] = [
  { group: 'home', key: 'svcGroupHome' },
  { group: 'places', key: 'svcGroupPlaces' },
  { group: 'also', key: 'svcGroupAlso' },
]

// Cleaners who signed up before the 16 choices were folded into 11 keep their old words in
// the database. They are read as the closest new choice (and saved as that next time).
const LEGACY_SERVICES: Record<string, string | null> = {
  'General home cleaning': 'Regular cleaning',
  'Residential cleaning': 'Regular cleaning',
  Closets: 'Organizing',
  Organization: 'Organizing',
  Laundry: 'Laundry & ironing',
  Pesach: 'Pesach & holidays',
  'Move-in': 'Move-in / move-out',
  'Move-out': 'Move-in / move-out',
  'Newly renovated': 'Post-renovation',
  Airbnb: 'Airbnb & guesthouses',
  'Commercial cleaning': 'Offices & commercial',
  Offices: 'Offices & commercial',
  'Pet friendly': 'Pet-friendly',
}
export const SERVICE_VALUES = CLEANER_SERVICES.map((s) => s.value)

export function normalizeServices(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const out: string[] = []
  for (const raw of list) {
    if (typeof raw !== 'string') continue
    const v = raw in LEGACY_SERVICES ? LEGACY_SERVICES[raw] : raw
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

// "How long have you been cleaning?" — `years` is the lower bound, stored in the older
// years_experience column so sorting and older screens keep working.
export const EXPERIENCE_RANGES: { value: string; years: number; key: string; en: string; he: string }[] = [
  { value: 'new', years: 0, key: 'expNew', en: 'New to cleaning', he: 'חדש/ה בניקיון' },
  { value: 'under1', years: 0, key: 'expUnder1', en: 'Under 1 year', he: 'פחות משנה' },
  { value: '1_3', years: 1, key: 'exp13', en: '1–3 years', he: '1–3 שנים' },
  { value: '3_5', years: 3, key: 'exp35', en: '3–5 years', he: '3–5 שנים' },
  { value: '5plus', years: 5, key: 'exp5', en: '5+ years', he: '5+ שנים' },
]
export const EXPERIENCE_VALUES = EXPERIENCE_RANGES.map((r) => r.value)
export function experienceLabel(value: string | null | undefined, lang: 'en' | 'he'): string | null {
  const r = EXPERIENCE_RANGES.find((x) => x.value === value)
  return r ? r[lang] : null
}

// Languages offered as chips (stored as the English name); anything else is typed under "Other".
export const LANGUAGE_CHIPS: { value: string; key: string }[] = [
  { value: 'Hebrew', key: 'langHebrew' },
  { value: 'English', key: 'langEnglish' },
  { value: 'Russian', key: 'langRussian' },
  { value: 'Arabic', key: 'langArabic' },
  { value: 'Amharic', key: 'langAmharic' },
  { value: 'French', key: 'langFrench' },
  { value: 'Spanish', key: 'langSpanish' },
]
export const LANGUAGE_VALUES = LANGUAGE_CHIPS.map((l) => l.value)

// Splits saved languages into the chips that were ticked and everything else (shown as "Other").
export function splitLanguages(saved: unknown): { chips: string[]; other: string } {
  const list = Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  return { chips: list.filter((l) => LANGUAGE_VALUES.includes(l)), other: list.filter((l) => !LANGUAGE_VALUES.includes(l)).join(', ') }
}
export function joinLanguages(chips: string[], other: string): string[] {
  const extra = other.split(',').map((l) => l.trim()).filter((l) => l && l.length <= 30)
  return Array.from(new Set([...chips, ...extra])).slice(0, 12)
}

export const MATCH_TYPES = ['recurring', 'occasional', 'other'] as const

// Host home types. 'other' is no longer offered but stays valid for rows that already have it.
export const HOME_TYPES = ['apartment', 'house', 'villa', 'guesthouse', 'office', 'other'] as const
export const HOME_TYPE_CHOICES = ['apartment', 'house', 'villa', 'guesthouse', 'office'] as const
export const FREQUENCIES = ['weekly', 'twice_monthly', 'occasional', 'one_time'] as const
export const CLEANING_TYPES = ['regular', 'deep'] as const
export const PRIORITIES = ['kitchen', 'bathrooms', 'floors', 'dusting', 'windows', 'linens', 'laundry', 'outdoor', 'other'] as const
export const PET_TYPES = ['dog', 'cat', 'other'] as const
