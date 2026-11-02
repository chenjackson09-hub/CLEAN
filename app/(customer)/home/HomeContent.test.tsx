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

  it('with nothing yet: one friendly empty state with a way forward, no empty boxes, no gap', () => {
    render(<HomeContent {...props} />)
    expect(screen.getByText('No confirmed cleans yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Find a cleaner for your home/ })).toHaveAttribute('href', '/browse')
    // Nothing is waiting, so that section isn't shown at all; past cleans is one quiet line.
    expect(screen.queryByText('Waiting for an answer')).not.toBeInTheDocument()
    expect(screen.queryByText('No pending requests.')).not.toBeInTheDocument()
    expect(screen.getByText('Past cleans (0)')).toBeInTheDocument()
    expect(screen.queryByText('Today & tomorrow')).not.toBeInTheDocument()
  })

  it('has no fixed-height column that pushes sections to the bottom of the screen', () => {
    const { container } = render(<HomeContent {...props} />)
    expect(container.innerHTML).not.toContain('mt-auto')
    expect(container.innerHTML).not.toContain('100dvh')
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

    const coming = screen.getByText('Coming up').closest('section')!
    expect(within(coming).getByText('Dan K.')).toBeInTheDocument()
    expect(within(coming).queryByText('Noa R.')).not.toBeInTheDocument()
    expect(screen.getAllByText('Noa R.')).toHaveLength(1)
  })

  it('tells the host how far away each confirmed clean is', () => {
    render(
      <HomeContent
        {...props}
        confirmed={[
          booking({ id: 'a', cleaner_name: 'A', scheduled_date: '2026-10-08' }), // 3 days
          booking({ id: 'b', cleaner_name: 'B', scheduled_date: '2026-10-14' }), // 9 days
          booking({ id: 'c', cleaner_name: 'C', scheduled_date: '2026-10-20' }), // 15 days
        ]}
      />,
    )
    expect(screen.getByText('in 3 days')).toBeInTheDocument()
    expect(screen.getByText('next week')).toBeInTheDocument()
    expect(screen.getByText('in two weeks')).toBeInTheDocument()
  })

  it('keeps past cleans collapsed until opened, and confirmed chips darker than past ones', async () => {
    render(
      <HomeContent
        {...props}
        confirmed={[booking({ id: 'a', cleaner_name: 'Upcoming One', scheduled_date: '2026-10-20' })]}
        past={[booking({ id: 'p', cleaner_name: 'Old One', status: 'completed', scheduled_date: '2026-09-02' })]}
      />,
    )
    expect(screen.queryByText('Old One')).not.toBeInTheDocument()
    expect(screen.getByText('Upcoming One').closest('div.flex')!.querySelector('.bg-gray-300')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Past cleans \(1\)/ }))
    expect(screen.getByText('Old One')).toBeInTheDocument()
    expect(screen.getByText('Old One').closest('div.flex')!.querySelector('.bg-gray-300')).toBeNull()
  })

  it('orders the page by what needs attention: today/tomorrow, then waiting, then coming up', () => {
    render(
      <HomeContent
        {...props}
        confirmed={[
          booking({ id: 'today', cleaner_name: 'Noa R.', scheduled_date: '2026-10-05' }),
          booking({ id: 'later', cleaner_name: 'Dan K.', scheduled_date: '2026-10-22' }),
        ]}
        pending={[{ ...booking({ id: 'p', status: 'pending', scheduled_date: '2026-10-12' }), daysAgo: 0, left: { kind: 'hours', n: 22, tone: 'calm' } }]}
      />,
    )
    const order = ['Today & tomorrow', 'Waiting for an answer', 'Coming up'].map((t) => screen.getByText(t))
    order.slice(1).forEach((el, i) => expect(order[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy())
  })

  it('shows the weekday on the chip for a clean later this week', () => {
    render(<HomeContent {...props} confirmed={[booking({ id: 'w', cleaner_name: 'Dan K.', scheduled_date: '2026-10-08' })]} />)
    expect(screen.getByText('Thu')).toBeInTheDocument()
  })

  it('a waiting request says what was sent, that it is waiting, and how long is left — without naming a cleaner', () => {
    render(
      <HomeContent
        {...props}
        pending={[{ ...booking({ id: 'p1', cleaner_name: 'Hidden Cleaner', status: 'pending', scheduled_start: '09:00', duration_hours: 3 }), daysAgo: 0, left: { kind: 'hours', n: 22, tone: 'calm' } }]}
      />,
    )
    expect(screen.getByText('Request sent · 09:00 · 3 h')).toBeInTheDocument()
    expect(screen.getByText('Waiting for an answer · 22 h left')).toBeInTheDocument()
    expect(screen.queryByText('Hidden Cleaner')).not.toBeInTheDocument()
  })

  it('counts minutes when it is nearly out of time, and drops the hours for a "not sure" duration', () => {
    render(
      <HomeContent
        {...props}
        pending={[{ ...booking({ id: 'p2', status: 'pending', duration_flexible: true }), daysAgo: 0, left: { kind: 'minutes', n: 40, tone: 'urgent' } }]}
      />,
    )
    expect(screen.getByText('Request sent · 09:00')).toBeInTheDocument()
    expect(screen.getByText('Waiting for an answer · 40 min left')).toBeInTheDocument()
  })

  it('flags a changed-hours question on a waiting request', () => {
    render(
      <HomeContent
        {...props}
        pending={[{ ...booking({ id: 'p3', status: 'pending', availability_notice: '10:00–13:00' }), daysAgo: 1, left: { kind: 'hours', n: 5, tone: 'soon' } }]}
      />,
    )
    expect(screen.getByText('Needs your answer · 5 h left')).toBeInTheDocument()
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  it('renders a past row (faded) with just the cleaner and opens the booking on tap', async () => {
    render(<HomeContent {...props} past={[booking({ id: 'pa1', cleaner_name: 'Maya S.', status: 'completed', scheduled_date: '2026-09-02' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /Past cleans \(1\)/ }))
    expect(screen.getByText('Sep')).toBeInTheDocument()
    expect(screen.getAllByText('Maya S.')).toHaveLength(1)
    await userEvent.click(screen.getByText('Maya S.'))
    // the detail modal's own header now shows the name too
    expect(await screen.findByRole('heading', { name: 'Maya S.' })).toBeInTheDocument()
  })
})
