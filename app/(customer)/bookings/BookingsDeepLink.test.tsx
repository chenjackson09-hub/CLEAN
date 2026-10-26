import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import type { BookingResult } from '@/lib/types/booking'

// A link from an "Add to Google Calendar" event: /bookings?booking=<id>
let linked: string | null = null
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/bookings',
  useSearchParams: () => new URLSearchParams(linked ? `booking=${linked}` : ''),
}))

import { BookingsSections } from './BookingsSections'

const today = '2026-10-10'
const b = (id: string, over: Partial<BookingResult>): BookingResult => ({
  id, cleaner_name: 'Maya Levi', cleaner_avatar_url: null, service_type: 'residential',
  scheduled_date: '2026-10-20', scheduled_start: '09:00', duration_hours: 3, address: '12 Herzl, Haifa', status: 'accepted', ...over,
})

describe('opening a booking from a calendar link', () => {
  it('opens the linked booking’s detail straight away', () => {
    linked = 'a'
    render(<BookingsSections bookings={[b('a', {}), b('z', { cleaner_name: 'Dana Cohen' })]} todayStr={today} />)
    // The street address only appears inside an opened detail (twice: summary + address block), and only for the linked booking.
    expect(screen.getAllByText('12 Herzl, Haifa')).toHaveLength(2)
  })

  it('opens nothing for a booking id that is not in the host’s own list', () => {
    linked = 'someone-elses-booking'
    render(<BookingsSections bookings={[b('a', {})]} todayStr={today} />)
    expect(screen.queryByText('12 Herzl, Haifa')).toBeNull()
  })

  it('shows the History tab when the linked booking is a past one', () => {
    linked = 'old'
    render(<BookingsSections bookings={[b('a', {}), b('old', { status: 'completed', scheduled_date: '2026-09-05' })]} todayStr={today} />)
    expect(screen.getAllByText('12 Herzl, Haifa')).toHaveLength(2)
  })
})
