import { normalizeHe, normalizeEn, normalizeQuery } from './normalize'
import { localityTypeFor, isResidential, regionalCouncilFrom, parseItmCoordinates, isPlausibleIsraelCoordinate } from './cbs'
import { itmToWgs84 } from './itm'

describe('Hebrew keys', () => {
  it('treats the two spellings of Kiryat as one', () => {
    expect(normalizeHe('קריית שמונה')).toBe(normalizeHe('קרית שמונה'))
  })
  it('ignores niqqud, quotes and hyphens', () => {
    expect(normalizeHe('ניר ח"ן')).toBe('ניר חן')
    expect(normalizeHe('בֵּית הלל')).toBe('בית הלל')
    expect(normalizeHe('מודיעין-מכבים-רעות')).toBe('מודיעין מכבים רעות')
  })
})

describe('English keys', () => {
  it('matches Bet / Beit, Kefar / Kfar, Qiryat / Kiryat', () => {
    expect(normalizeEn('Bet Hillel')).toBe(normalizeEn('Beit Hillel'))
    expect(normalizeEn('Kefar Blum')).toBe(normalizeEn('Kfar Blum'))
    expect(normalizeEn('Qiryat Shemona')).toBe('kiryat shemona')
    expect(normalizeEn('Sede Nehemya')).toBe(normalizeEn('Sde Nehemia').replace('nehemia', 'nehemya'))
  })
  it('matches Barukh / Baruch and ignores apostrophes', () => {
    expect(normalizeEn("Ma'yan Barukh")).toBe(normalizeEn('Mayan Baruch'))
  })
  it('picks the right key by script', () => {
    expect(normalizeQuery('בית')).toEqual({ script: 'he', key: 'בית' })
    expect(normalizeQuery('Beit').script).toBe('en')
  })
})

describe('official file helpers', () => {
  it('maps only verified settlement-form codes to a type', () => {
    expect(localityTypeFor(310)).toBe('moshav') // Beit Hillel
    expect(localityTypeFor(330)).toBe('kibbutz') // Kfar Blum
    expect(localityTypeFor(190)).toBe('local_council') // Metula
    expect(localityTypeFor(370)).toBe('community')
    expect(localityTypeFor(350)).toBe('other') // unverified → not guessed
    expect(localityTypeFor(null)).toBe('other')
    expect(localityTypeFor(190, 'עירייה')).toBe('city')
  })
  it('leaves out industrial zones and administrative areas', () => {
    expect(isResidential(520)).toBe(false)
    expect(isResidential(530)).toBe(false)
    expect(isResidential(310)).toBe(true)
  })
  it('extracts the regional council', () => {
    expect(regionalCouncilFrom('מועצה אזורית מבואות החרמון')).toBe('מבואות החרמון')
    expect(regionalCouncilFrom('מועצה מקומית')).toBeNull()
  })
  it('splits the 12-digit coordinate and refuses bad values', () => {
    expect(parseItmCoordinates(256874790404)).toEqual({ x: 256874, y: 790404 })
    expect(parseItmCoordinates(null)).toBeNull()
    expect(parseItmCoordinates('abc')).toBeNull()
  })
  it('converts Israeli grid coordinates to the right place (Beit Hillel ≈ 33.208, 35.606)', () => {
    const { lat, lng } = itmToWgs84(256874, 790404)
    expect(lat).toBeCloseTo(33.2085, 2)
    expect(lng).toBeCloseTo(35.6058, 2)
    expect(isPlausibleIsraelCoordinate(lat, lng)).toBe(true)
    expect(isPlausibleIsraelCoordinate(0, 0)).toBe(false)
  })
})
