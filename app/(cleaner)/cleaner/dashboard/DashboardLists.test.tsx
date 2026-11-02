import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import DashboardLists from './DashboardLists'
import type { BookingWithCustomer } from '@/types/database'

const mockComplete = jest.fn()
jest.mock('../../actions', () => ({ completeBooking: (...a: unknown[]) => mockComplete(...a) }))

// 2026-10-05 is a Monday.
const TODAY = '2026-10-05'

const b = (over: Record<string, unknown>) =>
  ({
    id: 'x', customer_id: 'c', cleaner_id: 'me', scheduled_date: '2026-10-20', scheduled_start: '09:00:00', duration_hours: 3,
    duration_flexible: false, address: '12 Rothschild, Beit Hillel', status: 'accepted',
    profiles: { full_name: 'Roni Tyroler', phone: null, avatar_url: null }, ...over,
  }) as unknown as BookingWithCustomer & { daysUntil: number }

const base = { name: 'Chen Jackson', todayStr: TODAY, upcoming: [], past: [], hourlyRate: 90 }

beforeEach(() => mockComplete.mockReset().mockResolvedValue({ success: true }))

describe('cleaner home', () => {
  it('shows compact rows: a month chip, the area (not the street) and time · hours', () => {
    render(<DashboardLists {...base} upcoming={[b({ id: 'u1', daysUntil: 15 }) as never]} />)
    expect(screen.getByText('Roni Tyroler')).toBeInTheDocument()
    expect(screen.getByText('09:00 · 3h · Beit Hillel')).toBeInTheDocument()
    expect(screen.getByText('Oct')).toBeInTheDocument()
    expect(screen.queryByText(/Rothschild/)).not.toBeInTheDocument()
  })

  it('moves today/tomorrow cleans into a highlighted strip above Upcoming, not both', () => {
    render(
      <DashboardLists
        {...base}
        upcoming={[
          b({ id: 'u1', daysUntil: 0, scheduled_date: '2026-10-05', profiles: { full_name: 'Today Person' } }) as never,
          b({ id: 'u2', daysUntil: 1, scheduled_date: '2026-10-06', profiles: { full_name: 'Tomorrow Person' } }) as never,
          b({ id: 'u3', daysUntil: 15, profiles: { full_name: 'Later Person' } }) as never,
        ]}
      />,
    )
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections[0]).toBe('Today & tomorrow')
    expect(sections[1]).toMatch(/Upcoming cleans/)

    const strip = screen.getByText('Today & tomorrow').closest('section')!
    expect(within(strip).getByText('Today Person')).toBeInTheDocument()
    expect(within(strip).getByText(/^Today · 09:00/)).toBeInTheDocument()
    expect(within(strip).getByText(/^Tomorrow · 09:00/)).toBeInTheDocument()
    expect(within(strip).queryByText('Later Person')).not.toBeInTheDocument()
    expect(screen.getAllByText('Today Person')).toHaveLength(1)
  })

  it('says how far away each upcoming clean is: in N days within a week, then next week / in two weeks', () => {
    render(
      <DashboardLists
        {...base}
        upcoming={[
          b({ id: 'a', daysUntil: 3, scheduled_date: '2026-10-08', profiles: { full_name: 'A' } }) as never,
          b({ id: 'b', daysUntil: 9, scheduled_date: '2026-10-14', profiles: { full_name: 'B' } }) as never,
          b({ id: 'c', daysUntil: 15, scheduled_date: '2026-10-20', profiles: { full_name: 'C' } }) as never,
        ]}
      />,
    )
    expect(screen.getByText('in 3 days')).toBeInTheDocument()
    expect(screen.getByText('next week')).toBeInTheDocument()
    expect(screen.getByText('in two weeks')).toBeInTheDocument()
  })

  it('upcoming date chips are the darker grey; past ones stay light', async () => {
    render(
      <DashboardLists
        {...base}
        upcoming={[b({ id: 'u1', daysUntil: 9, profiles: { full_name: 'Up' } }) as never]}
        past={[b({ id: 'p1', scheduled_date: '2026-09-16', status: 'completed', profiles: { full_name: 'Past' } }) as never]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Past cleans \(1\)/ }))
    expect(screen.getByText('Up').closest('div.flex')!.querySelector('.bg-gray-300')).not.toBeNull()
    expect(screen.getByText('Past').closest('div.flex')!.querySelector('.bg-gray-300')).toBeNull()
  })

  it('is one growing page: no fixed-height column, no sections pushed to the bottom', () => {
    const { container } = render(<DashboardLists {...base} />)
    expect(container.innerHTML).not.toContain('mt-auto')
    expect(container.innerHTML).not.toContain('100dvh')
  })

  it('keeps finished history collapsed until it is opened', async () => {
    render(<DashboardLists {...base} past={[b({ id: 'p1', scheduled_date: '2026-09-16', status: 'completed', profiles: { full_name: 'Old One' } }) as never]} />)
    expect(screen.queryByText('Old One')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Past cleans \(1\)/ }))
    expect(screen.getByText('Old One')).toBeInTheDocument()
  })

  it('hides the strip when nothing is today or tomorrow', () => {
    render(<DashboardLists {...base} upcoming={[b({ id: 'u3', daysUntil: 15 }) as never]} />)
    expect(screen.queryByText('Today & tomorrow')).not.toBeInTheDocument()
  })

  it('a clean that happened but is not marked complete is shown up front with a Complete button, never hidden in the collapsed history', async () => {
    render(
      <DashboardLists
        {...base}
        past={[
          b({ id: 'p1', scheduled_date: '2026-10-01', profiles: { full_name: 'Needs Complete' } }) as never,
          b({ id: 'p2', scheduled_date: '2026-09-16', status: 'completed', profiles: { full_name: 'Already Done' } }) as never,
        ]}
      />,
    )
    const box = screen.getByText('Finished? Mark as complete').closest('section')!
    expect(within(box).getByText('Needs Complete')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Complete' })
    expect(buttons).toHaveLength(1)
    await userEvent.click(buttons[0])
    expect(mockComplete).toHaveBeenCalledWith('p1')
    // The finished one is history: collapsed, then faded without a button once opened.
    expect(screen.queryByText('Already Done')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Past cleans \(1\)/ }))
    expect(screen.getByText('Already Done').closest('.opacity-60')).not.toBeNull()
  })

  it('points at requests waiting for an answer first, and says nothing when there are none', () => {
    const { rerender } = render(<DashboardLists {...base} waitingRequests={0} />)
    expect(screen.queryByText(/waiting for your answer/)).not.toBeInTheDocument()
    rerender(<DashboardLists {...base} waitingRequests={1} />)
    expect(screen.getByRole('link', { name: /1 request is waiting for your answer/ })).toHaveAttribute('href', '/cleaner/requests')
    rerender(<DashboardLists {...base} waitingRequests={3} />)
    expect(screen.getByRole('link', { name: /3 requests are waiting for your answer/ })).toBeInTheDocument()
  })

  it('with no upcoming cleans it offers the way to get some: set available days', () => {
    render(<DashboardLists {...base} />)
    expect(screen.getByRole('link', { name: /Set your available days/ })).toHaveAttribute('href', '/cleaner/availability')
  })

  it('greets with a comma and puts the search bar right under the name', () => {
    render(<DashboardLists {...base} />)
    const name = screen.getByRole('heading', { level: 1, name: 'Chen Jackson' })
    expect(name.previousElementSibling?.textContent).toMatch(/^Good (morning|afternoon|evening),$/)
    const search = screen.getByRole('searchbox', { name: 'Search by name or location...' })
    expect(name.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('search is always visible and filters by name or location', async () => {
    render(
      <DashboardLists
        {...base}
        upcoming={[
          b({ id: 'u1', daysUntil: 15, profiles: { full_name: 'Roni Tyroler' } }) as never,
          b({ id: 'u2', daysUntil: 16, address: '1 Herzl, Haifa', profiles: { full_name: 'Dana Levi' } }) as never,
        ]}
      />,
    )
    await userEvent.type(screen.getByRole('searchbox'), 'haifa')
    expect(screen.getByText('Dana Levi')).toBeInTheDocument()
    expect(screen.queryByText('Roni Tyroler')).not.toBeInTheDocument()
  })

  it('shows the empty message and a quiet past-cleans line when there is nothing yet', () => {
    render(<DashboardLists {...base} />)
    expect(screen.getByText('No upcoming cleans.')).toBeInTheDocument()
    expect(screen.getByText('Past cleans (0)')).toBeInTheDocument()
  })
})
