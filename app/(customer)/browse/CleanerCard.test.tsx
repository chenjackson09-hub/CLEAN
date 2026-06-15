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

  it('renders bio truncated to 80 chars', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.getByText(/Reliable and thorough/i)).toBeInTheDocument()
  })

  it('truncates bio longer than 80 chars with ellipsis', () => {
    const longBio = 'A'.repeat(100)
    render(<CleanerCard cleaner={{ ...baseCleaner, bio: longBio }} />)
    expect(screen.getByText(`"${'A'.repeat(80)}…"`)).toBeInTheDocument()
  })

  it('renders service type badge', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('renders both badge when cleaner has residential + commercial', () => {
    render(<CleanerCard cleaner={{ ...baseCleaner, service_types: ['residential', 'commercial'] }} />)
    expect(screen.getByText('Both')).toBeInTheDocument()
  })

  it('renders languages', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.getByText(/EN, HE/i)).toBeInTheDocument()
  })

  it('renders hourly rate', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    expect(screen.getByText('₪80/hr')).toBeInTheDocument()
  })

  it('renders View Profile link pointing to /cleaners/{id}', () => {
    render(<CleanerCard cleaner={baseCleaner} />)
    const link = screen.getByRole('link', { name: /view profile/i })
    expect(link).toHaveAttribute('href', '/cleaners/abc-123')
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
