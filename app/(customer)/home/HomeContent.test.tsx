import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { HomeContent } from './HomeContent'
import type { BookingResult } from '@/lib/types/booking'

const TODAY_STR = '2026-06-15'

const booking = (overrides: Partial<BookingResult>): BookingResult => ({
  id: 'b-1',
  cleaner_name: 'Sarah M.',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: TODAY_STR,
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '12 Rothschild Blvd, Tel Aviv',
  status: 'accepted',
  ...overrides,
})

describe('HomeContent', () => {
  it('greets the customer by first name', () => {
    render(<HomeContent firstName="Dana" todayStr={TODAY_STR} today={[]} upcoming={[]} past={[]} />)
    expect(screen.getByText('Hi, Dana')).toBeInTheDocument()
  })

  it('shows empty states when a section has no bookings', () => {
    render(<HomeContent firstName="Dana" todayStr={TODAY_STR} today={[]} upcoming={[]} past={[]} />)
    expect(screen.getByText('No cleans scheduled for today.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming cleans.')).toBeInTheDocument()
    expect(screen.getByText('No past cleans yet.')).toBeInTheDocument()
  })

  it('renders a booking card in each populated section', () => {
    render(
      <HomeContent
        firstName="Dana"
        todayStr={TODAY_STR}
        today={[booking({ id: 't1', cleaner_name: 'Today Cleaner' })]}
        upcoming={[booking({ id: 'u1', cleaner_name: 'Upcoming Cleaner', scheduled_date: '2026-06-20' })]}
        past={[booking({ id: 'p1', cleaner_name: 'Past Cleaner', status: 'completed' })]}
      />
    )
    expect(screen.getByText(/Booked with Today Cleaner/)).toBeInTheDocument()
    expect(screen.getByText(/Booked with Upcoming Cleaner/)).toBeInTheDocument()
    expect(screen.getByText(/Booked with Past Cleaner/)).toBeInTheDocument()
    expect(screen.queryByText('No upcoming cleans.')).not.toBeInTheDocument()
  })

  it("shows the customer's saved area, not the full street address", () => {
    render(
      <HomeContent
        firstName="Dana"
        todayStr={TODAY_STR}
        today={[booking({ address: '12 Rothschild Blvd, Beit Hillel' })]}
        upcoming={[]}
        past={[]}
      />
    )
    expect(screen.getByText(/Beit Hillel/)).toBeInTheDocument()
    expect(screen.queryByText(/Rothschild/)).not.toBeInTheDocument()
  })

  it('shows a countdown for today vs. a future upcoming booking', () => {
    render(
      <HomeContent
        firstName="Dana"
        todayStr={TODAY_STR}
        today={[booking({ id: 't1' })]}
        upcoming={[booking({ id: 'u1', scheduled_date: '2026-06-18' })]}
        past={[]}
      />
    )
    // "Today" also appears as the section heading, so match the full line
    // rather than a bare substring to avoid ambiguity.
    expect(screen.getByText(/09:00 · Today$/)).toBeInTheDocument()
    expect(screen.getByText(/In 3 days/)).toBeInTheDocument()
  })
})
