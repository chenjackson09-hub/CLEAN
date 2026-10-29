import userEvent from '@testing-library/user-event'
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
    // "At a glance": each language is its own chip next to a "Languages" label.
    expect(screen.getByText('Languages')).toBeInTheDocument()
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

  describe('redesigned profile', () => {
    const rich = {
      ...cleaner,
      bio: 'I have been cleaning homes for several years and love paying attention to the little details. '.repeat(3),
      rating_avg: 4,
      rating_count: 2,
      cleans_completed: 3,
      min_hours: 3,
      max_hours: 6,
      has_car: true,
      gas_return_enabled: true,
      gas_return_rate: 1,
      match_preferences: ['recurring' as const],
      cleaning_categories: ['General cleaning', 'Deep cleaning'],
    }

    it('shows the rating with the number of cleans, and the two stat tiles', () => {
      render(<CleanerProfile cleaner={rich} />)
      expect(screen.getByText('4.0')).toBeInTheDocument()
      expect(screen.getByText(/2 cleans/)).toBeInTheDocument()
      expect(screen.getByText('Completed cleans')).toBeInTheDocument()
      expect(screen.getByText(/^3–6 /)).toBeInTheDocument()
      expect(screen.getByText('Job duration')).toBeInTheDocument()
    })

    it('lists services as pills and details as icon rows', () => {
      render(<CleanerProfile cleaner={rich} />)
      expect(screen.getByRole('heading', { name: 'Cleaning services' })).toBeInTheDocument()
      expect(screen.getByText('Deep cleaning')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Preferences & details' })).toBeInTheDocument()
      expect(screen.getByText('Gas returns')).toBeInTheDocument()
      expect(screen.getByText(/₪1 \/ km/)).toBeInTheDocument()
    })

    it('shows experience and job length as tiles next to completed cleans, not as list rows', () => {
      render(<CleanerProfile cleaner={{ ...rich, years_experience: 2 }} />)
      expect(screen.getByText('2 years')).toBeInTheDocument()
      expect(screen.getByText('Experience')).toBeInTheDocument()
      expect(screen.getByText('Job duration')).toBeInTheDocument()
    })

    it('"either is fine" writes out both options so a host knows what it means', () => {
      render(<CleanerProfile cleaner={{ ...rich, match_preferences: ['recurring', 'occasional'] }} />)
      expect(screen.getByText('A recurring family · Occasional jobs')).toBeInTheDocument()
    })

    it('shows Cindy Verified only for a cleaner an admin has verified', () => {
      const { rerender } = render(<CleanerProfile cleaner={rich} />)
      expect(screen.queryByText('Cindy Verified')).not.toBeInTheDocument()
      rerender(<CleanerProfile cleaner={{ ...rich, cindy_verified: true }} />)
      expect(screen.getByText('Cindy Verified')).toBeInTheDocument()
    })

    it('does not show the photo gallery while it is switched off', () => {
      render(<CleanerProfile cleaner={rich} gallery={['https://x/a.jpg']} />)
      expect(screen.queryByRole('img', { name: /photo/i })).not.toBeInTheDocument()
    })

    it('a long bio is cut off and "Read more" opens it', async () => {
      render(<CleanerProfile cleaner={rich} />)
      const readMore = screen.getByRole('button', { name: 'Read more' })
      expect(readMore).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(readMore)
      expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
    })

    it('has a back button, and an edit button only when it is the cleaner\'s own preview', () => {
      const { rerender } = render(<CleanerProfile cleaner={rich} />)
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      rerender(<CleanerProfile cleaner={rich} editHref="/cleaner/profile?edit=1" bookingDisabled />)
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })
  })
})
