import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingCard } from './BookingCard'
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
}

describe('BookingCard', () => {
  it('renders cleaner name, date, time and duration', () => {
    render(<BookingCard booking={baseBooking} />)
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText(/Jun 15, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText(/2 hrs/)).toBeInTheDocument()
  })

  it('renders "1 hr" for single-hour bookings', () => {
    render(<BookingCard booking={{ ...baseBooking, duration_hours: 1 }} />)
    expect(screen.getByText(/1 hr\b/)).toBeInTheDocument()
  })

  it('renders the address', () => {
    render(<BookingCard booking={baseBooking} />)
    expect(screen.getByText(/12 Rothschild Blvd, Tel Aviv/)).toBeInTheDocument()
  })

  it('renders the service type badge', () => {
    render(<BookingCard booking={baseBooking} />)
    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('renders commercial badge for commercial bookings', () => {
    render(<BookingCard booking={{ ...baseBooking, service_type: 'commercial' }} />)
    expect(screen.getByText('Commercial')).toBeInTheDocument()
  })

  it.each([
    ['pending', 'Pending'],
    ['accepted', 'Accepted'],
    ['declined', 'Declined'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
  ] as const)('renders the %s status badge as "%s"', (status, label) => {
    render(<BookingCard booking={{ ...baseBooking, status }} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('renders notes when present', () => {
    render(<BookingCard booking={{ ...baseBooking, notes: 'Please bring eco-friendly products.' }} />)
    expect(screen.getByText(/Please bring eco-friendly products/)).toBeInTheDocument()
  })

  it('does not render a notes section when notes are absent', () => {
    render(<BookingCard booking={baseBooking} />)
    expect(screen.queryByText(/"/)).not.toBeInTheDocument()
  })

  it('renders initial avatar when cleaner_avatar_url is null', () => {
    render(<BookingCard booking={baseBooking} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders img when cleaner_avatar_url is set', () => {
    render(<BookingCard booking={{ ...baseBooking, cleaner_avatar_url: 'https://example.com/photo.jpg' }} />)
    expect(screen.getByRole('img', { name: 'Sarah M.' })).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('shows cleaner contact info for accepted bookings', () => {
    render(<BookingCard booking={{
      ...baseBooking,
      status: 'accepted',
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
    }} />)

    expect(screen.getByText('Contact Info')).toBeInTheDocument()
    expect(screen.getByText(/050-222-1111/)).toBeInTheDocument()
    expect(screen.getByText(/sarah.m@example.com/)).toBeInTheDocument()
  })

  it('does not show contact info for pending bookings', () => {
    render(<BookingCard booking={{
      ...baseBooking,
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
    }} />)

    expect(screen.queryByText('Contact Info')).not.toBeInTheDocument()
  })
})
