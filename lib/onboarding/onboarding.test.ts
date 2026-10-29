import { birthdateFromParts, DraftError, ownPhotoUrl } from './validate'
import { cleanerDraftToRows, cleanerRowsToDraft, EMPTY_CLEANER_DRAFT, validateCleanerDraft } from './cleaner'
import { customerDraftToRows, customerRowsToDraft, EMPTY_CUSTOMER_DRAFT, validateCustomerDraft } from './customer'

const USER = '11111111-1111-4111-8111-111111111111'
const URL = 'https://proj.supabase.co'
const opts = (submit: boolean) => ({ submit, userId: USER, supabaseUrl: URL, now: new Date('2026-10-29T00:00:00Z') })
const place = { address: 'בית הלל', coords: { lat: 33.2, lng: 35.6 }, localityId: 'loc-1' }

describe('validate helpers', () => {
  it('accepts a real birth date and rejects impossible, future and too-young ones', () => {
    const now = new Date('2026-10-29T00:00:00Z')
    expect(birthdateFromParts('5', '3', '1995', now)).toBe('1995-03-05')
    expect(birthdateFromParts('', '', '', now)).toBeNull()
    expect(() => birthdateFromParts('31', '2', '1995', now)).toThrow(DraftError)
    expect(() => birthdateFromParts('1', '1', '1900', now)).toThrow(DraftError)
    expect(() => birthdateFromParts('1', '1', '2020', now)).toThrow(DraftError)
    expect(() => birthdateFromParts('1', '1', '2013', now)).toThrow(DraftError) // under 14
    expect(birthdateFromParts('1', '1', '2010', now)).toBe('2010-01-01') // 16: allowed, admin is told separately
  })
  it('only accepts photos from the person’s own storage folder', () => {
    const own = `${URL}/storage/v1/object/public/avatars/${USER}/avatar.jpg?v=1`
    expect(ownPhotoUrl(own, 'Photo', USER, URL)).toBe(own)
    expect(ownPhotoUrl('', 'Photo', USER, URL)).toBeNull()
    expect(() => ownPhotoUrl('https://evil.com/x.jpg', 'Photo', USER, URL)).toThrow(DraftError)
    expect(() => ownPhotoUrl(`${URL}/storage/v1/object/public/avatars/someone-else/a.jpg`, 'Photo', USER, URL)).toThrow(DraftError)
  })
})

