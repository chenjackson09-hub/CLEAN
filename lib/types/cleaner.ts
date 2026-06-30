export type CleanerFilters = {
  day: number          // 0 = Sunday ... 6 = Saturday
  start: string        // 'HH:MM'
  end: string          // 'HH:MM'
  type: 'residential' | 'commercial' | 'both'
}

export type CleanerResult = {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string
  service_types: string[]
  hourly_rate: number
  years_experience: number
  languages: string[]
  distance_km: number
  area?: string
  email?: string
  phone?: string
  // Average rating out of 5 (null when never rated) and how many ratings it's
  // based on. See migration 0011.
  rating_avg?: number | null
  rating_count?: number
  // Hours the cleaner will accept a clean for (null = no limit). Constrains the
  // booking form's duration options. See migration 0013.
  min_hours?: number | null
  max_hours?: number | null
  // The cleaner's available time slots for the date group this result is shown
  // under (union of weekly + specific-date slots). Per-date, so it's attached
  // when building each day's group rather than on the shared base result.
  availability?: Array<{ start: string; end: string }>
}

// Browse results grouped by a selected date (one accordion section per day).
export type DateGroup = {
  date: string // 'YYYY-MM-DD'
  cleaners: CleanerResult[]
}
