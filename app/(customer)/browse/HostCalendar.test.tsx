import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { HostCalendar } from './HostCalendar'
import type { HostBooking } from '@/lib/hostCalendar'
import type { CleanerResult } from '@/lib/types/cleaner'

jest.mock('./CleanerCard', () => ({
  CleanerCard: ({ cleaner, cleanGroupId, duration, location, prefill }: { cleaner: CleanerResult; cleanGroupId?: string; duration?: number; location?: string; prefill?: { notes?: string } }) => (
    <div data-testid="cleaner-card" data-group={cleanGroupId ?? ''} data-duration={duration ?? ''} data-location={location ?? ''} data-notes={prefill?.notes ?? ''}>{cleaner.full_name}</div>
  ),
}))

const cleaner = (id: string, name: string): CleanerResult =>
  ({ id, full_name: name, avatar_url: null, bio: '', service_types: [], hourly_rate: 50, years_experience: 1, languages: [], distance_km: 1, rating_avg: null, rating_count: 0 }) as CleanerResult

const booked: HostBooking = {
  id: 'b1', date: '2026-10-15', start: '09:00', durationHours: 3, status: 'accepted',
  cleanerId: 'c1', cleanerName: 'Noa Rosen', groupId: null, slotStart: '09:00', slotEnd: '15:00',
}
const asked: HostBooking = { ...booked, id: 'b2', date: '2026-10-16', status: 'pending', cleanerId: 'c2', cleanerName: 'Dana Levi', slotStart: null, slotEnd: null }

const base = {
  todayStr: '2026-10-05',
  hasLocation: true,
  locationError: false,
  location: 'Tel Aviv',
  cleaners: [cleaner('c3', 'Free Cleaner')],
  dayAvail: { '2026-10-20': [{ id: 'c3', slots: [{ start: '08:00', end: '16:00' }] }] },
  bookings: [booked, asked],
}

const cell = (date: string) => document.querySelector(`[data-date="${date}"]`) as HTMLElement

describe('HostCalendar', () => {
  it('shows a booked day in green with the whole block, and requested days as asked', () => {
    render(<HostCalendar {...base} />)
    expect(within(cell('2026-10-15')).getByText('9-15')).toBeInTheDocument()
    expect(cell('2026-10-15').className).toContain('bg-green-100')
    expect(cell('2026-10-16').className).toContain('bg-orange-100')
  })

  it('opens the day sheet with the booked cleaner linking to their profile and chat', () => {
    render(<HostCalendar {...base} />)
    fireEvent.click(cell('2026-10-15'))
    expect(screen.getByRole('link', { name: 'Noa R.' })).toHaveAttribute('href', '/cleaners/c1')
    expect(screen.getByRole('link', { name: /chat with noa r\./i })).toHaveAttribute('href', '/chat/c1')
  })

  it('lists free cleaners on a free day, without a frame id in single-day mode', () => {
    render(<HostCalendar {...base} />)
    fireEvent.click(cell('2026-10-20'))
    expect(screen.getByTestId('cleaner-card')).toHaveAttribute('data-group', '')
  })

  it('flexible mode collects days and tags requests with one shared frame id', () => {
    render(<HostCalendar {...base} />)
    fireEvent.click(screen.getByRole('button', { name: 'Flexible days' }))
    fireEvent.click(cell('2026-10-20'))
    fireEvent.click(cell('2026-10-21'))
    expect(screen.getByText('2 days selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Find cleaners' }))
    expect(screen.getByTestId('cleaner-card').getAttribute('data-group')).not.toBe('')
  })

  it('does not let past days be picked in flexible mode', () => {
    render(<HostCalendar {...base} />)
    fireEvent.click(screen.getByRole('button', { name: 'Flexible days' }))
    fireEvent.click(cell('2026-10-02'))
    expect(screen.getByText('0 days selected')).toBeInTheDocument()
  })

  it('"Find another cleaner" opens the cancelled request’s day with details carried over, without the cleaner who cancelled', () => {
    const props = {
      ...base,
      cleaners: [cleaner('c3', 'Free Cleaner'), cleaner('c9', 'Maya Levi')],
      dayAvail: { '2026-10-20': [
        { id: 'c3', slots: [{ start: '08:00', end: '16:00' }] },
        { id: 'c9', slots: [{ start: '08:00', end: '16:00' }] },
      ] },
      rebook: {
        bookingId: 'old', date: '2026-10-20', cleanerId: 'c9', cleanerName: 'Maya Levi', address: '12 Herzl, Haifa', duration: 3,
        prefill: { startTime: '10:00', notes: 'Key under the mat', extras: ['oven'], petsPresent: false, hostPresent: true },
      },
    }
    render(<HostCalendar {...props} />)
    // the sheet is already open on the right day, with a banner
    expect(screen.getByText(/Maya L\. had to cancel this cleaning/)).toBeInTheDocument()
    const cards = screen.getAllByTestId('cleaner-card')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('Free Cleaner')
    expect(cards[0]).toHaveAttribute('data-duration', '3')
    expect(cards[0]).toHaveAttribute('data-location', '12 Herzl, Haifa')
    expect(cards[0]).toHaveAttribute('data-notes', 'Key under the mat')
  })
})
