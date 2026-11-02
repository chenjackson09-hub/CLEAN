import { homePhotoLinksForCleaner } from './homePhotosForCleaner'

const HOST = '11111111-1111-4111-8111-111111111111'
const A = `${HOST}/22222222-2222-4222-8222-222222222222.jpg`
const B = `${HOST}/33333333-3333-4333-8333-333333333333.jpg`

const admin = (paths: string[] | null, error: unknown = null) => {
  let signCalls = 0
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: paths ? { home_photos: paths } : null, error }) }) }) }),
    storage: { from: () => ({ createSignedUrls: async (p: string[]) => { signCalls++; return { data: p.map((x) => ({ path: x, signedUrl: `https://signed/${x}` })) } } }) },
  }
  return { client: client as never, signCalls: () => signCalls }
}

describe('homePhotoLinksForCleaner', () => {
  it('gives links while the cleaner has a live request from this host', async () => {
    const a = admin([A, B])
    expect(await homePhotoLinksForCleaner(a.client, HOST, [{ status: 'accepted' }])).toEqual([`https://signed/${A}`, `https://signed/${B}`])
  })
  it('gives nothing - and does not even look - when the request is declined/cancelled or there is none', async () => {
    const a = admin([A])
    expect(await homePhotoLinksForCleaner(a.client, HOST, [{ status: 'declined' }, { status: 'cancelled' }])).toEqual([])
    expect(await homePhotoLinksForCleaner(a.client, HOST, [])).toEqual([])
    expect(a.signCalls()).toBe(0)
  })
  it('ignores any stored path outside the host\'s own folder', async () => {
    const a = admin([A, 'someone-else/44444444-4444-4444-8444-444444444444.jpg'])
    expect(await homePhotoLinksForCleaner(a.client, HOST, [{ status: 'completed' }])).toEqual([`https://signed/${A}`])
  })
  it('fails open to no photos on any error', async () => {
    expect(await homePhotoLinksForCleaner(admin(null, { message: 'no column' }).client, HOST, [{ status: 'accepted' }])).toEqual([])
  })
})
