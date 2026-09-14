import type { BookingSummaryData } from '@/components/BookingRequestSummary'

// The host's home/pet snapshot read live from their `customers` profile row —
// shared shape for every surface that needs to build a BookingSummaryData
// (the cleaner's pending-request view, the cleaner's accepted/completed clean
// view, the customer's own booking detail, and admin's booking detail).
export type CustomerHomeInfo = {
  dwelling_type: 'apartment' | 'house' | 'guesthouse' | 'office' | 'villa' | 'other' | null
  bedrooms: number | null
  num_rooms: number | null
  bathrooms: number | null
  pet_types: ('dog' | 'cat' | 'other')[]
  num_pets: number | null
}

type BookingLike = {
  scheduled_date: string
  scheduled_start: string
  duration_hours: number
  address: string
  cleaning_type?: 'regular' | 'deep' | null
  extras?: string[] | null
  pets_present?: boolean | null
  host_present?: boolean | null
  notes?: string | null
}

// One place to turn a booking row + the host's live home/pet snapshot + the
// cleaner's rate into the read-only BookingRequestSummary shape — so every
// surface that shows a booking's full detail (the cleaner's pending-request
// view, the cleaner's accepted/completed clean, the customer's own booking
// detail, and admin's booking detail) builds it the same way and can't drift.
export function buildBookingSummaryData(
  booking: BookingLike,
  homeInfo: CustomerHomeInfo | null | undefined,
  hourlyRate: number | null | undefined
): BookingSummaryData {
  const hasPets = (homeInfo?.pet_types.length ?? 0) > 0
  const petsLabel = homeInfo && hasPets
    ? (() => {
        const kind = homeInfo.pet_types[0]
        const noun = kind === 'dog' ? 'dog' : kind === 'cat' ? 'cat' : 'pet'
        const n = homeInfo.num_pets ?? homeInfo.pet_types.length
        return `${n} ${noun}${n === 1 ? '' : 's'}`
      })()
    : null

  return {
    scheduledDate: booking.scheduled_date,
    scheduledStart: booking.scheduled_start,
    durationHours: booking.duration_hours,
    homeDwellingType: homeInfo?.dwelling_type ?? null,
    homeArea: booking.address,
    homeBedrooms: homeInfo?.bedrooms ?? homeInfo?.num_rooms ?? null,
    homeBathrooms: homeInfo?.bathrooms ?? null,
    cleaningType: booking.cleaning_type ?? null,
    extras: booking.extras ?? [],
    petsLabel,
    petsPresent: hasPets ? booking.pets_present ?? null : null,
    hostPresent: booking.host_present ?? null,
    notes: booking.notes ?? null,
    hourlyRate: hourlyRate ?? null,
  }
}
