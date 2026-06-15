import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import BookingsPage from './page'
import { addBooking } from '@/lib/mockBookingsStore'

describe('BookingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the existing mock bookings', () => {
    render(<BookingsPage />)

    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
  })

  it('shows a booking that was added via the mock store', () => {
    addBooking({
      id: 'new-1',
      cleaner_name: 'Newly Booked Cleaner',
      cleaner_avatar_url: null,
      service_type: 'residential',
      scheduled_date: '2026-07-01',
      scheduled_start: '09:00',
      duration_hours: 2,
      address: '1 Test St',
      status: 'pending',
    })

    render(<BookingsPage />)

    expect(screen.getByText('Newly Booked Cleaner')).toBeInTheDocument()
  })
})
