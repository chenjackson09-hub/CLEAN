import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CleanerCard } from './CleanerCard'
import type { CleanerResult } from '@/lib/types/cleaner'

const baseCleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough. Specialise in deep cleans and move-out cleaning.',
  service_types: ['residential'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
}

describe('CleanerCard', () => {
  it('renders name, distance, and experience', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText(/2\.1km away/i)).toBeInTheDocument()
    expect(screen.getByText(/5 yrs exp/i)).toBeInTheDocument()
  })

  it('renders the area badge when set', () => {
    render(<CleanerCard cleaner={{ ...baseCleaner, area: 'Tel Aviv' }} />)
    expect(screen.getByText('Tel Aviv')).toBeInTheDocument()
  })

  it('does not render languages (those are profile-page only)', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.queryByText(/EN, HE/i)).not.toBeInTheDocument()
  })

  it('renders hourly rate', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    // Price appears in both the desktop and mobile layout branches.
    expect(screen.getAllByText('₪80/hr').length).toBeGreaterThan(0)
  })

  it('renders View Profile link pointing to /cleaners/{id}', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    // Desktop + mobile branches each render a link; both point to the same place.
    const links = screen.getAllByRole('link', { name: /view profile/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach(link => expect(link).toHaveAttribute('href', '/cleaners/abc-123'))
  })

  it('carries date, location and duration into the View Profile link', () => {
    render(<CleanerCard cleaner={baseCleaner} date="2026-06-15" location="Tel Aviv" duration={3} />)
    const links = screen.getAllByRole('link', { name: /view profile/i })
    links.forEach(link => {
      const href = link.getAttribute('href') ?? ''
      expect(href).toContain('/cleaners/abc-123?')
      expect(href).toContain('date=2026-06-15')
      expect(href).toContain('duration=3')
    })
  })

  it('renders initial avatar when avatar_url is null', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders img when avatar_url is set', () => {
    render(<CleanerCard cleaner={{ ...baseCleaner, avatar_url: 'https://example.com/photo.jpg' }} />)
    expect(screen.getByRole('img', { name: 'Sarah M.' })).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })
})
