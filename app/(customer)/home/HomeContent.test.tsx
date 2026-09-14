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
    render(<HomeContent firstName="Dana" todayStr={TODAY_STR} confirmed={[]} pending={[]} past={[]} />)
    expect(screen.getByText('Hello, Dana')).toBeInTheDocument()
  })

  it('shows empty states when a section has no bookings', () => {
    render(<HomeContent firstName="Dana" todayStr={TODAY_STR} confirmed={[]} pending={[]} past={[]} />)
    expect(screen.getByText('No confirmed cleans yet.')).toBeInTheDocument()
    expect(screen.getByText('No pending requests.')).toBeInTheDocument()
    expect(screen.getByText('No past cleans yet.')).toBeInTheDocument()
  })

  it('renders a confirmed row with the cleaner name, area, and a countdown', () => {
    render(
      <HomeContent
        firstName="Dana"
        todayStr={TODAY_STR}
        confirmed={[booking({ id: 'c1', cleaner_name: 'Noa R.', address: '5 Herzl St, Kibbutz Amir', scheduled_date: '2026-06-18' })]}
        pending={[]}
        past={[]}
      />
    )
    expect(screen.getByText('Noa R. — Kibbutz Amir')).toBeInTheDocument()
    expect(screen.getByText(/09:00 · in 3 days/)).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('renders a pending row without the cleaner name, showing "requested X" instead', () => {
    render(
      <HomeContent
        firstName="Dana"
        todayStr={TODAY_STR}
        confirmed={[]}
        pending={[{ ...booking({ id: 'p1', cleaner_name: 'Hidden Cleaner', status: 'pending' }), daysAgo: 1 }]}
        past={[]}
      />
    )
    expect(screen.getByText('Awaiting cleaner response')).toBeInTheDocument()
    expect(screen.queryByText('Hidden Cleaner')).not.toBeInTheDocument()
    expect(screen.getByText(/requested yesterday/)).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders a past row with just the cleaner name and date, no time', () => {
    render(
      <HomeContent
        firstName="Dana"
        todayStr={TODAY_STR}
        confirmed={[]}
        pending={[]}
        past={[booking({ id: 'pa1', cleaner_name: 'Maya S.', status: 'completed', scheduled_date: '2026-06-02' })]}
      />
    )
    expect(screen.getByText('Maya S.')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.queryByText(/09:00/)).not.toBeInTheDocument()
  })
})
