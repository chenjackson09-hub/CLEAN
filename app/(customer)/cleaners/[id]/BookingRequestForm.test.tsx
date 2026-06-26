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
  it('locks the duration when presetDuration is supplied (read-only, no select)', () => {
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
    expect(duration?.tagName).toBe('DIV')
    expect(duration).toHaveTextContent('3')
  })

  it('keeps the duration editable (a select) when no presetDuration is given', () => {
    render(
      <BookingRequestForm
        cleaner={cleaner}
        defaultOpen
        presetDate="2026-06-15"
        presetAddress="Tel Aviv"
      />
    )
    const duration = document.getElementById('duration')
    expect(duration?.tagName).toBe('SELECT')
  })
})
