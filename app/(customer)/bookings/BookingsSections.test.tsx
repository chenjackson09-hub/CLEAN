import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingsSections } from './BookingsSections'
import type { BookingResult } from '@/lib/types/booking'

const base: BookingResult = {
  id: 'b', cleaner_name: 'Maya Levi', cleaner_avatar_url: null, service_type: 'residential',
  scheduled_date: '2099-01-10', scheduled_start: '10:00', duration_hours: 3, address: 'Haifa', status: 'cancelled',
}
const cancelledClean: BookingResult = { ...base, id: 'c1', cancelled_by: 'host', cancelled_from_status: 'accepted', cancellation_reason: 'plans_changed' }
const refused: BookingResult = { ...base, id: 'r1', status: 'declined' }

function setup() {
  render(<BookingsSections confirmed={[]} pending={[]} cancelled={[cancelledClean]} inactive={[refused]} past={[]} todayStr="2026-10-08" />)
}

describe('Bookings tabs', () => {
  it('keeps cancelled cleans in their own "Cancelled" tab, apart from closed requests', async () => {
    setup()
    expect(screen.getByRole('button', { name: /^Cancelled/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Closed requests/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Cancelled/ }))
    expect(screen.getByText('You cancelled this cleaning')).toBeInTheDocument()
    expect(screen.queryByText('Declined')).not.toBeInTheDocument()
  })

  it('a cancelled clean is a permanent record: no "Mark as seen"', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /^Cancelled/ }))
    expect(screen.queryByText('Mark as seen')).not.toBeInTheDocument()
  })

  it('closed requests can still be dismissed', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /^Closed requests/ }))
    expect(screen.getByText('Mark as seen')).toBeInTheDocument()
  })
})
