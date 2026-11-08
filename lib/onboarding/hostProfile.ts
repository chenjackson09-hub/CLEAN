import { CLEANING_TYPES, FREQUENCIES, PRIORITIES } from './options'
import { DraftError, bool, listOf, numText, oneOf, str } from './validate'

// What a host can tell cleaners about their household and their usual cleaning needs. These feed
// the generated "About us" paragraph, and are also shown as the "Typical needs" row on the profile.
// They describe the HOUSEHOLD — each individual request still carries its own date, tasks and time.

export const HOUSEHOLD_TYPES = ['alone', 'couple', 'family', 'family_kids', 'roommates', 'other'] as const
export const HOME_VIBES = ['small', 'large', 'renovated', 'older'] as const
export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export const FLEXIBILITY = ['fixed', 'somewhat', 'very'] as const

export type HostNeeds = {
  householdType: (typeof HOUSEHOLD_TYPES)[number] | null
  householdNote: string
  homeVibe: (typeof HOME_VIBES)[number][]
  homeNote: string
  frequency: (typeof FREQUENCIES)[number] | null
  cleaningType: (typeof CLEANING_TYPES)[number] | null
  priorities: string[]
  priorityOtherText: string
  typicalHours: string // "" = not answered
  preferredDays: (typeof DAYS)[number][]
  daysFlexible: boolean
  flexibility: (typeof FLEXIBILITY)[number] | null
  extraNote: string
}

export const EMPTY_HOST_NEEDS: HostNeeds = {
  householdType: null, householdNote: '', homeVibe: [], homeNote: '',
  frequency: null, cleaningType: null, priorities: [], priorityOtherText: '',
  typicalHours: '', preferredDays: [], daysFlexible: false, flexibility: null, extraNote: '',
}

export const NOTE_MAX = 200

// Server-side check of everything a form sends. Throws DraftError with a readable message.
export function validateHostNeeds(input: unknown): HostNeeds {
  const i = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const hours = numText(i.typicalHours, 'Hours per visit', 0.5, 12)
  return {
    householdType: oneOf(i.householdType, 'Household', HOUSEHOLD_TYPES),
    householdNote: str(i.householdNote, 'Household note', NOTE_MAX),
    homeVibe: listOf(i.homeVibe, 'Home', HOME_VIBES),
    homeNote: str(i.homeNote, 'Home note', NOTE_MAX),
    frequency: oneOf(i.frequency, 'Frequency', FREQUENCIES),
    cleaningType: oneOf(i.cleaningType, 'Cleaning type', CLEANING_TYPES),
    priorities: listOf(i.priorities, 'Tasks', PRIORITIES),
    priorityOtherText: str(i.priorityOtherText, 'Other task', NOTE_MAX),
    typicalHours: hours,
    preferredDays: listOf(i.preferredDays, 'Days', DAYS),
    daysFlexible: bool(i.daysFlexible, 'Flexible days'),
    flexibility: oneOf(i.flexibility, 'Flexibility', FLEXIBILITY),
    extraNote: str(i.extraNote, 'Anything else', NOTE_MAX * 2),
  }
}

export { DraftError }

// The customers columns these answers live in (all written together, best-effort — see
// saveOnboarding and updateCustomerProfile — so a database without migration 0045 never blocks a save).
export function hostNeedsToRow(n: HostNeeds) {
  return {
    household_type: n.householdType,
    household_note: n.householdNote || null,
    home_vibe: n.homeVibe,
    home_note: n.homeNote || null,
    usage_frequency: n.frequency,
    usual_cleaning_type: n.cleaningType,
    cleaning_priorities: n.priorities,
    cleaning_priorities_other: n.priorities.includes('other') ? n.priorityOtherText || null : null,
    typical_hours: n.typicalHours ? Number(n.typicalHours) : null,
    preferred_days: n.preferredDays,
    days_flexible: n.daysFlexible,
    flexibility: n.flexibility,
    extra_note: n.extraNote || null,
  }
}

export function hostNeedsFromRow(c: Record<string, unknown>): HostNeeds {
  const txt = (v: unknown) => (typeof v === 'string' ? v : '')
  const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null)
  const list = <T extends string>(v: unknown, allowed: readonly T[]): T[] => (Array.isArray(v) ? (v as string[]).filter((x): x is T => (allowed as readonly string[]).includes(x)) : [])
  const hours = typeof c.typical_hours === 'number' ? c.typical_hours : typeof c.typical_hours === 'string' && c.typical_hours !== '' ? Number(c.typical_hours) : null
  return {
    householdType: pick(c.household_type, HOUSEHOLD_TYPES),
    householdNote: txt(c.household_note),
    homeVibe: list(c.home_vibe, HOME_VIBES),
    homeNote: txt(c.home_note),
    frequency: pick(c.usage_frequency, FREQUENCIES),
    cleaningType: pick(c.usual_cleaning_type, CLEANING_TYPES),
    priorities: list(c.cleaning_priorities, PRIORITIES),
    priorityOtherText: txt(c.cleaning_priorities_other),
    typicalHours: hours != null && Number.isFinite(hours) ? String(hours) : '',
    preferredDays: list(c.preferred_days, DAYS),
    daysFlexible: c.days_flexible === true,
    flexibility: pick(c.flexibility, FLEXIBILITY),
    extraNote: txt(c.extra_note),
  }
}
