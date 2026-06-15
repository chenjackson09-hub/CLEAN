import { filterByLocation, sortCleaners } from './cleanerSearch'
import type { CleanerResult } from './types/cleaner'

const cleaners: CleanerResult[] = [
  { id: '1', full_name: 'Sarah M.', avatar_url: null, bio: '', service_types: ['residential'], hourly_rate: 80, years_experience: 5, languages: [], distance_km: 2.1, area: 'Tel Aviv' },
  { id: '2', full_name: 'David K.', avatar_url: null, bio: '', service_types: ['commercial'], hourly_rate: 95, years_experience: 8, languages: [], distance_km: 4.7, area: 'Haifa' },
  { id: '3', full_name: 'Lena R.', avatar_url: null, bio: '', service_types: ['residential'], hourly_rate: 70, years_experience: 3, languages: [], distance_km: 1.3, area: 'Tel Aviv' },
]

describe('filterByLocation', () => {
  it('returns all cleaners when location is empty', () => {
    expect(filterByLocation(cleaners, '')).toEqual(cleaners)
  })

  it('returns only cleaners whose area matches (case-insensitive)', () => {
    const result = filterByLocation(cleaners, 'tel aviv')

    expect(result).toEqual([cleaners[0], cleaners[2]])
  })

  it('returns an empty array when no cleaners match', () => {
    expect(filterByLocation(cleaners, 'Jerusalem')).toEqual([])
  })
})

describe('sortCleaners', () => {
  it('returns cleaners in original order when sort is empty', () => {
    expect(sortCleaners(cleaners, '')).toEqual(cleaners)
  })

  it('sorts by price ascending', () => {
    const result = sortCleaners(cleaners, 'price_asc')
    expect(result.map(c => c.id)).toEqual(['3', '1', '2'])
  })

  it('sorts by price descending', () => {
    const result = sortCleaners(cleaners, 'price_desc')
    expect(result.map(c => c.id)).toEqual(['2', '1', '3'])
  })

  it('sorts by experience ascending', () => {
    const result = sortCleaners(cleaners, 'experience_asc')
    expect(result.map(c => c.id)).toEqual(['3', '1', '2'])
  })

  it('sorts by experience descending', () => {
    const result = sortCleaners(cleaners, 'experience_desc')
    expect(result.map(c => c.id)).toEqual(['2', '1', '3'])
  })

  it('does not mutate the input array', () => {
    const original = [...cleaners]
    sortCleaners(cleaners, 'price_asc')
    expect(cleaners).toEqual(original)
  })
})
