import { CLEANER_SERVICES, MATCH_TYPES } from './options'
import { DraftError, bool, birthdateFromParts, listOf, numText, oneOf, ownPhotoUrl, str, uuidOrNull } from './validate'

// What the cleaner wizard has collected so far — plain, serialisable values only (no files,
// no objects): the wizard sends this on every Continue and the server saves it.
export type CleanerDraft = {
  name: string
  avatarUrl: string | null
  birthD: string
  birthM: string
  birthY: string
  localityId: string | null
  loc: string // typed town, only when the official list has no match
  radius: string
  freqType: 'num' | 'monthly' | 'other'
  freqVal: number
  freqOtherText: string
  rate: string
  duration: string
  maxDuration: string
  maxDurationNoLimit: boolean
  services: string[]
  serviceOtherText: string
  matchTypes: string[]
  matchOtherText: string
  car: 'yes' | 'no' | null
  gas: 'yes' | 'no' | null
  gasAmt: string
  bio: string
}

export const EMPTY_CLEANER_DRAFT: CleanerDraft = {
  name: '', avatarUrl: null, birthD: '', birthM: '', birthY: '', localityId: null, loc: '', radius: '10',
  freqType: 'num', freqVal: 3, freqOtherText: '', rate: '75', duration: '3', maxDuration: '5', maxDurationNoLimit: false,
  services: [], serviceOtherText: '', matchTypes: [], matchOtherText: '', car: null, gas: null, gasAmt: '1', bio: '',
}

const SERVICE_VALUES = CLEANER_SERVICES.map((s) => s.value)

// Checks everything the wizard sent. Partial saves ("continue" mid-wizard) only check that
// what IS there is valid; a submit also requires the required answers. Throws DraftError
// with a message safe to show the person.
export function validateCleanerDraft(input: unknown, opts: { submit: boolean; userId: string; supabaseUrl: string; now?: Date }): CleanerDraft {
  if (typeof input !== 'object' || input === null) throw new DraftError('Nothing to save')
  const i = input as Record<string, unknown>
  const draft: CleanerDraft = {
    name: str(i.name, 'Name', 120),
    avatarUrl: ownPhotoUrl(i.avatarUrl, 'Photo', opts.userId, opts.supabaseUrl),
    birthD: numText(i.birthD, 'Birth day', 1, 31),
    birthM: numText(i.birthM, 'Birth month', 1, 12),
    birthY: numText(i.birthY, 'Birth year', 1900, 2100),
    localityId: uuidOrNull(i.localityId, 'Town'),
    loc: str(i.loc, 'Town', 120),
    radius: numText(i.radius, 'Travel distance', 1, 100) || '10',
    freqType: oneOf(i.freqType, 'Frequency', ['num', 'monthly', 'other'] as const) ?? 'num',
    freqVal: Number(numText(i.freqVal, 'Frequency', 0, 14) || 3),
    freqOtherText: str(i.freqOtherText, 'Frequency', 200),
    rate: numText(i.rate, 'Hourly rate', 0, 2000),
    duration: numText(i.duration, 'Minimum job length', 0.5, 24),
    maxDuration: numText(i.maxDuration, 'Maximum job length', 0.5, 24),
    maxDurationNoLimit: bool(i.maxDurationNoLimit, 'No limit'),
    services: listOf(i.services, 'Services', SERVICE_VALUES),
    serviceOtherText: str(i.serviceOtherText, 'Other service', 120),
    matchTypes: listOf(i.matchTypes, 'Work preference', MATCH_TYPES),
    matchOtherText: str(i.matchOtherText, 'Work preference', 200),
    car: oneOf(i.car, 'Car', ['yes', 'no'] as const),
    gas: oneOf(i.gas, 'Gas returns', ['yes', 'no'] as const),
    gasAmt: numText(i.gasAmt, 'Gas return amount', 0, 100) || '1',
    bio: str(i.bio, 'About me', 2000),
  }
  if (draft.duration && draft.maxDuration && !draft.maxDurationNoLimit && Number(draft.maxDuration) < Number(draft.duration)) {
    throw new DraftError('The longest job cannot be shorter than the shortest job')
  }
  // Throws if present but not a real date.
  birthdateFromParts(draft.birthD, draft.birthM, draft.birthY, opts.now)
  if (opts.submit) {
    if (!draft.name) throw new DraftError('Please enter your name')
    if (!draft.birthD || !draft.birthM || !draft.birthY) throw new DraftError('Please enter your date of birth')
    if (!draft.localityId && !draft.loc) throw new DraftError('Please choose where you work')
    if (draft.services.length === 0) throw new DraftError('Please choose at least one type of cleaning')
    if (draft.matchTypes.length === 0) throw new DraftError('Please choose what kind of work you prefer')
  }
  return draft
}

