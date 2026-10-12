import { rankLocalities } from './search'
import { normalizeEn, normalizeHe } from './normalize'

const loc = (id: string, he: string, en: string, population = 1000) => ({
  id, cbs_code: Number(id), name_he: he, name_en: en, locality_type: 'moshav', regional_council: null, lat: 33, lng: 35, population,
  search_he: normalizeHe(he), search_en: normalizeEn(en),
})
const all = [
  loc('1', 'בית הלל', 'Bet Hillel'),
  loc('2', 'בית שאן', 'Bet She\'an', 20000),
  loc('3', 'בית זרע', 'Bet Zera'),
  loc('4', 'קריית שמונה', 'Qiryat Shemona', 23000),
  loc('5', 'כפר בלום', 'Kefar Blum'),
  loc('6', 'הלל', 'Hillel'),
]
const names = (q: string) => rankLocalities(all, q).map((r) => r.name_he)

describe('locality search', () => {
  it('finds the same place in Hebrew and English', () => {
    expect(names('בית הלל')[0]).toBe('בית הלל')
    expect(names('Beit Hillel')[0]).toBe('בית הלל')
    expect(names('Bet Hillel')[0]).toBe('בית הלל')
  })
  it('suggests as you type, in either language', () => {
    expect(names('בית')).toEqual(expect.arrayContaining(['בית הלל', 'בית שאן', 'בית זרע']))
    expect(names('Beit')).toEqual(expect.arrayContaining(['בית הלל', 'בית שאן', 'בית זרע']))
  })
  it('resolves spelling variants to the one record', () => {
    expect(names('קרית שמונה')[0]).toBe('קריית שמונה')
    expect(names('Kiryat Shmona')).toContain('קריית שמונה')
    expect(names('Kfar Blum')[0]).toBe('כפר בלום')
  })
  it('puts a whole-name match first and prefers bigger places among equals', () => {
    expect(names('בית')[0]).toBe('בית שאן') // prefix matches; largest population first
    expect(names('הלל')[0]).toBe('הלל') // exact beats "word in a longer name"
  })
  it('returns each locality once and caps the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => loc(String(100 + i), `בית ${i}`, `Bet ${i}`))
    const r = rankLocalities(many, 'בית')
    expect(r).toHaveLength(8)
    expect(new Set(r.map((x) => x.id)).size).toBe(8)
  })
  it('matches an alias an admin added', () => {
    const withAlias = [{ ...loc('9', 'מעיין ברוך', "Ma'yan Barukh"), alias_keys: [normalizeEn('Maayan Baruch')] }]
    expect(rankLocalities(withAlias, 'Maayan Baruch').map((r) => r.id)).toEqual(['9'])
  })

  it('orders look-alikes by how close the whole name is', () => {
    const near = [loc('1', 'שדה נחום', 'Sede Nahum'), loc('2', 'שדה נחמיה', 'Sede Nehemya')]
    expect(rankLocalities(near, 'Sde Nehemia')[0].name_he).toBe('שדה נחמיה')
    const prefix = [loc('3', 'בית חלקיה', 'Bet Hilqiyya'), loc('4', 'בית הלל', 'Bet Hillel')]
    expect(rankLocalities(prefix, 'Bet Hil')[0].name_he).toBe('בית הלל')
  })
})
