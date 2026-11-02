const USER = '11111111-1111-4111-8111-111111111111'
const F1 = `${USER}/22222222-2222-4222-8222-222222222222.jpg`
const F2 = `${USER}/33333333-3333-4333-8333-333333333333.jpg`

const m = {
  user: { id: USER } as { id: string } | null,
  stored: [] as string[],
  readError: false,
  signMissing: false,
  updates: [] as string[][],
  removed: [] as string[][],
}

jest.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => m.user,
  createClient: async () => ({
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => (m.readError ? { data: null, error: { message: 'no column' } } : { data: { home_photos: m.stored }, error: null })
      q.update = (v: { home_photos: string[] }) => ({ eq: async () => { m.updates.push(v.home_photos); m.stored = v.home_photos; return { error: null } } })
      return q
    },
    storage: { from: () => ({ createSignedUrls: async (p: string[]) => ({ data: m.signMissing ? [] : p.map((x) => ({ path: x, signedUrl: `https://signed/${x}` })) }) }) },
  }),
}))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ storage: { from: () => ({ remove: async (p: string[]) => { m.removed.push(p); return { error: null } } }) } }) }))

import { addHomePhoto, listMyHomePhotos, removeHomePhoto } from './homePhotos'

beforeEach(() => { m.user = { id: USER }; m.stored = []; m.readError = false; m.signMissing = false; m.updates = []; m.removed = [] })

describe('home photo actions', () => {
  it('need a signed-in person', async () => {
    m.user = null
    expect(await listMyHomePhotos()).toEqual({ error: 'Please sign in again.' })
    expect(await addHomePhoto(F1)).toEqual({ error: 'Please sign in again.' })
    expect(await removeHomePhoto(F1)).toEqual({ error: 'Please sign in again.' })
  })

  it('lists my photos with signed links, and shows none (not an error) before the migration', async () => {
    m.stored = [F1, F2]
    expect(await listMyHomePhotos()).toEqual({ ok: true, photos: [{ path: F1, url: `https://signed/${F1}` }, { path: F2, url: `https://signed/${F2}` }] })
    m.readError = true
    expect(await listMyHomePhotos()).toEqual({ ok: true, photos: [] })
  })

  it('adds a photo that exists in my own folder', async () => {
    const res = await addHomePhoto(F1)
    expect(res).toEqual({ ok: true, photos: [{ path: F1, url: `https://signed/${F1}` }] })
    expect(m.updates).toEqual([[F1]])
  })

  it('refuses a path in someone else\'s folder or one that is not a photo file', async () => {
    expect(await addHomePhoto('someone-else/22222222-2222-4222-8222-222222222222.jpg')).toEqual({ error: 'That photo could not be added.' })
    expect(await addHomePhoto(`${USER}/../etc.jpg`)).toEqual({ error: 'That photo could not be added.' })
    expect(await removeHomePhoto('someone-else/22222222-2222-4222-8222-222222222222.jpg')).toEqual({ error: 'That photo could not be removed.' })
    expect(m.updates).toEqual([])
  })

  it('refuses a file that was never uploaded (it cannot be signed)', async () => {
    m.signMissing = true
    expect(await addHomePhoto(F1)).toEqual({ error: 'That photo could not be added.' })
    expect(m.updates).toEqual([])
  })

  it('stops at six photos', async () => {
    m.stored = [1, 2, 3, 4, 5, 6].map((n) => `${USER}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}.jpg`)
    expect(await addHomePhoto(F1)).toEqual({ error: 'You can add up to 6 photos.' })
    expect(m.updates).toEqual([])
  })

  it('adding the same photo twice does not duplicate it', async () => {
    m.stored = [F1]
    const res = await addHomePhoto(F1)
    expect(res).toMatchObject({ ok: true })
    expect(m.updates).toEqual([])
  })

  it('removes a photo from the profile and deletes the file', async () => {
    m.stored = [F1, F2]
    const res = await removeHomePhoto(F1)
    expect(res).toEqual({ ok: true, photos: [{ path: F2, url: `https://signed/${F2}` }] })
    expect(m.removed).toEqual([[F1]])
  })
})
