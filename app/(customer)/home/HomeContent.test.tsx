import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { HomeContent } from './HomeContent'
import type { BookingResult } from '@/lib/types/booking'

const booking = (overrides: Partial<BookingResult>): BookingResult => ({
  id: 'b-1',
  cleaner_name: 'Sarah M.',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: '2026-06-15',
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '12 Rothschild Blvd, Tel Aviv',
  status: 'accepted',
  ...overrides,
})

describe('HomeContent', () => {
  it('greets the customer by first name', () => {
    render(<HomeContent firstName="Dana" today={[]} upcoming={[]} past={[]} />)
    expect(screen.getByText('Hi, Dana')).toBeInTheDocument()
  })

  it('renders quick-link tiles to Schedule, Bookings, and Profile', () => {
    render(<HomeContent firstName="Dana" today={[]} upcoming={[]} past={[]} />)
    expect(screen.getByRole('link', { name: /Find a Cleaner/ })).toHaveAttribute('href', '/browse')
    expect(screen.getByRole('link', { name: /My Bookings/ })).toHaveAttribute('href', '/bookings')
    expect(screen.getByRole('link', { name: /My Profile/ })).toHaveAttribute('href', '/profile')
  })

  it('shows empty states when a section has no bookings', () => {
    render(<HomeContent firstName="Dana" today={[]} upcoming={[]} past={[]} />)
    expect(screen.getByText('No cleans scheduled for today.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming cleans.')).toBeInTheDocument()
    expect(screen.getByText('No past cleans yet.')).toBeInTheDocument()
  })

  it('renders a booking card in each populated section', () => {
    render(
      <HomeContent
        firstName="Dana"
        today={[booking({ id: 't1', cleaner_name: 'Today Cleaner' })]}
        upcoming={[booking({ id: 'u1', cleaner_name: 'Upcoming Cleaner' })]}
        past={[booking({ id: 'p1', cleaner_name: 'Past Cleaner', status: 'completed' })]}
      />
    )
    expect(screen.getByText('Today Cleaner')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Cleaner')).toBeInTheDocument()
    expect(screen.getByText('Past Cleaner')).toBeInTheDocument()
    expect(screen.queryByText('No upcoming cleans.')).not.toBeInTheDocument()
  })
})
