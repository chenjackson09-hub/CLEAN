import { CLEANING_TYPES, FREQUENCIES, HOME_TYPES, PET_TYPES, PRIORITIES } from './options'
import { DraftError, listOf, numText, oneOf, ownPhotoUrl, str, uuidOrNull } from './validate'
import type { Place } from './cleaner'

// What the host wizard has collected so far — plain, serialisable values only.
export type CustomerDraft = {
  avatarUrl: string | null
  firstName: string
  lastName: string
  phone: string
  languages: string // comma separated, as typed
  aboutMe: string
  localityId: string | null
  area: string // typed town, only when the official list has no match
  homeType: (typeof HOME_TYPES)[number] | null
  bedrooms: string
  bathrooms: string
  numFloors: string
  sizeSqm: string
  numPeople: string
  petTypes: string[]
  numPets: string
  petNote: string
  petPhotoUrl: string | null
  frequency: (typeof FREQUENCIES)[number] | null
  cleaningType: (typeof CLEANING_TYPES)[number] | null
  priorities: string[]
  priorityOtherText: string
  homeInstructions: string
}

export const EMPTY_CUSTOMER_DRAFT: CustomerDraft = {
  avatarUrl: null, firstName: '', lastName: '', phone: '', languages: '', aboutMe: '', localityId: null, area: '',
  homeType: null, bedrooms: '', bathrooms: '', numFloors: '', sizeSqm: '', numPeople: '', petTypes: [], numPets: '', petNote: '',
  petPhotoUrl: null, frequency: null, cleaningType: null, priorities: [], priorityOtherText: '', homeInstructions: '',
}

export function validateCustomerDraft(input: unknown, opts: { submit: boolean; userId: string; supabaseUrl: string }): CustomerDraft {
  if (typeof input !== 'object' || input === null) throw new DraftError('Nothing to save')
  const i = input as Record<string, unknown>
  const draft: CustomerDraft = {
    avatarUrl: ownPhotoUrl(i.avatarUrl, 'Photo', opts.userId, opts.supabaseUrl),
    firstName: str(i.firstName, 'First name', 60),
    lastName: str(i.lastName, 'Last name', 60),
    phone: str(i.phone, 'Phone', 30),
    languages: str(i.languages, 'Languages', 200),
    aboutMe: str(i.aboutMe, 'About me', 2000),
    localityId: uuidOrNull(i.localityId, 'Town'),
    area: str(i.area, 'Town', 120),
    homeType: oneOf(i.homeType, 'Home type', HOME_TYPES),
    bedrooms: numText(i.bedrooms, 'Bedrooms', 0, 50),
    bathrooms: numText(i.bathrooms, 'Bathrooms', 0, 50),
    numFloors: numText(i.numFloors, 'Floors', 0, 50),
    sizeSqm: numText(i.sizeSqm, 'Size', 0, 10000),
    numPeople: numText(i.numPeople, 'People', 0, 100),
    petTypes: listOf(i.petTypes, 'Pets', PET_TYPES),
    numPets: numText(i.numPets, 'Number of pets', 0, 100),
    petNote: str(i.petNote, 'Pet note', 1000),
    petPhotoUrl: ownPhotoUrl(i.petPhotoUrl, 'Pet photo', opts.userId, opts.supabaseUrl),
    frequency: oneOf(i.frequency, 'Frequency', FREQUENCIES),
    cleaningType: oneOf(i.cleaningType, 'Cleaning type', CLEANING_TYPES),
    priorities: listOf(i.priorities, 'Priorities', PRIORITIES),
    priorityOtherText: str(i.priorityOtherText, 'Priority', 200),
    homeInstructions: str(i.homeInstructions, 'Home notes', 2000),
  }
  if (opts.submit) {
    if (!draft.firstName || !draft.lastName) throw new DraftError('Please enter your first and last name')
    if (!draft.localityId && !draft.area) throw new DraftError('Please choose your town')
  }
  return draft
}

