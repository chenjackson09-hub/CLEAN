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
}
