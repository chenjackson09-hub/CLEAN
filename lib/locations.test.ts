import { activeCard, CARD_FILTER, districtLabel, hasActiveFilters, isSetStatus, localityName, parseFilters } from './locations'

describe('parseFilters', () => {
  it('defaults to the manage tab sorted by customers', () => {
    const f = parseFilters({})
    expect(f).toMatchObject({ tab: 'manage', q: '', status: '', users: '', sort: 'customers', dir: 'desc', page: 1 })
    expect(hasActiveFilters(f)).toBe(false)
  })
  it('ignores junk values', () => {
    const f = parseFilters({ status: 'weird', users: 'x', sort: 'drop table', region: 'not-a-uuid', page: '-3' })
    expect(f).toMatchObject({ status: '', users: '', sort: 'customers', region: '', page: 1 })
  })
  it('keeps valid filters', () => {
    const f = parseFilters({ status: 'open', users: 'waiting_customers', sort: 'name', dir: 'asc', page: '3', tab: 'regions' })
    expect(f).toMatchObject({ status: 'open', users: 'waiting_customers', sort: 'name', dir: 'asc', page: 3, tab: 'regions' })
  })
  it('puts the best search match first unless a sort was chosen', () => {
    expect(parseFilters({ q: 'snir' })).toMatchObject({ sort: 'relevance', dir: 'asc' })
    expect(parseFilters({ q: 'snir', sort: 'cleaners' }).sort).toBe('cleaners')
  })
  it('takes the first value of a repeated param', () => {
    expect(parseFilters({ status: ['closed', 'open'] }).status).toBe('closed')
  })
})

describe('summary cards', () => {
  it('each card maps to a filter that highlights that same card', () => {
    for (const key of Object.keys(CARD_FILTER) as (keyof typeof CARD_FILTER)[]) {
      const f = parseFilters({ ...CARD_FILTER[key] })
      expect(activeCard(f)).toBe(key)
    }
  })
  it('highlights nothing once a search, region or district narrows the table', () => {
    expect(activeCard(parseFilters({ q: 'x' }))).toBeNull()
    expect(activeCard(parseFilters({ district: 'הצפון' }))).toBeNull()
  })
  it('highlights nothing for a combination no card represents', () => {
    expect(activeCard(parseFilters({ status: 'open', users: 'cleaners' }))).toBeNull()
  })
})

describe('misc', () => {
  it('validates the settable statuses', () => {
    expect(isSetStatus('inherit')).toBe(true)
    expect(isSetStatus('coming_soon')).toBe(false)
  })
  it('labels districts in both languages', () => {
    expect(districtLabel('הצפון', 'en')).toBe('Northern District')
    expect(districtLabel('הצפון', 'he')).toBe('הצפון')
    expect(districtLabel(null, 'en')).toBe('—')
  })
  it('prefers the display spelling in English only', () => {
    const l = { name_he: 'בית הלל', name_en: 'Bet Hillel', name_en_display: 'Beit Hillel' }
    expect(localityName(l, 'en')).toBe('Beit Hillel')
    expect(localityName(l, 'he')).toBe('בית הלל')
    expect(localityName({ ...l, name_en_display: null }, 'en')).toBe('Bet Hillel')
  })
})
