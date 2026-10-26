import { render, screen } from '@testing-library/react'
import { AddToCalendarButton } from './AddToCalendarButton'

const future = new Date(Date.now() + 5 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
const past = new Date(Date.now() - 5 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })

const booking = {
  id: 'a1b2c3d4-0000-4000-8000-000000000000',
  status: 'accepted',
  scheduled_date: future,
  scheduled_start: '09:00:00',
  duration_hours: 3,
  cleaning_type: 'regular' as const,
  area: { he: 'בית הלל', en: 'Beit Hillel' },
  // Not part of the button's props type on purpose — extra fields must be ignored.
  address: 'Herzl 5, apartment 12, Beit Hillel',
} as Parameters<typeof AddToCalendarButton>[0]['booking']

const href = () => screen.getByRole('link', { name: /Add to Google Calendar/ }).getAttribute('href')!

describe('AddToCalendarButton', () => {
  it('opens a prefilled Google Calendar event in a new tab for a confirmed upcoming clean', () => {
    render(<AddToCalendarButton booking={booking} role="host" lang="en" withName="Noa R." hourlyRate={80} otherUserId="cleaner-1" />)
    const link = screen.getByRole('link', { name: /Add to Google Calendar/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    const p = new URL(href()).searchParams
    expect(p.get('action')).toBe('TEMPLATE')
    expect(p.get('location')).toBe('Beit Hillel')
    expect(p.get('details')).toContain('/bookings?booking=a1b2c3d4-0000-4000-8000-000000000000')
    expect(p.get('text')).toBe('Cleaning Booked - Noa R.')
    expect(p.get('details')).toMatch(/\/chat\/cleaner-1$/)
    expect(p.get('details')).toContain('<b>Rate:</b> ₪80 per hour')
  })

  it('never puts the street address in the event', () => {
    render(<AddToCalendarButton booking={booking} role="host" lang="en" />)
    const all = decodeURIComponent(href().replace(/\+/g, ' '))
    expect(all).not.toMatch(/Herzl|apartment/i)
  })

  it('works for the cleaner too, linking to their dashboard, in Hebrew', () => {
    render(<AddToCalendarButton booking={booking} role="cleaner" lang="he" withName="דנה כהן" otherUserId="host-1" />)
    const link = screen.getByRole('link', { name: /הוספה ליומן Google/ })
    const p = new URL(link.getAttribute('href')!).searchParams
    expect(p.get('location')).toBe('בית הלל')
    expect(p.get('details')).toContain('/cleaner/dashboard?booking=')
    expect(p.get('details')).toMatch(/\/cleaner\/chat\/host-1$/)
  })

  it('has no location when the area is unknown', () => {
    render(<AddToCalendarButton booking={{ ...booking, area: null }} role="host" lang="en" />)
    expect(new URL(href()).searchParams.has('location')).toBe(false)
  })

  it.each(['pending', 'declined', 'cancelled', 'completed'])('is hidden for a %s booking', (status) => {
    render(<AddToCalendarButton booking={{ ...booking, status }} role="host" lang="en" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('is hidden once the day has passed', () => {
    render(<AddToCalendarButton booking={{ ...booking, scheduled_date: past }} role="host" lang="en" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('does not claim the event was saved', () => {
    render(<AddToCalendarButton booking={booking} role="host" lang="en" />)
    expect(screen.getByText(/press Save there/)).toBeInTheDocument()
    expect(screen.queryByText(/added|saved/i)).toBeNull()
  })
})
