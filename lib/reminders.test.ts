import { sendReminders } from './reminders'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

// Chainable stand-in: `from(table)` answers by table, recording notification inserts.
function fakeAdmin(opts: { localityId: string | null; placeError?: boolean }) {
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
        if (table === 'customers' || table === 'cleaners') {
          return opts.placeError ? chain(null, { message: 'column locality_id does not exist' }) : chain({ locality_id: opts.localityId })
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
