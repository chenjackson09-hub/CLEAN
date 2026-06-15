import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CleanerBookingCard } from './CleanerBookingCard'
import type { BookingResult } from '@/lib/types/booking'

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
  customer_email: 'maya.cohen@example.com',
  customer_phone: '050-111-1111',
}

describe('CleanerBookingCard', () => {
  it('renders customer name, date, time, duration, address and service badge', () => {
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={jest.fn()} />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.getByText(/Jun 15, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText(/2 hrs/)).toBeInTheDocument()
    expect(screen.getByText(/12 Rothschild Blvd, Tel Aviv/)).toBeInTheDocument()
    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('shows Accept/Deny buttons for pending bookings', () => {
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument()
  })

  it('calls onUpdateStatus with "accepted" when Accept is clicked', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={onUpdateStatus} />)

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('b-1', 'accepted')
  })

  it('calls onUpdateStatus with "declined" when Deny is clicked', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={onUpdateStatus} />)

    await user.click(screen.getByRole('button', { name: 'Deny' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('b-1', 'declined')
  })

  it('shows customer contact info and no buttons for accepted bookings', () => {
    render(<CleanerBookingCard booking={{ ...baseBooking, status: 'accepted' }} onUpdateStatus={jest.fn()} />)

    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText(/050-111-1111/)).toBeInTheDocument()
    expect(screen.getByText(/maya.cohen@example.com/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
  })

  it('shows only a status badge for declined bookings', () => {
    render(<CleanerBookingCard booking={{ ...baseBooking, status: 'declined' }} onUpdateStatus={jest.fn()} />)

    expect(screen.getByText('Declined')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
    expect(screen.queryByText(/050-111-1111/)).not.toBeInTheDocument()
  })
})
