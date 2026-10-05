import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CleanerProfile } from './CleanerProfile'
import type { CleanerResult } from '@/lib/types/cleaner'

const cleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough. Specialise in deep cleans and move-out cleaning for residential homes.',
  service_types: ['residential', 'commercial'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
  area: 'Tel Aviv',
}

describe('CleanerProfile', () => {
  it('renders the full name', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
  })

  it('renders the full bio without truncation', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.getByText(cleaner.bio)).toBeInTheDocument()
  })

  it('renders the hourly rate, experience, distance and area', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    // The price badge: the amount and the "/hr" unit are separate lines.
    expect(screen.getByText('₪80')).toBeInTheDocument()
    expect(screen.getByText('/hr')).toBeInTheDocument()
    expect(screen.getByText(/5 years/i)).toBeInTheDocument()
    expect(screen.getByText(/2\.1 km/i)).toBeInTheDocument()
    expect(screen.getByText(/Tel Aviv/i)).toBeInTheDocument()
  })

  it('renders a badge for each service type', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.getByText('Residential')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
  })

  it('renders languages', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    // Each language renders as its own chip.
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('HE')).toBeInTheDocument()
  })

  it('renders a Request Booking button when arriving from a dated search', () => {
    render(<CleanerProfile cleaner={cleaner} presetDate="2026-06-15" />)
    expect(screen.getByRole('button', { name: /request booking/i })).toBeInTheDocument()
  })

  it('without a dated search shows a "find cleaners" prompt instead of the booking form', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.queryByRole('button', { name: /request booking/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find cleaners/i })).toBeInTheDocument()
  })

  it('does not render a back to search button — the nav bar\'s Schedule link is the way back', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.queryByRole('button', { name: /back to search/i })).not.toBeInTheDocument()
  })

  it('renders initial avatar when avatar_url is null', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('shows availability slot badges next to the Book header for the preset date', () => {
    render(
      <CleanerProfile
        cleaner={cleaner}
        presetDate="2026-06-15"
        dateAvailability={[{ date: '2026-06-15', start_time: '08:00:00', end_time: '12:00:00' }]}
      />
    )
    expect(screen.getByText('08:00 – 12:00')).toBeInTheDocument()
  })

  it('shows no availability badges without a preset date', () => {
    render(
      <CleanerProfile
        cleaner={cleaner}
        dateAvailability={[{ date: '2026-06-15', start_time: '08:00:00', end_time: '12:00:00' }]}
      />
    )
    expect(screen.queryByText('08:00 – 12:00')).not.toBeInTheDocument()
  })
})
