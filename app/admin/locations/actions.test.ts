const ID = '11111111-1111-4111-8111-111111111111'
const ID2 = '22222222-2222-4222-8222-222222222222'

const mocks = {
  user: { id: 'admin-1' } as { id: string } | null,
  role: 'admin' as string,
  writes: [] as string[],
  overrides: [] as unknown[],
}

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/notifications', () => ({ notify: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => mocks.user,
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: mocks.role } }) }) }) }),
  }),
}))

function chain(table: string) {
  const q: Record<string, unknown> = {}
  const result = { data: [], error: null }
  q.select = () => q
  q.in = () => q
  q.eq = () => q
  q.limit = () => q
  q.returns = () => Promise.resolve(result)
  q.maybeSingle = async () => ({ data: null })
  q.upsert = (rows: unknown) => { mocks.writes.push(`upsert:${table}`); if (table === 'locality_overrides') mocks.overrides = rows as unknown[]; return Promise.resolve({ error: null }) }
  q.delete = () => { mocks.writes.push(`delete:${table}`); return q }
  q.insert = () => { mocks.writes.push(`insert:${table}`); return Promise.resolve({ error: null }) }
  q.update = () => { mocks.writes.push(`update:${table}`); return q }
  // awaiting the builder itself (select/in/delete chains)
  q.then = (resolve: (v: unknown) => unknown) => resolve(result)
  return q
}
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => chain(t) }) }))

import { setLocalityStatus, createRegion, assignToRegion, setRegionActive, undoLocationChange } from './actions'

beforeEach(() => {
  mocks.user = { id: 'admin-1' }
  mocks.role = 'admin'
  mocks.writes = []
  mocks.overrides = []
})

describe('authorization', () => {
  it.each([
    ['setLocalityStatus', () => setLocalityStatus({ ids: [ID], status: 'open' })],
    ['createRegion', () => createRegion({ name: 'North' })],
    ['assignToRegion', () => assignToRegion({ ids: [ID], regionId: null })],
    ['setRegionActive', () => setRegionActive({ regionId: ID, active: true })],
    ['undoLocationChange', () => undoLocationChange(ID)],
  ])('%s refuses a non-admin and writes nothing', async (_n, run) => {
    mocks.role = 'customer'
    expect(await run()).toEqual({ error: 'Unauthorized' })
    expect(mocks.writes).toEqual([])
  })

  it('refuses a signed-out caller', async () => {
    mocks.user = null
    expect(await setLocalityStatus({ ids: [ID], status: 'open' })).toEqual({ error: 'Not authenticated' })
    expect(mocks.writes).toEqual([])
  })
})

describe('setLocalityStatus', () => {
  it('rejects an unknown status and bad ids', async () => {
    expect(await setLocalityStatus({ ids: [ID], status: 'coming_soon' })).toEqual({ error: 'Invalid status' })
    expect(await setLocalityStatus({ ids: ['nope'], status: 'open' })).toEqual({ error: 'Nothing selected' })
    expect(mocks.writes).toEqual([])
  })
  it('caps a bulk change', async () => {
    const many = Array.from({ length: 501 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
    expect((await setLocalityStatus({ ids: many, status: 'open' })).error).toMatch(/at most 500/)
  })
  it('writes an explicit open setting once per place and logs it for undo', async () => {
    const res = await setLocalityStatus({ ids: [ID, ID2, ID], status: 'open' })
    expect(res.success).toBe(true)
    expect(res.changed).toBe(2)
    expect(mocks.overrides).toEqual([
      expect.objectContaining({ locality_id: ID, is_active: true, status: 'open' }),
      expect.objectContaining({ locality_id: ID2, is_active: true, status: 'open' }),
    ])
    expect(mocks.writes).toContain('insert:admin_action_log')
  })
  it("'closed' writes is_active=false; 'inherit' writes no setting of its own", async () => {
    await setLocalityStatus({ ids: [ID], status: 'closed' })
    expect(mocks.overrides).toEqual([expect.objectContaining({ is_active: false, status: 'not_open' })])
    mocks.writes = []
    mocks.overrides = []
    await setLocalityStatus({ ids: [ID], status: 'inherit' })
    expect(mocks.overrides).toEqual([])
    expect(mocks.writes).not.toContain('upsert:locality_overrides')
  })
})

describe('regions', () => {
  it('validates the region name', async () => {
    expect((await createRegion({ name: ' ' })).error).toMatch(/name/)
    expect((await createRegion({ name: 'x'.repeat(61) })).error).toMatch(/name/)
  })
  it('rejects a malformed region id', async () => {
    expect(await setRegionActive({ regionId: 'nope', active: true })).toEqual({ error: 'Invalid region' })
    expect(await assignToRegion({ ids: [ID], regionId: 'nope' })).toEqual({ error: 'Invalid region' })
  })
})
