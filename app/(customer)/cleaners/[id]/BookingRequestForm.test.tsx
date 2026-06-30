import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingRequestForm } from './BookingRequestForm'
import type { CleanerResult } from '@/lib/types/cleaner'

const cleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough.',
  service_types: ['residential'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN'],
  distance_km: 0,
}

describe('BookingRequestForm duration field', () => {
  it('shows the searched duration read-only (carried over from the filter, not editable)', () => {
    render(
      <BookingRequestForm
        cleaner={cleaner}
        defaultOpen
        presetDate="2026-06-15"
        presetAddress="Tel Aviv"
        presetDuration={3}
      />
    )
    const duration = document.getElementById('duration')
    expect(duration?.tagName).not.toBe('SELECT')
    expect(duration?.textContent).toContain('3')
  })

  it('shows "Not sure" read-only when no presetDuration is given', () => {
    render(
      <BookingRequestForm
        cleaner={cleaner}
        defaultOpen
        presetDate="2026-06-15"
        presetAddress="Tel Aviv"
      />
    )
    const duration = document.getElementById('duration')
    expect(duration?.tagName).not.toBe('SELECT')
    expect(duration?.textContent).toBe('Not sure')
  })

  it('does not render a start-time field', () => {
    render(
      <BookingRequestForm
        cleaner={cleaner}
        defaultOpen
        presetDate="2026-06-15"
        presetAddress="Tel Aviv"
      />
    )
    expect(document.getElementById('startTime')).toBeNull()
  })
})
