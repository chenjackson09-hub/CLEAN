const ID = '11111111-1111-4111-8111-111111111111'

const m = {
  user: { id: 'admin-1' } as { id: string } | null,
  role: 'admin',
  row: { id: ID, cindy_verified_at: null } as { id: string; cindy_verified_at: string | null } | null,
  readError: null as unknown,
  updates: [] as unknown[],
  logs: [] as unknown[],
  notified: [] as unknown[],
}

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/notifications', () => ({ notify: async (_c: unknown, n: unknown) => { m.notified.push(n) } }))
jest.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => m.user,
  createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: m.role } }) }) }) }) }),
}))
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => ({ data: m.row, error: m.readError })
      q.update = (v: unknown) => { m.updates.push({ table, ...(v as object) }); return { eq: async () => ({ error: null }) } }
      q.insert = async (v: unknown) => { m.logs.push(v); return { error: null } }
      return q
    },
  }),
}))

import { setCindyVerified } from './verification'

beforeEach(() => {
  m.user = { id: 'admin-1' }; m.role = 'admin'; m.row = { id: ID, cindy_verified_at: null }; m.readError = null
  m.updates = []; m.logs = []; m.notified = []
})

describe('setCindyVerified', () => {
  it('only an admin can verify anybody, and nothing is written otherwise', async () => {
    m.role = 'customer'
    expect(await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })).toEqual({ error: 'Unauthorized' })
    m.role = 'cleaner'
    expect(await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })).toEqual({ error: 'Unauthorized' })
    m.user = null
    expect(await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })).toEqual({ error: 'Not authenticated' })
    expect(m.updates).toEqual([])
    expect(m.notified).toEqual([])
  })

  it('rejects a bad person or id', async () => {
    expect((await setCindyVerified({ kind: 'admin' as never, id: ID, verified: true })).error).toBe('Invalid person')
    expect((await setCindyVerified({ kind: 'cleaner', id: 'nope', verified: true })).error).toBe('Invalid person')
    expect(m.updates).toEqual([])
  })

  it('verifies: records who and when, logs it, and tells the person once', async () => {
    const res = await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })
    expect(res.success).toBe(true)
    expect(res.verifiedAt).toEqual(expect.any(String))
    expect(m.updates).toEqual([expect.objectContaining({ table: 'cleaners', cindy_verified_by: 'admin-1', cindy_verified_at: expect.any(String) })])
    expect(m.logs).toEqual([expect.objectContaining({ action: 'cindy_verify', target_type: 'cleaner', target_id: ID, admin_id: 'admin-1' })])
    expect(m.notified).toEqual([expect.objectContaining({ userId: ID, kind: 'cindy_verified', href: '/cleaner/preview', dedupeKey: `cindy_verified:${ID}` })])
  })

  it('works for a host and links the notification to their own profile', async () => {
    await setCindyVerified({ kind: 'customer', id: ID, verified: true })
    expect(m.updates[0]).toMatchObject({ table: 'customers' })
    expect(m.notified[0]).toMatchObject({ href: '/profile' })
  })

  it('removes the badge silently', async () => {
    m.row = { id: ID, cindy_verified_at: '2026-10-01T00:00:00Z' }
    const res = await setCindyVerified({ kind: 'cleaner', id: ID, verified: false })
    expect(res).toEqual({ success: true, verifiedAt: null })
    expect(m.updates[0]).toMatchObject({ cindy_verified_at: null, cindy_verified_by: null })
    expect(m.logs[0]).toMatchObject({ action: 'cindy_unverify' })
    expect(m.notified).toEqual([])
  })

  it('does nothing when the person is already in the requested state', async () => {
    m.row = { id: ID, cindy_verified_at: '2026-10-01T00:00:00Z' }
    expect(await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })).toEqual({ success: true, verifiedAt: '2026-10-01T00:00:00Z' })
    expect(m.updates).toEqual([])
    expect(m.notified).toEqual([])
  })

  it('says to run the migration when the columns are missing, and 404s an unknown person', async () => {
    m.readError = { message: 'column does not exist' }
    expect((await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })).error).toMatch(/migration/)
    m.readError = null; m.row = null
    expect(await setCindyVerified({ kind: 'cleaner', id: ID, verified: true })).toEqual({ error: 'Person not found' })
  })
})