export type Place = { address: string; coords: { lat: number; lng: number } | null; localityId: string | null }

// The rows to write. `monthly` is stored as the word "monthly" (the profile editor reads it
// that way) — not as translated text, which used to depend on the language they signed up in.
export function cleanerDraftToRows(draft: CleanerDraft, place: Place, now?: Date) {
  const birthdate = birthdateFromParts(draft.birthD, draft.birthM, draft.birthY, now)
  const gasOn = draft.car === 'yes' && draft.gas === 'yes'
  return {
    profile: { full_name: draft.name || null, ...(draft.avatarUrl ? { avatar_url: draft.avatarUrl } : {}) },
    cleaner: {
      bio: draft.bio || null,
      cleaning_categories: draft.services,
      cleaning_category_other: draft.services.includes('Other') ? draft.serviceOtherText || null : null,
      hourly_rate: draft.rate ? Number(draft.rate) : null,
      min_hours: draft.duration ? Number(draft.duration) : null,
      max_hours: draft.maxDurationNoLimit ? null : draft.maxDuration ? Number(draft.maxDuration) : null,
      address: place.address || null,
      service_radius_km: Math.min(100, Math.max(1, Number(draft.radius) || 10)),
      ...(place.coords ? { location: `POINT(${place.coords.lng} ${place.coords.lat})` } : {}),
      birthdate,
      weekly_clean_target: draft.freqType === 'num' ? draft.freqVal : 0,
      weekly_clean_other: draft.freqType === 'monthly' ? 'monthly' : draft.freqType === 'other' ? draft.freqOtherText || null : null,
      has_car: draft.car === null ? null : draft.car === 'yes',
      gas_return_enabled: gasOn,
      gas_return_rate: gasOn ? Number(draft.gasAmt || '1') : null,
      match_preferences: draft.matchTypes,
      match_preference_other: draft.matchTypes.includes('other') ? draft.matchOtherText || null : null,
    },
  }
}

type ProfileRow = { full_name?: string | null; avatar_url?: string | null } | null
type CleanerRow = Record<string, unknown> | null

// The other direction: rebuild the wizard's answers from what was saved, so a returning
// person continues exactly where they stopped.
export function cleanerRowsToDraft(profile: ProfileRow, cleaner: CleanerRow): CleanerDraft {
  const c = cleaner ?? {}
  const num = (v: unknown, fallback: string) => (typeof v === 'number' || (typeof v === 'string' && v !== '') ? String(Number(v)) : fallback)
  const birth = typeof c.birthdate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.birthdate) ? c.birthdate.split('-') : null
  const weeklyOther = typeof c.weekly_clean_other === 'string' ? c.weekly_clean_other : ''
  const freqType: CleanerDraft['freqType'] = weeklyOther === 'monthly' ? 'monthly' : weeklyOther ? 'other' : 'num'
  const maxNull = c.max_hours == null && c.min_hours != null // saved with "no limit"
  const services = Array.isArray(c.cleaning_categories) ? (c.cleaning_categories as string[]).filter((s) => SERVICE_VALUES.includes(s)) : []
  const matchTypes = Array.isArray(c.match_preferences) ? (c.match_preferences as string[]).filter((m) => (MATCH_TYPES as readonly string[]).includes(m)) : []
  return {
    ...EMPTY_CLEANER_DRAFT,
    name: profile?.full_name ?? '',
    avatarUrl: profile?.avatar_url ?? null,
    birthY: birth ? String(Number(birth[0])) : '',
    birthM: birth ? String(Number(birth[1])) : '',
    birthD: birth ? String(Number(birth[2])) : '',
    localityId: typeof c.locality_id === 'string' ? c.locality_id : null,
    loc: typeof c.locality_id === 'string' ? '' : typeof c.address === 'string' ? c.address : '',
    radius: num(c.service_radius_km, '10'),
    freqType,
    freqVal: typeof c.weekly_clean_target === 'number' && c.weekly_clean_target > 0 ? c.weekly_clean_target : 3,
    freqOtherText: freqType === 'other' ? weeklyOther : '',
    rate: num(c.hourly_rate, '75'),
    duration: num(c.min_hours, '3'),
    maxDuration: num(c.max_hours, '5'),
    maxDurationNoLimit: maxNull,
    services,
    serviceOtherText: typeof c.cleaning_category_other === 'string' ? c.cleaning_category_other : '',
    matchTypes,
    matchOtherText: typeof c.match_preference_other === 'string' ? c.match_preference_other : '',
    car: c.has_car === 'yes' || c.has_car === true ? 'yes' : c.has_car === 'no' || c.has_car === false ? 'no' : null,
    gas: c.has_car ? (c.gas_return_enabled ? 'yes' : 'no') : null,
    gasAmt: num(c.gas_return_rate, '1'),
    bio: typeof c.bio === 'string' ? c.bio : '',
  }
}
