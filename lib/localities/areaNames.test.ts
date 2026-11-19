import { areaFor, fetchCleanerAreas, fetchCustomerAreas } from './areaNames'

// A tiny fake: `owners` are the rows of customers/cleaners, `localities` the places.
function fake(owners: Record<string, { id: string; locality_id: string | null }[]>, localities: { id: string; name_he: string; name_en: string | null; name_en_display?: string | null }[]) {
  const tables: string[] = []
  const admin = {
    from: (table: string) => {
      tables.push(table)
      return {
        select: () => ({
          in: () => Promise.resolve({ data: table === 'localities' ? localities : owners[table] ?? [], error: null }),
        }),
      }
    },
  }
  return { admin, tables }
}

describe('areaFor', () => {
  const area = { he: 'בית הלל', en: 'Beit Hillel' }
  it('gives the Hebrew name in Hebrew and the English spelling in English', () => {
    expect(areaFor(area, 'he')).toBe('בית הלל')
    expect(areaFor(area, 'en')).toBe('Beit Hillel')
  })
  it('falls back to what the person typed when no town was chosen', () => {
    expect(areaFor(null, 'en', 'Somewhere')).toBe('Somewhere')
    expect(areaFor(undefined, 'he')).toBe('')
  })
})

describe('fetchCleanerAreas / fetchCustomerAreas', () => {
  const places = [{ id: 'L1', name_he: 'בית הלל', name_en: 'Bet Hillel', name_en_display: 'Beit Hillel' }]
  it('reads cleaners from the cleaners table, preferring the display spelling', async () => {
    const { admin, tables } = fake({ cleaners: [{ id: 'c1', locality_id: 'L1' }, { id: 'c2', locality_id: null }] }, places)
    const map = await fetchCleanerAreas(admin as never, ['c1', 'c2'])
    expect(tables[0]).toBe('cleaners')
    expect(map.get('c1')).toEqual({ he: 'בית הלל', en: 'Beit Hillel' })
    expect(map.has('c2')).toBe(false)
  })
  it('reads hosts from the customers table', async () => {
    const { admin, tables } = fake({ customers: [{ id: 'h1', locality_id: 'L1' }] }, places)
    expect((await fetchCustomerAreas(admin as never, ['h1'])).get('h1')?.en).toBe('Beit Hillel')
    expect(tables[0]).toBe('customers')
  })
  it('falls back to the official English name, then the Hebrew one', async () => {
    const { admin } = fake({ cleaners: [{ id: 'c1', locality_id: 'L2' }, { id: 'c2', locality_id: 'L3' }] }, [
      { id: 'L2', name_he: 'יובל', name_en: 'Yuval' },
      { id: 'L3', name_he: 'שניר', name_en: null },
    ])
    const map = await fetchCleanerAreas(admin as never, ['c1', 'c2'])
    expect(map.get('c1')?.en).toBe('Yuval')
    expect(map.get('c2')?.en).toBe('שניר')
  })
  it('returns an empty map for no ids, and never throws', async () => {
    expect((await fetchCleanerAreas({} as never, [])).size).toBe(0)
    expect((await fetchCleanerAreas({ from: () => { throw new Error('down') } } as never, ['c1'])).size).toBe(0)
  })
})
