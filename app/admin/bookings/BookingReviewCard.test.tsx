import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingReviewCard } from './BookingReviewCard'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const baseBooking: BookingResult = {
  id: 'b-1',
  cleaner_name: 'Sarah M.',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: '2026-06-15',
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '12 Rothschild Blvd, Tel Aviv',
  status: 'pending',
  customer_name: 'Maya Cohen',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

describe('BookingReviewCard', () => {
  it('renders who requested whom', () => {
    render(<BookingReviewCard booking={baseBooking} />)
    expect(screen.getByText('Maya Cohen requested Sarah M.')).toBeInTheDocument()
  })

  it('renders date, time, duration and address', () => {
    render(<BookingReviewCard booking={baseBooking} />)
    expect(screen.getByText(/Jun 15, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText(/2 hrs/)).toBeInTheDocument()
    expect(screen.getByText(/12 Rothschild Blvd, Tel Aviv/)).toBeInTheDocument()
  })

  it.each(Object.entries(STATUS_LABEL) as [BookingStatus, string][])(
    'renders the %s status badge and no Approve/Deny buttons',
    (status, label) => {
      render(<BookingReviewCard booking={{ ...baseBooking, status }} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
    }
  )
})
