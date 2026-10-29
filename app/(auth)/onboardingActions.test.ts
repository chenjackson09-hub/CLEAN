const USER = '11111111-1111-4111-8111-111111111111'

const m = {
  user: { id: USER, user_metadata: {} as Record<string, unknown> } as { id: string; user_metadata: Record<string, unknown> } | null,
  role: 'cleaner' as string | null,
  completedAt: null as string | null,
  completedError: false,
  rows: {} as Record<string, unknown>,
  writes: [] as { table: string; op: string; values: unknown }[],
  stepMeta: [] as unknown[],
}

jest.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => m.user,
  createClient: async () => ({
    from: (table: string) => {
      let cols = ''
      const q: Record<string, unknown> = {}
      q.select = (c: string) => { cols = c; return q }
      q.eq = () => q
      q.maybeSingle = async () => {
        if (table === 'profiles' && cols.includes('onboarding_completed_at')) return m.completedError ? { data: null, error: { message: 'no column' } } : { data: { onboarding_completed_at: m.completedAt }, error: null }
        if (table === 'profiles') return { data: m.role ? { role: m.role, full_name: 'Noa Rosen', phone: null, avatar_url: null } : null, error: null }
        return { data: m.rows[table] ?? null, error: null }
      }
      q.update = (values: unknown) => { m.writes.push({ table, op: 'update', values }); return { eq: async () => ({ error: null }) } }
      q.upsert = async (values: unknown) => { m.writes.push({ table, op: 'upsert', values }); return { error: null } }
      return q
    },
    auth: { updateUser: async (v: unknown) => { m.stepMeta.push(v); return { error: null } } },
  }),
}))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
jest.mock('@/lib/localities/resolve', () => ({
  getLocality: async (_c: unknown, id: string | null) => (id ? { id, name_he: 'בית הלל', name_en: 'Bet Hillel', locality_type: 'moshav', regional_council: null, lat: 33.2, lng: 35.6 } : null),
  resolvePlace: async (_c: unknown, i: { localityId?: string | null; street: string }) =>
    i.localityId ? { address: 'בית הלל', coords: { lat: 33.2, lng: 35.6 }, localityId: i.localityId, locationFound: true } : { address: i.street, coords: null, localityId: null, locationFound: false },
}))

import { loadOnboarding, saveOnboarding } from './onboardingActions'
import { EMPTY_CLEANER_DRAFT } from '@/lib/onboarding/cleaner'
import { EMPTY_CUSTOMER_DRAFT } from '@/lib/onboarding/customer'

const LOC = '22222222-2222-4222-8222-222222222222'
const cleanerDraft = { ...EMPTY_CLEANER_DRAFT, name: 'Noa Rosen', birthD: '5', birthM: '3', birthY: '1995', localityId: LOC, services: ['Deep cleaning'], matchTypes: ['recurring'] }

beforeEach(() => {
  m.user = { id: USER, user_metadata: {} }; m.role = 'cleaner'; m.completedAt = null; m.completedError = false
  m.rows = {}; m.writes = []; m.stepMeta = []
})

