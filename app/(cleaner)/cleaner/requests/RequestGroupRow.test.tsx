import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import RequestGroupRow, { type RequestGroup } from './RequestGroupRow'
import type { BookingWithCustomer } from '@/types/database'

const mockRespond = jest.fn()
jest.mock('../../actions', () => ({ respondToBooking: (...a: unknown[]) => mockRespond(...a) }))

const future = new Date(Date.now() + 20 * 3600_000).toISOString()
const bk = (id: string, date: string, over: Record<string, unknown> = {}) =>
  ({
    id, customer_id: 'host-1', cleaner_id: 'me', scheduled_date: date, scheduled_start: '09:00:00', duration_hours: 4,
    duration_flexible: false, address: "Ha'adarim 44, Beit Hillel", status: 'pending', response_deadline: future,
    extras: [], profiles: { full_name: 'Host One', avatar_url: null }, ...over,
  }) as unknown as BookingWithCustomer

const group = (bookings: BookingWithCustomer[]): RequestGroup => ({
  key: 'host-1:', customerId: 'host-1', name: 'Host One', avatarUrl: null, bookings,
})

beforeEach(() => mockRespond.mockReset().mockResolvedValue({ success: true }))

describe('RequestGroupRow', () => {
  it('shows one row for a host with several requested days, listing the days and a count', () => {
    render(<RequestGroupRow group={group([bk('a', '2026-10-15'), bk('b', '2026-10-16')])} />)
    expect(screen.getAllByText('Host One')).toHaveLength(1)
    expect(screen.getByText('Thu 15 Oct · Fri 16 Oct')).toBeInTheDocument()
    expect(screen.getByText('2 days')).toBeInTheDocument()
  })

  it('a single request reads as date · time · hours', () => {
    render(<RequestGroupRow group={group([bk('a', '2026-10-15')])} />)
    expect(screen.getByText('Thu 15 Oct · 09:00 · 4h')).toBeInTheDocument()
    expect(screen.queryByText(/days$/)).not.toBeInTheDocument()
  })

  it('accepting is one tap (no second "accept this request?"), then offers the chat instead of a phone number', async () => {
    render(<RequestGroupRow group={group([bk('a', '2026-10-15')])} />)
    await userEvent.click(screen.getByRole('button', { name: /Host One/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(mockRespond).toHaveBeenCalledWith('a', 'accepted'))
    expect(screen.queryByText('Accept this request?')).not.toBeInTheDocument()
    expect(await screen.findByText('Request accepted ✓')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open chat' })).toHaveAttribute('href', '/cleaner/chat/host-1')
    expect(screen.queryByText(/phone/i)).not.toBeInTheDocument()
  })

  it('has no edit button — changes happen in the chat', async () => {
    render(<RequestGroupRow group={group([bk('a', '2026-10-15')])} />)
    await userEvent.click(screen.getByRole('button', { name: /Host One/ }))
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('with several days you pick the day to accept; titles are bold and answers plain', async () => {
    render(<RequestGroupRow group={group([bk('a', '2026-10-15'), bk('b', '2026-10-16', { scheduled_start: '14:00:00' })])} />)
    await userEvent.click(screen.getByRole('button', { name: /Host One/ }))

    const dialogDays = screen.getByText('Requested days').parentElement!
    await userEvent.click(within(dialogDays).getByRole('button', { name: /Fri 16 Oct · 14:00/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(mockRespond).toHaveBeenCalledWith('b', 'accepted'))

    // title weight vs answer weight in the shared summary
    expect(screen.queryByText('Requested days')).not.toBeInTheDocument() // replaced by the accepted panel
  })

  it('declining asks to confirm, and the remaining days stay when one is declined', async () => {
    render(<RequestGroupRow group={group([bk('a', '2026-10-15'), bk('b', '2026-10-16')])} />)
    await userEvent.click(screen.getByRole('button', { name: /Host One/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(screen.getByText('Decline this request?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, decline' }))

    await waitFor(() => expect(mockRespond).toHaveBeenCalledWith('a', 'declined'))
    // the other day is still on offer
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Thu 15 Oct · 09:00/ })).not.toBeInTheDocument()
  })

  it('shows the error and stays put when the response fails', async () => {
    mockRespond.mockResolvedValue({ error: 'This time is no longer available.' })
    render(<RequestGroupRow group={group([bk('a', '2026-10-15')])} />)
    await userEvent.click(screen.getByRole('button', { name: /Host One/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(await screen.findByText('This time is no longer available.')).toBeInTheDocument()
    expect(screen.queryByText('Request accepted ✓')).not.toBeInTheDocument()
  })
})
