import { getCleaners, getCustomerLocation } from './cleaners'
import { createClient } from '@/lib/supabase/server'

const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>

beforeEach(() => {
  jest.clearAllMocks()
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
  mockedCreateClient.mockResolvedValue({
    rpc: mockRpc,
    from: mockFrom,
  } as any)
})

describe('getCleaners', () => {
  it('returns cleaner data on success', async () => {
    const fakeCleaners = [
      { id: '1', full_name: 'Sarah M.', bio: 'Great cleaner', distance_km: 2.1,
        service_types: ['residential'], hourly_rate: 80, years_experience: 5,
        languages: ['EN', 'HE'], avatar_url: null },
    ]
    mockRpc.mockResolvedValue({ data: fakeCleaners, error: null })

    const result = await getCleaners(
      { day: 1, start: '09:00', end: '13:00', type: 'residential' },
      32.08, 34.78
    )

    expect(mockRpc).toHaveBeenCalledWith('get_available_cleaners', {
      p_lat: 32.08,
      p_lng: 34.78,
      p_day: 1,
      p_start: '09:00',
      p_end: '13:00',
      p_service_type: 'residential',
    })
    expect(result).toEqual({ data: fakeCleaners, error: null })
  })

  it('returns error string on Supabase error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getCleaners(
      { day: 1, start: '09:00', end: '13:00', type: 'residential' },
      32.08, 34.78
    )

    expect(result).toEqual({ data: null, error: 'Failed to fetch cleaners' })
  })
})

describe('getCustomerLocation', () => {
  it('returns lat/lng when customer row has both', async () => {
    mockSingle.mockResolvedValue({ data: { lat: 32.08, lng: 34.78 }, error: null })

    const result = await getCustomerLocation('user-123')

    expect(mockFrom).toHaveBeenCalledWith('customers')
    expect(result).toEqual({ lat: 32.08, lng: 34.78 })
  })

  it('returns null when lat/lng are missing', async () => {
    mockSingle.mockResolvedValue({ data: { lat: null, lng: null }, error: null })

    const result = await getCustomerLocation('user-123')

    expect(result).toBeNull()
  })

  it('returns null on Supabase error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await getCustomerLocation('user-123')

    expect(result).toBeNull()
  })
})
