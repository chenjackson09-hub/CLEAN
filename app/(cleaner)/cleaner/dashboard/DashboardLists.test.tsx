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

  it('moves today/tomorrow cleans into a highlighted strip between Upcoming and Past, not both', () => {
    render(
      <DashboardLists
        {...base}
        upcoming={[
          b({ id: 'u1', daysUntil: 0, scheduled_date: '2026-10-05', profiles: { full_name: 'Today Person' } }) as never,
          b({ id: 'u2', daysUntil: 1, scheduled_date: '2026-10-06', profiles: { full_name: 'Tomorrow Person' } }) as never,
          b({ id: 'u3', daysUntil: 15, profiles: { full_name: 'Later Person' } }) as never,
        ]}
        past={[b({ id: 'p1', scheduled_date: '2026-09-16', status: 'completed', profiles: { full_name: 'Past Person' } }) as never]}
      />,
    )
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections[0]).toMatch(/Upcoming cleans/)
    expect(sections[1]).toBe('Today & tomorrow')
    expect(sections[2]).toMatch(/Past cleans/)

    const strip = screen.getByText('Today & tomorrow').closest('section')!
    expect(within(strip).getByText('Today Person')).toBeInTheDocument()
    expect(within(strip).getByText(/^Today · 09:00/)).toBeInTheDocument()
    expect(within(strip).getByText(/^Tomorrow · 09:00/)).toBeInTheDocument()
    expect(within(strip).queryByText('Later Person')).not.toBeInTheDocument()
    expect(screen.getAllByText('Today Person')).toHaveLength(1)
  })

  it('hides the strip when nothing is today or tomorrow', () => {
    render(<DashboardLists {...base} upcoming={[b({ id: 'u3', daysUntil: 15 }) as never]} />)
    expect(screen.queryByText('Today & tomorrow')).not.toBeInTheDocument()
  })

  it('past cleans that still need marking complete get a Complete button; completed ones are faded without one', async () => {
    render(
      <DashboardLists
        {...base}
        past={[
          b({ id: 'p1', scheduled_date: '2026-10-01', profiles: { full_name: 'Needs Complete' } }) as never,
          b({ id: 'p2', scheduled_date: '2026-09-16', status: 'completed', profiles: { full_name: 'Already Done' } }) as never,
        ]}
      />,
    )
    const buttons = screen.getAllByRole('button', { name: 'Complete' })
    expect(buttons).toHaveLength(1)
    await userEvent.click(buttons[0])
    expect(mockComplete).toHaveBeenCalledWith('p1')
    expect(screen.getByText('Already Done').closest('.opacity-60')).not.toBeNull()
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

  it('shows the empty message in each box', () => {
    render(<DashboardLists {...base} />)
    expect(screen.getByText('No upcoming cleans.')).toBeInTheDocument()
    expect(screen.getByText('No past cleans yet.')).toBeInTheDocument()
  })
})
