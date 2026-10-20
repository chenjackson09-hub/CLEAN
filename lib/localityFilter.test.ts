import { readLocalityFilter } from './localityFilter'

const ID = '11111111-1111-4111-8111-111111111111'
const client = (row: unknown) =>
  ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }) }) as never

describe('readLocalityFilter', () => {
  const row = { name_he: 'בית הלל', name_en: 'Bet Hillel', name_en_display: 'Beit Hillel' }
  it('ignores a missing or malformed id', async () => {
    expect(await readLocalityFilter(client(row), {}, '/admin/customers')).toBeNull()
    expect(await readLocalityFilter(client(row), { locality: "x' or 1=1" }, '/admin/customers')).toBeNull()
  })
  it('returns null when the locality does not exist', async () => {
    expect(await readLocalityFilter(client(null), { locality: ID }, '/admin/customers')).toBeNull()
  })
  it('keeps only same-site Locations back links', async () => {
    const ok = await readLocalityFilter(client(row), { locality: ID, back: '/admin/locations?q=snir&status=open' }, '/admin/customers')
    expect(ok?.backHref).toBe('/admin/locations?q=snir&status=open')
    for (const bad of ['https://evil.com', '//evil.com', '/admin/customers', '/admin/locations.evil.com', 'javascript:alert(1)']) {
      expect((await readLocalityFilter(client(row), { locality: ID, back: bad }, '/admin/customers'))?.backHref).toBeNull()
    }
  })
})
