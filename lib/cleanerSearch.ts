import type { CleanerResult } from './types/cleaner'

export function filterByLocation(cleaners: CleanerResult[], location: string): CleanerResult[] {
  if (!location.trim()) return cleaners

  const query = location.trim().toLowerCase()
  return cleaners.filter(c => c.area?.toLowerCase().includes(query))
}

export function sortCleaners(cleaners: CleanerResult[], sort: string): CleanerResult[] {
  switch (sort) {
    case 'price_asc':
      return [...cleaners].sort((a, b) => a.hourly_rate - b.hourly_rate)
    case 'price_desc':
      return [...cleaners].sort((a, b) => b.hourly_rate - a.hourly_rate)
    case 'experience_asc':
      return [...cleaners].sort((a, b) => a.years_experience - b.years_experience)
    case 'experience_desc':
      return [...cleaners].sort((a, b) => b.years_experience - a.years_experience)
    default:
      return cleaners
  }
}