describe('cleaner draft', () => {
  const good = { ...EMPTY_CLEANER_DRAFT, name: 'Noa Rosen', birthD: '5', birthM: '3', birthY: '1995', localityId: '22222222-2222-4222-8222-222222222222', services: ['Deep cleaning'], matchTypes: ['recurring'] }

  it('a partial save only needs what is present to be valid', () => {
    expect(validateCleanerDraft({ ...EMPTY_CLEANER_DRAFT, name: 'Noa' }, opts(false)).name).toBe('Noa')
  })
  it('a submit needs the required answers, with a plain message for each', () => {
    expect(() => validateCleanerDraft(EMPTY_CLEANER_DRAFT, opts(true))).toThrow('Please enter your name')
    expect(() => validateCleanerDraft({ ...good, birthD: '', birthM: '', birthY: '' }, opts(true))).toThrow('date of birth')
    expect(() => validateCleanerDraft({ ...good, localityId: null, loc: '' }, opts(true))).toThrow('where you work')
    expect(() => validateCleanerDraft({ ...good, services: [] }, opts(true))).toThrow('type of cleaning')
    // The kind of work is optional now ("either is fine" is the default).
    expect(validateCleanerDraft({ ...good, matchTypes: [] }, opts(true)).matchTypes).toEqual([])
    expect(validateCleanerDraft(good, opts(true)).name).toBe('Noa Rosen')
  })
  it('rejects values the screen would never send', () => {
    expect(() => validateCleanerDraft({ ...good, rate: '-5' }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, rate: 'abc' }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, radius: '5000' }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, services: ['Hacking'] }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, bio: 'x'.repeat(2001) }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, localityId: 'not-a-uuid' }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, duration: '5', maxDuration: '3' }, opts(false))).toThrow('longest job')
    expect(() => validateCleanerDraft('nope', opts(false))).toThrow(DraftError)
  })
  it('writes the rows the profile reads, and "monthly" as the word monthly', () => {
    const d = validateCleanerDraft({ ...good, freqType: 'monthly', car: 'yes', gas: 'yes', gasAmt: '1.5', maxDurationNoLimit: true }, opts(true))
    const rows = cleanerDraftToRows(d, place, new Date('2026-10-29T00:00:00Z'))
    expect(rows.profile).toEqual({ full_name: 'Noa Rosen' })
    expect(rows.cleaner).toMatchObject({
      address: 'בית הלל', location: 'POINT(35.6 33.2)', birthdate: '1995-03-05', weekly_clean_other: 'monthly', weekly_clean_target: 0,
      has_car: true, gas_return_enabled: true, gas_return_rate: 1.5, max_hours: null, cleaning_categories: ['Deep cleaning'],
    })
  })
  it('does not touch the saved location when no coordinates were found', () => {
    const rows = cleanerDraftToRows(validateCleanerDraft(good, opts(true)), { ...place, coords: null })
    expect('location' in rows.cleaner).toBe(false)
  })
  it('round-trips: what was saved comes back as the same answers', () => {
    const d = validateCleanerDraft({ ...good, freqType: 'other', freqOtherText: 'Weekends', car: 'yes', gas: 'no', rate: '80', matchTypes: ['recurring', 'other'], matchOtherText: 'Mornings', services: ['Other', 'Windows'], serviceOtherText: 'Pesach prep', bio: 'Hi', experience: '3_5', languages: ['Hebrew', 'Russian'], languagesOther: 'Tigrinya, Thai' }, opts(true))
    const rows = cleanerDraftToRows(d, place, new Date('2026-10-29T00:00:00Z'))
    const back = cleanerRowsToDraft({ full_name: 'Noa Rosen', avatar_url: null }, { ...rows.cleaner, ...rows.extras, locality_id: d.localityId })
    expect(back).toMatchObject({
      name: 'Noa Rosen', birthD: '5', birthM: '3', birthY: '1995', localityId: d.localityId, loc: '', rate: '80',
      freqType: 'other', freqOtherText: 'Weekends', car: 'yes', gas: 'no', matchTypes: ['recurring', 'other'], matchOtherText: 'Mornings',
      services: ['Other', 'Windows'], serviceOtherText: 'Pesach prep', bio: 'Hi', experience: '3_5',
      languages: ['Hebrew', 'Russian'], languagesOther: 'Tigrinya, Thai',
    })
  })
  it('"either is fine" is the default when nothing is ticked, and experience is stored as its lower bound', () => {
    const rows = cleanerDraftToRows(validateCleanerDraft({ ...good, matchTypes: [], experience: '1_3', languages: ['English'], languagesOther: 'Thai' }, opts(true)), place)
    expect(rows.cleaner.match_preferences).toEqual(['recurring', 'occasional'])
    expect(rows.cleaner.years_experience).toBe(1)
    expect(rows.cleaner.languages).toEqual(['English', 'Thai'])
    expect(rows.extras).toEqual({ experience_range: '1_3' })
    // A person who never answered keeps whatever years_experience they already had.
    expect('years_experience' in cleanerDraftToRows(validateCleanerDraft(good, opts(true)), place).cleaner).toBe(false)
  })
  it('older service names are read as the new grouped choices', () => {
    const d = validateCleanerDraft({ ...good, services: ['General home cleaning', 'Move-in', 'Move-out', 'Closets', 'Deep cleaning'] }, opts(false))
    expect(d.services).toEqual(['Regular cleaning', 'Move-in / move-out', 'Organizing', 'Deep cleaning'])
    const back = cleanerRowsToDraft({ full_name: 'x', avatar_url: null }, { cleaning_categories: ['Pet friendly', 'Offices', 'Commercial cleaning', 'Nonsense'] })
    expect(back.services).toEqual(['Pet-friendly', 'Offices & commercial', 'Nonsense'].filter((x) => x !== 'Nonsense'))
  })
  it('rejects an experience range or language chip the screen never offers', () => {
    expect(() => validateCleanerDraft({ ...good, experience: '50years' }, opts(false))).toThrow(DraftError)
    expect(() => validateCleanerDraft({ ...good, languages: ['Klingon'] }, opts(false))).toThrow(DraftError)
  })
  it('a brand-new account (empty rows) resumes with the wizard defaults', () => {
    const back = cleanerRowsToDraft({ full_name: null, avatar_url: null }, {})
    expect(back).toMatchObject({ name: '', rate: '75', duration: '3', maxDuration: '5', radius: '10', freqType: 'num', freqVal: 3, services: [] })
    expect(cleanerRowsToDraft(null, null).name).toBe('')
  })
})