export function customerDraftToRows(draft: CustomerDraft, place: Place) {
  // full_name stays "first last" so every existing reader of profiles.full_name is unaffected.
  const fullName = `${draft.firstName} ${draft.lastName}`.trim()
  const languages = draft.languages.split(',').map((l) => l.trim()).filter(Boolean)
  const hasPets = draft.petTypes.length > 0
  return {
    profile: { full_name: fullName || null, phone: draft.phone || null, ...(draft.avatarUrl ? { avatar_url: draft.avatarUrl } : {}) },
    customer: {
      first_name: draft.firstName || null,
      last_name: draft.lastName || null,
      languages,
      bio: draft.aboutMe || null,
      address: place.address || null,
      lat: place.coords?.lat ?? null,
      lng: place.coords?.lng ?? null,
      dwelling_type: draft.homeType,
      bedrooms: draft.bedrooms ? Number(draft.bedrooms) : null,
      bathrooms: draft.bathrooms ? Number(draft.bathrooms) : null,
      num_floors: draft.numFloors ? Number(draft.numFloors) : null,
      house_size_sqm: draft.sizeSqm ? Number(draft.sizeSqm) : null,
      num_people: draft.numPeople ? Number(draft.numPeople) : null,
      pet_types: draft.petTypes,
      num_pets: hasPets && draft.numPets ? Number(draft.numPets) : null,
      pet_note: hasPets && draft.petNote ? draft.petNote : null,
      ...(draft.petPhotoUrl ? { pet_photo_url: draft.petPhotoUrl } : {}),
      usage_frequency: draft.frequency,
      usual_cleaning_type: draft.cleaningType,
      cleaning_priorities: draft.priorities,
      cleaning_priorities_other: draft.priorities.includes('other') ? draft.priorityOtherText || null : null,
      home_instructions: draft.homeInstructions || null,
    },
  }
}

type ProfileRow = { full_name?: string | null; phone?: string | null; avatar_url?: string | null } | null

export function customerRowsToDraft(profile: ProfileRow, customer: Record<string, unknown> | null): CustomerDraft {
  const c = customer ?? {}
  const txt = (v: unknown) => (typeof v === 'string' ? v : '')
  const n = (v: unknown) => (typeof v === 'number' ? String(v) : '')
  const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null)
  const list = <T extends string>(v: unknown, allowed: readonly T[]) => (Array.isArray(v) ? (v as string[]).filter((x): x is T => (allowed as readonly string[]).includes(x)) : [])
  const full = (profile?.full_name ?? '').trim()
  const [firstFromName, ...rest] = full.split(/\s+/)
  return {
    ...EMPTY_CUSTOMER_DRAFT,
    avatarUrl: profile?.avatar_url ?? null,
    firstName: txt(c.first_name) || firstFromName || '',
    lastName: txt(c.last_name) || rest.join(' '),
    phone: profile?.phone ?? '',
    languages: Array.isArray(c.languages) ? (c.languages as string[]).join(', ') : '',
    aboutMe: txt(c.bio),
    localityId: typeof c.locality_id === 'string' ? c.locality_id : null,
    area: typeof c.locality_id === 'string' ? '' : txt(c.address),
    homeType: pick(c.dwelling_type, HOME_TYPES),
    bedrooms: n(c.bedrooms),
    bathrooms: n(c.bathrooms),
    numFloors: n(c.num_floors),
    sizeSqm: n(c.house_size_sqm),
    numPeople: n(c.num_people),
    petTypes: list(c.pet_types, PET_TYPES),
    numPets: n(c.num_pets),
    petNote: txt(c.pet_note),
    petPhotoUrl: typeof c.pet_photo_url === 'string' ? c.pet_photo_url : null,
    frequency: pick(c.usage_frequency, FREQUENCIES),
    cleaningType: pick(c.usual_cleaning_type, CLEANING_TYPES),
    priorities: list(c.cleaning_priorities, PRIORITIES),
    priorityOtherText: txt(c.cleaning_priorities_other),
    homeInstructions: txt(c.home_instructions),
  }
}
