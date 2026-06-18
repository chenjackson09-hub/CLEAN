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
    // The rate shows in both the booking form and the stats block.
    expect(screen.getAllByText('₪80/hr').length).toBeGreaterThan(0)
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

  it('renders a Request Booking button', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.getByRole('button', { name: /request booking/i })).toBeInTheDocument()
  })

  it('renders a back to search button', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    // Back navigation uses router.back() (preserves filters), so it's a button.
    expect(screen.getByRole('button', { name: /back to search/i })).toBeInTheDocument()
  })

  it('renders initial avatar when avatar_url is null', () => {
    render(<CleanerProfile cleaner={cleaner} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })
})
