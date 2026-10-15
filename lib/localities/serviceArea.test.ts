import { hostServiceArea } from './serviceArea'

type Row = Record<string, unknown> | null
// Minimal stand-in for the chained supabase query builder: each table maps to
// the row (or error) its maybeSingle() should resolve with.
function client(tables: Record<string, { row?: Row; error?: unknown }>, throws = false) {
  return {
    from(table: string) {
      if (throws) throw new Error('boom')
      const entry = tables[table] ?? { row: null }
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => ({ data: entry.row ?? null, error: entry.error ?? null })
      return q
    },
  } as never
}

describe('hostServiceArea', () => {
  it('is open when the host has not picked a locality yet', async () => {
    const c = client({ customers: { row: { locality_id: null } } })
    expect(await hostServiceArea(c, 'u1')).toEqual({ state: 'open' })
  })

  it('is open when the locality is active', async () => {
    const c = client({
      customers: { row: { locality_id: 'l1' } },
      locality_effective_availability: { row: { is_active: true } },
    })
    expect(await hostServiceArea(c, 'u1')).toEqual({ state: 'open' })
  })

  it('is closed, with the place name, when the locality is inactive', async () => {
    const c = client({
      customers: { row: { locality_id: 'l1' } },
      locality_effective_availability: { row: { is_active: false } },
      localities: { row: { name_he: 'חיפה', name_en: 'Haifa' } },
    })
    expect(await hostServiceArea(c, 'u1')).toEqual({ state: 'closed', nameHe: 'חיפה', nameEn: 'Haifa' })
  })

  it('fails open on a query error (e.g. migration not applied)', async () => {
    const c = client({ customers: { error: { message: 'column does not exist' } } })
    expect(await hostServiceArea(c, 'u1')).toEqual({ state: 'open' })
  })

  it('fails open when the availability row is missing or unreadable', async () => {
    const c = client({
      customers: { row: { locality_id: 'l1' } },
      locality_effective_availability: { error: { message: 'relation does not exist' } },
    })
    expect(await hostServiceArea(c, 'u1')).toEqual({ state: 'open' })
  })

  it('fails open when the client throws', async () => {
    expect(await hostServiceArea(client({}, true), 'u1')).toEqual({ state: 'open' })
  })
})
