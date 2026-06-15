import { getStoredBookings, addBooking, getAllBookings, updateBookingStatus } from './mockBookingsStore'
import { MOCK_BOOKINGS } from './mockData/bookings'
import type { BookingResult } from './types/booking'

const booking: BookingResult = {
  id: 'new-1',
  cleaner_name: 'Test Cleaner',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: '2026-07-01',
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '1 Test St',
  status: 'pending',
}

describe('mockBookingsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns an empty array when nothing has been stored', () => {
    expect(getStoredBookings()).toEqual([])
  })

  it('returns a booking after it has been added', () => {
    addBooking(booking)

    expect(getStoredBookings()).toEqual([booking])
  })

  it('prepends newly added bookings so the newest is first', () => {
    addBooking(booking)
    addBooking({ ...booking, id: 'new-2', cleaner_name: 'Another Cleaner' })

    const stored = getStoredBookings()
    expect(stored[0].id).toBe('new-2')
    expect(stored[1].id).toBe('new-1')
  })

  describe('getAllBookings', () => {
    it('returns the seed bookings when nothing has been stored', () => {
      expect(getAllBookings()).toEqual(MOCK_BOOKINGS)
    })

    it('includes newly added bookings alongside the seed bookings', () => {
      addBooking(booking)

      const all = getAllBookings()
      expect(all[0]).toEqual(booking)
      expect(all).toHaveLength(MOCK_BOOKINGS.length + 1)
    })
  })

  describe('updateBookingStatus', () => {
    it('updates the status of a stored booking', () => {
      addBooking(booking)
      updateBookingStatus('new-1', 'accepted')

      const all = getAllBookings()
      expect(all.find(b => b.id === 'new-1')?.status).toBe('accepted')
    })

    it('promotes a seed booking into storage with the new status', () => {
      const seedId = MOCK_BOOKINGS[0].id
      updateBookingStatus(seedId, 'declined')

      const all = getAllBookings()
      const updated = all.find(b => b.id === seedId)
      expect(updated?.status).toBe('declined')
      expect(all).toHaveLength(MOCK_BOOKINGS.length)
    })
  })
})
