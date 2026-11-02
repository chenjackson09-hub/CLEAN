import { cleanerMaySeeHomePhotos, isOwnHomePhotoPath } from './homePhotos'

const ME = '11111111-1111-4111-8111-111111111111'
const FILE = '22222222-2222-4222-8222-222222222222'

describe('isOwnHomePhotoPath', () => {
  it('accepts only my own folder and a uuid image file name', () => {
    expect(isOwnHomePhotoPath(`${ME}/${FILE}.jpg`, ME)).toBe(true)
    expect(isOwnHomePhotoPath(`${ME}/${FILE}.WEBP`, ME)).toBe(true)
  })
  it('rejects someone else\'s folder, traversal, odd names and non-strings', () => {
    expect(isOwnHomePhotoPath(`other/${FILE}.jpg`, ME)).toBe(false)
    expect(isOwnHomePhotoPath(`${ME}/../x/${FILE}.jpg`, ME)).toBe(false)
    expect(isOwnHomePhotoPath(`${ME}/${FILE}.svg`, ME)).toBe(false)
    expect(isOwnHomePhotoPath(`${ME}/notes.txt`, ME)).toBe(false)
    expect(isOwnHomePhotoPath(`${ME}/sub/${FILE}.jpg`, ME)).toBe(false)
    expect(isOwnHomePhotoPath(`${ME}/${FILE}.jpg?x=1`, ME)).toBe(false)
    expect(isOwnHomePhotoPath(null, ME)).toBe(false)
    expect(isOwnHomePhotoPath(42, ME)).toBe(false)
  })
})

describe('cleanerMaySeeHomePhotos', () => {
  const now = new Date('2026-11-02T12:00:00Z')
  it('is true while a request is live: pending (not yet expired), accepted or completed', () => {
    expect(cleanerMaySeeHomePhotos([{ status: 'pending', response_deadline: '2026-11-03T00:00:00Z' }], now)).toBe(true)
    expect(cleanerMaySeeHomePhotos([{ status: 'accepted' }], now)).toBe(true)
    expect(cleanerMaySeeHomePhotos([{ status: 'completed' }], now)).toBe(true)
  })
  it('ends with the request: declined, cancelled, or a pending one that ran out', () => {
    expect(cleanerMaySeeHomePhotos([{ status: 'declined' }, { status: 'cancelled' }], now)).toBe(false)
    expect(cleanerMaySeeHomePhotos([{ status: 'pending', response_deadline: '2026-11-01T00:00:00Z' }], now)).toBe(false)
    expect(cleanerMaySeeHomePhotos([], now)).toBe(false)
  })
  it('one live request among dead ones is enough', () => {
    expect(cleanerMaySeeHomePhotos([{ status: 'declined' }, { status: 'accepted' }], now)).toBe(true)
  })
})
