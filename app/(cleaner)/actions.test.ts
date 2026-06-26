import { editBooking } from './actions'
import { createClient } from '@/lib/supabase/server'

// editBooking pulls in several server-only helpers at module load; stub them so
// the action module imports cleanly under jsdom. The guard-path tests below
// return before any of these are actually used.
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/availability', () => ({ restoreAvailability: jest.fn() }))
jest.mock('@/lib/geocode', () => ({ geocodeAddress: jest.fn() }))
jest.mock('@/lib/resend', () => ({
  sendBookingAccepted: jest.fn(),
  sendBookingDeclined: jest.fn(),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>

const getUser = jest.fn()
const single = jest.fn()
// Booking fetch chain: from('bookings').select(...).eq('id').eq('cleaner_id').single()
const from = jest.fn(() => ({
  select: () => ({ eq: () => ({ eq: () => ({ single }) }) }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockedCreateClient.mockResolvedValue({ auth: { getUser }, from } as never)
  getUser.mockResolvedValue({ data: { user: { id: 'cleaner-1' } } })
})

const validInput = { scheduled_start: '09:00', duration_hours: 2 }

describe('editBooking guards', () => {
  it('rejects an unauthenticated caller', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await editBooking('b-1', validInput)
    expect(res).toEqual({ error: 'Not authenticated.' })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range duration', async () => {
    const res = await editBooking('b-1', { scheduled_start: '09:00', duration_hours: 0 })
    expect(res).toEqual({ error: 'Invalid duration.' })
  })

  it('rejects a malformed start time', async () => {
    const res = await editBooking('b-1', { scheduled_start: 'nope', duration_hours: 2 })
    expect(res).toEqual({ error: 'Invalid start time.' })
  })

  it('rejects when the booking is not found', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'no rows' } })
    const res = await editBooking('b-1', validInput)
    expect(res).toEqual({ error: 'Booking not found.' })
  })

  it('rejects editing a booking in a terminal status', async () => {
    single.mockResolvedValue({
      data: {
        status: 'declined',
        scheduled_date: '2026-06-15',
        scheduled_start: '09:00',
        duration_hours: 2,
        notes: null,
      },
      error: null,
    })
    const res = await editBooking('b-1', validInput)
    expect(res).toEqual({ error: 'This booking can no longer be edited.' })
  })
})