describe('saveOnboarding', () => {
  it('needs a signed-in person', async () => {
    m.user = null
    expect(await saveOnboarding({ role: 'cleaner', draft: cleanerDraft, step: 1, submit: false })).toEqual({ error: 'Please sign in again.' })
    expect(m.writes).toEqual([])
  })

  it('refuses to save a sign-up for a different account type', async () => {
    m.role = 'customer'
    expect(await saveOnboarding({ role: 'cleaner', draft: cleanerDraft, step: 1, submit: false })).toEqual({ error: 'This sign-up belongs to a different account type.' })
    expect(m.writes).toEqual([])
  })

  it('a mid-wizard save writes the answers and remembers the step, but does NOT finish the sign-up', async () => {
    expect(await saveOnboarding({ role: 'cleaner', draft: { ...EMPTY_CLEANER_DRAFT, name: 'Noa' }, step: 2, submit: false })).toEqual({ ok: true })
    expect(m.writes.find((w) => w.table === 'profiles')?.values).toMatchObject({ full_name: 'Noa' })
    expect(m.writes.some((w) => w.table === 'cleaners' && w.op === 'upsert')).toBe(true)
    expect(m.stepMeta).toEqual([{ data: { onboarding_step: 2 } }])
    expect(m.writes.some((w) => JSON.stringify(w.values).includes('onboarding_completed_at'))).toBe(false)
  })

  it('a submit is checked on the server and, when valid, marks the sign-up finished', async () => {
    expect(await saveOnboarding({ role: 'cleaner', draft: { ...cleanerDraft, services: [] }, step: 9, submit: true })).toEqual({ error: 'Please choose at least one type of cleaning' })
    expect(m.writes).toEqual([])
    expect(await saveOnboarding({ role: 'cleaner', draft: cleanerDraft, step: 9, submit: true })).toEqual({ ok: true })
    expect(m.writes.some((w) => w.table === 'profiles' && JSON.stringify(w.values).includes('onboarding_completed_at'))).toBe(true)
    expect(m.writes.some((w) => w.table === 'cleaners' && JSON.stringify(w.values).includes(LOC))).toBe(true) // locality link
    expect(m.stepMeta).toEqual([{ data: { onboarding_step: 0 } }])
  })

  it('works for a host, keeping full_name as "first last"', async () => {
    m.role = 'customer'
    const draft = { ...EMPTY_CUSTOMER_DRAFT, firstName: 'Dana', lastName: 'Cohen', localityId: LOC }
    expect(await saveOnboarding({ role: 'customer', draft, step: 1, submit: true })).toEqual({ ok: true })
    expect(m.writes.find((w) => w.table === 'profiles' && (w.values as { full_name?: string }).full_name)?.values).toMatchObject({ full_name: 'Dana Cohen' })
    expect(m.writes.some((w) => w.table === 'customers' && w.op === 'upsert')).toBe(true)
  })

  it('rejects a photo that is not in the person’s own folder', async () => {
    const res = await saveOnboarding({ role: 'cleaner', draft: { ...cleanerDraft, avatarUrl: 'https://evil.com/a.jpg' }, step: 1, submit: false })
    expect(res).toEqual({ error: 'Photo is not valid' })
    expect(m.writes).toEqual([])
  })

  it('rejects a role that is not cleaner or host', async () => {
    expect(await saveOnboarding({ role: 'admin' as never, draft: {}, step: 0, submit: false })).toEqual({ error: 'Something went wrong. Please try again.' })
  })
})

describe('loadOnboarding', () => {
  it('returns the saved answers and where to resume', async () => {
    m.user = { id: USER, user_metadata: { onboarding_step: 4 } }
    m.rows.cleaners = { hourly_rate: 90, cleaning_categories: ['Windows'], locality_id: LOC }
    const s = await loadOnboarding()
    expect('error' in s).toBe(false)
    if ('error' in s) return
    expect(s.role).toBe('cleaner')
    expect(s.step).toBe(4)
    expect(s.completed).toBe(false)
    expect(s.draft).toMatchObject({ name: 'Noa Rosen', rate: '90', services: ['Windows'], localityId: LOC })
    expect(s.locality).toMatchObject({ id: LOC, name_he: 'בית הלל' })
  })
  it('a brand-new account starts at step 0 with defaults', async () => {
    const s = await loadOnboarding()
    expect(s).toMatchObject({ role: 'cleaner', step: 0, completed: false })
  })
  it('a finished sign-up, or a database without the column, reads as completed', async () => {
    m.completedAt = '2026-10-01T00:00:00Z'
    expect(await loadOnboarding()).toMatchObject({ completed: true })
    m.completedAt = null; m.completedError = true
    expect(await loadOnboarding()).toMatchObject({ completed: true })
  })
  it('ignores a nonsense remembered step', async () => {
    m.user = { id: USER, user_metadata: { onboarding_step: 9999 } }
    expect(await loadOnboarding()).toMatchObject({ step: 0 })
  })
  it('needs a signed-in person with a cleaner or host account', async () => {
    m.user = null
    expect(await loadOnboarding()).toEqual({ error: 'Not signed in' })
    m.user = { id: USER, user_metadata: {} }; m.role = 'admin'
    expect('error' in (await loadOnboarding())).toBe(true)
  })
})
