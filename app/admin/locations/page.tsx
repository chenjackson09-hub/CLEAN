import { unstable_noStore as noStore } from 'next/cache'
import { loadLocationsPage, loadRecentChanges, loadRegionsOverview } from '@/lib/locationsData'
import { parseFilters } from '@/lib/locations'
import { LocationsShell } from './LocationsShell'
import { ManageView } from './ManageView'
import { RegionsView } from './RegionsView'
import { RecentChanges } from './RecentChanges'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

type SP = Record<string, string | string[] | undefined>

// Server-rendered and server-paginated: every filter lives in the URL, and the SQL
// functions (migration 0041) return aggregates for one page — no people are loaded.
export default async function AdminLocationsPage({ searchParams }: { searchParams?: SP }) {
  noStore()
  const filters = parseFilters(searchParams ?? {})

  if (filters.tab === 'regions') {
    const [overview, recent] = await Promise.all([loadRegionsOverview(), loadRecentChanges()])
    return (
      <LocationsShell tab="regions" setupNeeded={overview.setupNeeded}>
        <RegionsView regions={overview.regions} />
        <RecentChanges changes={recent} />
      </LocationsShell>
    )
  }

  const [data, recent] = await Promise.all([loadLocationsPage(filters, PAGE_SIZE), loadRecentChanges()])
  return (
    <LocationsShell tab="manage" setupNeeded={data.setupNeeded}>
      {data.summary && (
        <ManageView
          summary={data.summary}
          rows={data.rows}
          total={data.total}
          regions={data.regions}
          districts={data.districts}
          filters={filters}
          page={filters.page}
          pageSize={PAGE_SIZE}
        />
      )}
      <RecentChanges changes={recent} />
    </LocationsShell>
  )
}
