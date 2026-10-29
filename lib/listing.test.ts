import { listingChecklist, onlyListed } from './listing'

describe('listingChecklist', () => {
  it('is listed only with a photo, a rate and an available day', () => {
    expect(listingChecklist({ avatarUrl: 'x.jpg', hourlyRate: 80, hasAvailableDay: true })).toEqual({ photo: true, rate: true, days: true, listed: true })
    expect(listingChecklist({ avatarUrl: null, hourlyRate: 80, hasAvailableDay: true }).listed).toBe(false)
    expect(listingChecklist({ avatarUrl: 'x.jpg', hourlyRate: 0, hasAvailableDay: true }).listed).toBe(false)
    expect(listingChecklist({ avatarUrl: 'x.jpg', hourlyRate: null, hasAvailableDay: true }).rate).toBe(false)
    expect(listingChecklist({ avatarUrl: 'x.jpg', hourlyRate: 80, hasAvailableDay: false }).listed).toBe(false)
  })
})

const admin = (result: { data: unknown; error: unknown }) =>
  ({ from: () => ({ select: () => ({ in: async () => result }) }) }) as never

describe('onlyListed', () => {
  const cleaners = [
    { id: 'a', hourly_rate: 80 },
    { id: 'b', hourly_rate: 0 },
    { id: 'c', hourly_rate: 90 },
  ]
  it('keeps cleaners with both a rate and a photo', async () => {
    const out = await onlyListed(admin({ data: [{ id: 'a', avatar_url: 'x' }, { id: 'c', avatar_url: null }], error: null }), cleaners)
    expect(out.map((c) => c.id)).toEqual(['a'])
  })
  it('does not hide anyone when the photos cannot be read', async () => {
    const out = await onlyListed(admin({ data: null, error: { message: 'boom' } }), cleaners)
    expect(out).toHaveLength(3)
  })
})
