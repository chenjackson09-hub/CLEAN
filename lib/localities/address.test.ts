import { composeAddress, chooseCoordinates } from './address'

const beitHillel = { name_he: 'בית הלל', name_en: 'Bet Hillel' }

describe('composeAddress', () => {
  it('is just the locality when there is no street', () => {
    expect(composeAddress('', beitHillel)).toBe('בית הלל')
  })
  it('adds the locality after a street', () => {
    expect(composeAddress('  12 Herzl ', beitHillel)).toBe('12 Herzl, בית הלל')
  })
  it('does not repeat a locality the street text already names (either language)', () => {
    expect(composeAddress('12 הרצל, בית הלל', beitHillel)).toBe('12 הרצל, בית הלל')
    expect(composeAddress('12 Herzl, Beit Hillel', beitHillel)).toBe('12 Herzl, Beit Hillel')
  })
  it('leaves a street alone when no locality is chosen', () => {
    expect(composeAddress('12 Herzl', null)).toBe('12 Herzl')
  })
})

describe('chooseCoordinates', () => {
  const loc = { lat: 33.2085, lng: 35.6058 }
  it('uses the locality when there is no street geocode', () => {
    expect(chooseCoordinates(loc, null)).toEqual({ coords: loc, source: 'locality' })
  })
  it('trusts a street geocode that lands near the locality', () => {
    const street = { lat: 33.2090, lng: 35.6070 }
    expect(chooseCoordinates(loc, street)).toEqual({ coords: street, source: 'street' })
  })
  it('ignores a street geocode in a different town', () => {
    const elsewhere = { lat: 32.0853, lng: 34.7818 } // Tel Aviv
    expect(chooseCoordinates(loc, elsewhere)).toEqual({ coords: loc, source: 'locality' })
  })
  it('falls back to the geocode only when there is no locality coordinate', () => {
    const g = { lat: 32.1, lng: 34.8 }
    expect(chooseCoordinates(null, g)).toEqual({ coords: g, source: 'geocode' })
    expect(chooseCoordinates(null, null)).toEqual({ coords: null, source: 'none' })
  })
})