describe('customer draft', () => {
  const good = { ...EMPTY_CUSTOMER_DRAFT, firstName: 'Dana', lastName: 'Cohen', localityId: '22222222-2222-4222-8222-222222222222' }

  it('needs first name, last name and town only on submit', () => {
    expect(validateCustomerDraft({ ...EMPTY_CUSTOMER_DRAFT, firstName: 'Dana' }, opts(false)).firstName).toBe('Dana')
    expect(() => validateCustomerDraft(EMPTY_CUSTOMER_DRAFT, opts(true))).toThrow('first and last name')
    expect(() => validateCustomerDraft({ ...good, localityId: null }, opts(true))).toThrow('choose your town')
    expect(validateCustomerDraft(good, opts(true)).lastName).toBe('Cohen')
  })
  it('rejects invalid choices and numbers', () => {
    expect(() => validateCustomerDraft({ ...good, homeType: 'castle' }, opts(false))).toThrow(DraftError)
    expect(() => validateCustomerDraft({ ...good, petTypes: ['dragon'] }, opts(false))).toThrow(DraftError)
    expect(() => validateCustomerDraft({ ...good, bedrooms: '-1' }, opts(false))).toThrow(DraftError)
    expect(() => validateCustomerDraft({ ...good, sizeSqm: '99999' }, opts(false))).toThrow(DraftError)
    expect(() => validateCustomerDraft({ ...good, homeInstructions: 'x'.repeat(2001) }, opts(false))).toThrow(DraftError)
  })
  it('keeps full_name as "first last", and drops pet details when there are no pets', () => {
    const rows = customerDraftToRows(validateCustomerDraft({ ...good, languages: ['Hebrew'], languagesOther: 'English ,', petTypes: [], numPets: '2', petNote: 'friendly' }, opts(true)), place)
    expect(rows.profile.full_name).toBe('Dana Cohen')
    expect(rows.customer).toMatchObject({ languages: ['Hebrew', 'English'], num_pets: null, pet_note: null, address: 'בית הלל', lat: 33.2, lng: 35.6 })
  })
  it('round-trips the host answers', () => {
    const d = validateCustomerDraft({ ...good, phone: '050', homeType: 'villa', bedrooms: '3', petTypes: ['dog'], numPets: '1', petNote: 'shy', frequency: 'weekly', cleaningType: 'deep', priorities: ['kitchen', 'other'], priorityOtherText: 'Balcony', homeInstructions: 'No bleach' }, opts(true))
    const rows = customerDraftToRows(d, place)
    const back = customerRowsToDraft(rows.profile, { ...rows.customer, locality_id: d.localityId })
    expect(back).toMatchObject({ firstName: 'Dana', lastName: 'Cohen', phone: '050', homeType: 'villa', bedrooms: '3', petTypes: ['dog'], numPets: '1', petNote: 'shy', frequency: 'weekly', cleaningType: 'deep', priorities: ['kitchen', 'other'], priorityOtherText: 'Balcony', homeInstructions: 'No bleach', localityId: d.localityId, area: '' })
  })
  it('a brand-new account fills the name from the profile when the host columns are empty', () => {
    expect(customerRowsToDraft({ full_name: 'Dana Cohen', phone: null, avatar_url: null }, {})).toMatchObject({ firstName: 'Dana', lastName: 'Cohen' })
  })
})
