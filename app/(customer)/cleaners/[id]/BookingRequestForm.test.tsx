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
  it('pre-selects the duration when presetDuration is supplied, but keeps it editable', () => {
    render(
      <BookingRequestForm
        cleaner={cleaner}
        defaultOpen
        presetDate="2026-06-15"
        presetAddress="Tel Aviv"
        presetDuration={3}
      />
    )
    const duration = document.getElementById('duration') as HTMLSelectElement | null
    expect(duration?.tagName).toBe('SELECT')
    expect(duration?.value).toBe('3')
  })

  it('defaults the duration to "Not sure" (a select) when no presetDuration is given', () => {
    render(
      <BookingRequestForm
        cleaner={cleaner}
        defaultOpen
        presetDate="2026-06-15"
        presetAddress="Tel Aviv"
      />
    )
    const duration = document.getElementById('duration') as HTMLSelectElement | null
    expect(duration?.tagName).toBe('SELECT')
    expect(duration?.value).toBe('any')
  })
})
