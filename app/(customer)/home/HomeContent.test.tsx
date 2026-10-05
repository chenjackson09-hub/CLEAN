import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { HomeContent } from './HomeContent'
import type { BookingResult } from '@/lib/types/booking'

// 2026-10-05 is a Monday.
const TODAY_STR = '2026-10-05'

const booking = (overrides: Partial<BookingResult>): BookingResult => ({
  id: 'b-1',
  cleaner_name: 'Sarah M.',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: '2026-10-20',
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '12 Rothschild Blvd, Tel Aviv',
  status: 'accepted',
  ...overrides,
})

const props = { firstName: 'Dana', todayStr: TODAY_STR, confirmed: [], pending: [], past: [] }

describe('HomeContent', () => {
  it('greets the customer by first name', () => {
    render(<HomeContent {...props} />)
    expect(screen.getByText('Hello, Dana')).toBeInTheDocument()
  })

  it('shows an empty state in each box and no today/tomorrow strip when nothing is close', () => {
    render(<HomeContent {...props} />)
    expect(screen.getByText('No confirmed cleans yet.')).toBeInTheDocument()
    expect(screen.getByText('No pending requests.')).toBeInTheDocument()
    expect(screen.getByText('No past cleans yet.')).toBeInTheDocument()
    expect(screen.queryByText('Today & tomorrow')).not.toBeInTheDocument()
  })

  it("shows the cleaner's own area (not the booking's clean address) on a later confirmed clean, with a month chip", () => {
    render(
      <HomeContent
        {...props}
        confirmed={[booking({ id: 'c1', cleaner_name: 'Noa R.', cleaner_address: '10 Amir Rd, Kibbutz Amir', scheduled_date: '2026-10-20' })]}
      />,
    )
    expect(screen.getByText('Noa R. — Kibbutz Amir')).toBeInTheDocument()
    expect(screen.queryByText(/Tel Aviv/)).not.toBeInTheDocument()
    expect(screen.getByText('Oct')).toBeInTheDocument() // not this week -> month label
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('puts today/tomorrow cleans only in the highlighted strip, not also in the Confirmed box', () => {
    render(
      <HomeContent
        {...props}
        confirmed={[
          booking({ id: 'today', cleaner_name: 'Noa R.', scheduled_date: '2026-10-05', scheduled_start: '09:00' }),
          booking({ id: 'tmrw', cleaner_name: 'Maya S.', scheduled_date: '2026-10-06', scheduled_start: '14:30' }),
          booking({ id: 'later', cleaner_name: 'Dan K.', scheduled_date: '2026-10-22' }),
        ]}
      />,
    )
    const strip = screen.getByText('Today & tomorrow').closest('section')!
    expect(within(strip).getByText('Noa R.')).toBeInTheDocument()
    expect(within(strip).getByText('Today · 09:00')).toBeInTheDocument()
    expect(within(strip).getByText('Tomorrow · 14:30')).toBeInTheDocument()
    expect(within(strip).queryByText('Dan K.')).not.toBeInTheDocument()

    const confirmed = screen.getByText('Confirmed').closest('section')!
    expect(within(confirmed).getByText('Dan K.')).toBeInTheDocument()
    expect(within(confirmed).queryByText('Noa R.')).not.toBeInTheDocument()
    expect(screen.getAllByText('Noa R.')).toHaveLength(1)
  })

  it('shows the weekday on the chip for a clean later this week', () => {
    render(<HomeContent {...props} confirmed={[booking({ id: 'w', cleaner_name: 'Dan K.', scheduled_date: '2026-10-08' })]} />)
    expect(screen.getByText('Thu')).toBeInTheDocument()
  })

  it('renders a pending row without the cleaner name and flags a changed-hours question', () => {
    render(
      <HomeContent
        {...props}
        pending={[
          { ...booking({ id: 'p1', cleaner_name: 'Hidden Cleaner', status: 'pending', availability_notice: '10:00–13:00' }), daysAgo: 1 },
        ]}
      />,
    )
    expect(screen.getByText('Awaiting cleaner response')).toBeInTheDocument()
    expect(screen.queryByText('Hidden Cleaner')).not.toBeInTheDocument()
    expect(screen.getByText('requested yesterday · Needs your answer')).toBeInTheDocument()
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  it('renders a past row (faded) with just the cleaner and opens the booking on tap', async () => {
    render(<HomeContent {...props} past={[booking({ id: 'pa1', cleaner_name: 'Maya S.', status: 'completed', scheduled_date: '2026-09-02' })]} />)
    expect(screen.getByText('Sep')).toBeInTheDocument()
    expect(screen.getAllByText('Maya S.')).toHaveLength(1)
    await userEvent.click(screen.getByText('Maya S.'))
    // the detail modal's own header now shows the name too
    expect(await screen.findByRole('heading', { name: 'Maya S.' })).toBeInTheDocument()
  })
})
