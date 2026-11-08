import { sendReminders } from './reminders'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

// Chainable stand-in: `from(table)` answers by table, recording notification inserts.
function fakeAdmin(opts: { localityId: string | null; placeError?: boolean; needs?: 'empty' | 'filled' | 'error'; unfinished?: boolean }) {
  const inserted: Record<string, unknown>[] = []
  const chain = (data: unknown, error: unknown = null) => {
    const c: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'neq', 'gt', 'lt', 'in', 'is']) c[m] = () => c
    c.maybeSingle = () => Promise.resolve({ data, error })
    c.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res)
    return c
  }
  return {
    inserted,
    client: {
      from: (table: string) => {
        if (table === 'notifications') {
          return { upsert: (rows: Record<string, unknown>[]) => { inserted.push(...rows); return Promise.resolve({ error: null }) } }
        }
        if (table === 'profiles') {
          return chain({ onboarding_completed_at: opts.unfinished ? null : '2026-01-01T00:00:00Z' })
        }
        if (table === 'customers' || table === 'cleaners') {
          if (opts.placeError) return chain(null, { message: 'column locality_id does not exist' })
          const needs = opts.needs ?? 'filled'
          if (needs === 'error') return chain(null, { message: 'column household_type does not exist' })
          return chain({
            locality_id: opts.localityId,
            household_type: needs === 'filled' ? 'family' : null,
            usage_frequency: null, typical_hours: null, preferred_days: [], flexibility: null, extra_note: null,
          })
        }
        return chain(null)
      },
    },
  }
}

describe('sendReminders — choose your area', () => {
  it('asks a host without a locality to pick one, once (dedupe key per user)', async () => {
    const { client, inserted } = fakeAdmin({ localityId: null })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)
    await sendReminders('host-1', 'host')
    expect(inserted).toEqual([expect.objectContaining({ user_id: 'host-1', kind: 'choose_area', href: '/profile?edit=1', dedupe_key: 'choose_area:host-1' })])
  })

  it('sends a cleaner to their own profile', async () => {
    const { client, inserted } = fakeAdmin({ localityId: null })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)
    await sendReminders('c-1', 'cleaner')
    expect(inserted[0]).toMatchObject({ kind: 'choose_area', href: '/cleaner/profile?edit=1' })
  })

  it('says nothing to someone who already picked, or when the column is not there yet', async () => {
    for (const opts of [{ localityId: 'loc-1' }, { localityId: null, placeError: true }]) {
      const { client, inserted } = fakeAdmin(opts)
      ;(createAdminClient as jest.Mock).mockReturnValue(client)
      await sendReminders('host-1', 'host')
      expect(inserted.filter((r) => r.kind === 'choose_area')).toHaveLength(0)
    }
  })
})

describe('sendReminders — fill in the new household details', () => {
  const run = async (opts: Parameters<typeof fakeAdmin>[0], role: 'host' | 'cleaner' = 'host') => {
    const { client, inserted } = fakeAdmin(opts)
    ;(createAdminClient as jest.Mock).mockReturnValue(client)
    await sendReminders('host-1', role)
    return inserted.filter((r) => r.kind === 'complete_host_profile')
  }

  it('asks an existing host who answered none of them, once (dedupe key)', async () => {
    expect(await run({ localityId: 'loc-1', needs: 'empty' })).toEqual([
      expect.objectContaining({ user_id: 'host-1', href: '/profile?edit=1', dedupe_key: 'complete_host_profile:host-1' }),
    ])
  })

  it('says nothing once any answer exists, mid-sign-up, to cleaners, or without migration 0045', async () => {
    expect(await run({ localityId: 'loc-1', needs: 'filled' })).toHaveLength(0)
    expect(await run({ localityId: 'loc-1', needs: 'empty', unfinished: true })).toHaveLength(0)
    expect(await run({ localityId: 'loc-1', needs: 'empty' }, 'cleaner')).toHaveLength(0)
    expect(await run({ localityId: 'loc-1', needs: 'error' })).toHaveLength(0)
  })
})
