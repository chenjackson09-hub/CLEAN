// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
import { Nav } from '../Nav'
import { FilterBar } from './FilterBar'
import { BrowseResults } from './BrowseResults'
import { filterByLocation, sortCleaners } from '@/lib/cleanerSearch'
import { MOCK_CLEANERS } from '@/lib/mockData/cleaners'

type Props = {
  searchParams: { days?: string; timeOfDay?: string; type?: string; location?: string; sort?: string }
}

export default async function BrowsePage({ searchParams }: Props) {
  const { days, timeOfDay, type, location, sort } = searchParams
  const hasFilters = type !== undefined

  const cleaners = hasFilters ? sortCleaners(filterByLocation(MOCK_CLEANERS, location ?? ''), sort ?? '') : null
  const error = null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <FilterBar defaultValues={hasFilters ? { days: days ? days.split(',').map(Number) : [], timeOfDay: timeOfDay ? timeOfDay.split(',') : [], type: type!, location, sort } : undefined} />

      <BrowseResults hasFilters={hasFilters} error={!!error} cleaners={cleaners} location={location} />
    </div>
  )
}
