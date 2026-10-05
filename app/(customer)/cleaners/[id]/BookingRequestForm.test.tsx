import { waitFor } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingRequestForm } from './BookingRequestForm'
import type { CleanerResult } from '@/lib/types/cleaner'

// The draft form renders only after it has read the host's own profile row.
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'host-1' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { dwelling_type: 'house', bedrooms: 2, num_rooms: null, bathrooms: 1, pet_types: [], num_pets: null, usual_cleaning_type: 'regular', address: null },
            }),
        }),
      }),
    }),
  }),
}))

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

describe('BookingRequestForm draft card', () => {
  const open = async (extra: Record<string, unknown> = {}) => {
    render(<BookingRequestForm cleaner={cleaner} defaultOpen presetDate="2026-06-15" presetAddress="Tel Aviv" {...extra} />)
    await waitFor(() => expect(document.getElementById('duration')).not.toBeNull())
  }

  it('pre-selects the searched duration (still editable)', async () => {
    await open({ presetDuration: 4 })
    const duration = document.getElementById('duration') as HTMLSelectElement
    expect(duration.tagName).toBe('SELECT')
    expect(duration.value).toBe('4')
  })

  it('has an editable start time and the searched date', async () => {
    await open()
    expect((document.getElementById('startTime') as HTMLSelectElement).tagName).toBe('SELECT')
    expect((document.getElementById('date') as HTMLInputElement).value).toBe('2026-06-15')
  })

  it("defaults the cleaning type from the host's profile", async () => {
    await open()
    expect((document.getElementById('cleaningType') as HTMLSelectElement).value).toBe('regular')
  })
})
