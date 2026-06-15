import { geocodeAddress } from './geocode'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
  jest.clearAllMocks()
})

describe('geocodeAddress', () => {
  it('returns lat/lng for a valid address', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '32.0853', lon: '34.7818' }],
    })

    const result = await geocodeAddress('Tel Aviv, Israel')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org/search'),
      expect.any(Object)
    )
    expect(result).toEqual({ lat: 32.0853, lng: 34.7818 })
  })

  it('returns null when no results are found', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })

    const result = await geocodeAddress('Nonexistent Place 12345')

    expect(result).toBeNull()
  })

  it('returns null when the request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => [] })

    const result = await geocodeAddress('Some Address')

    expect(result).toBeNull()
  })
})
