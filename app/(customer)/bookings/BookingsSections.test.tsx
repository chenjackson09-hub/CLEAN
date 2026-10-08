import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingsSections } from './BookingsSections'
import type { BookingResult } from '@/lib/types/booking'

const today = '2026-10-10'
const b = (id: string, over: Partial<BookingResult>): BookingResult => ({
  id, cleaner_name: 'Maya Levi', cleaner_avatar_url: null, service_type: 'residential',
  scheduled_date: '2026-10-20', scheduled_start: '09:00', duration_hours: 3, address: '12 Herzl, Haifa', status: 'accepted', ...over,
})

describe('Bookings page', () => {
  it('has just two tabs, Upcoming and History, and opens on Upcoming', () => {
    render(<BookingsSections bookings={[b('a', {})]} todayStr={today} />)
    expect(screen.getAllByRole('button', { name: /^(Upcoming|History)/ })).toHaveLength(2)
    expect(screen.getByText('Maya L.')).toBeInTheDocument()
  })

  it('shows confirmed and pending together, with one status each and no street address', () => {
    render(<BookingsSections bookings={[b('c', { scheduled_date: '2026-10-12' }), b('p', { status: 'pending', scheduled_date: '2026-10-15', cleaner_name: 'Dana Cohen' })]} todayStr={today} />)
    expect(screen.getByText('in 2 days')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getAllByText(/about 3 h/)).toHaveLength(2)
    expect(screen.queryByText(/Herzl/)).not.toBeInTheDocument()
  })

  it('says so when nothing is coming up', () => {
    render(<BookingsSections bookings={[]} todayStr={today} />)
    expect(screen.getByText(/Nothing coming up/)).toBeInTheDocument()
  })

  it('History groups by month and keeps cancelled cleans as a record, with who and why', async () => {
    render(<BookingsSections todayStr={today} bookings={[
      b('done', { status: 'completed', scheduled_date: '2026-09-05', my_rating: 5 }),
      b('cx', { status: 'cancelled', cancelled_from_status: 'accepted', cancelled_by: 'host', cancellation_reason: 'plans_changed', scheduled_date: '2026-09-20' }),
    ]} />)
    await userEvent.click(screen.getByRole('button', { name: /^History/ }))
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    expect(screen.getByText(/You cancelled this cleaning · Plans changed/)).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('a completed clean not yet rated asks for a rating', async () => {
    render(<BookingsSections todayStr={today} bookings={[b('done', { status: 'completed', scheduled_date: '2026-09-05', my_rating: null })]} />)
    await userEvent.click(screen.getByRole('button', { name: /^History/ }))
    expect(screen.getByText('Rate')).toBeInTheDocument()
  })

  it('closed requests collapse into one quiet line with their reason', async () => {
    render(<BookingsSections todayStr={today} bookings={[b('x', { status: 'cancelled', closed_reason: 'other_accepted', scheduled_date: '2026-10-29' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /^History/ }))
    const group = screen.getByText('Closed requests (1)').closest('details')!
    expect(within(group).getByText('Another request was accepted')).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('offers "Find another cleaner" for a future clean the cleaner cancelled', async () => {
    render(<BookingsSections todayStr={today} bookings={[b('cx', { status: 'cancelled', cancelled_from_status: 'accepted', cancelled_by: 'cleaner', scheduled_date: '2026-10-25' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /^History/ }))
    expect(screen.getByRole('link', { name: 'Find another cleaner' })).toHaveAttribute('href', '/browse?rebook=cx')
  })
})
