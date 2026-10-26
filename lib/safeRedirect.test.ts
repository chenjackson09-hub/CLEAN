import { safeNextPath } from './safeRedirect'

describe('safeNextPath', () => {
  it('accepts same-site paths with a query', () => {
    expect(safeNextPath('/bookings?booking=abc-123')).toBe('/bookings?booking=abc-123')
    expect(safeNextPath('/cleaner/dashboard?booking=abc')).toBe('/cleaner/dashboard?booking=abc')
  })
  it.each([
    ['https://evil.com'],
    ['//evil.com'],
    ['/\\evil.com'],
    ['javascript:alert(1)'],
    ['bookings'],
    [''],
    ['/login'],
    ['/login?next=/x'],
    ['/register/cleaner'],
    ['/auth/callback'],
    ['/signed-out'],
    ['/ok\nSet-Cookie: x=1'],
    ['/' + 'a'.repeat(600)],
    [null],
    [undefined],
    [42],
  ])('rejects %p', (v) => {
    expect(safeNextPath(v)).toBeNull()
  })
})
