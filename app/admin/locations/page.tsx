import { unstable_noStore as noStore } from 'next/cache'
import { loadLocationsOverview, loadRecentChanges } from '@/lib/locationsData'
import { resolvePeriod, searchKeys, isLocationStatus } from '@/lib/locations'
import { LocationsView } from './LocationsView'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25
const SORTS = ['name', 'hosts', 'active', 'cleaners', 'requests', 'waiting', 'growth']

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

// Server-rendered, server-paginated: every filter lives in the URL and the SQL
// functions (migration 0040) return one page of aggregates — no user rows are loaded.
export default async function AdminLocationsPage({ searchParams }: { searchParams?: SP }) {
  noStore()
  const sp = searchParams ?? {}
  const period = resolvePeriod(one(sp.period), one(sp.from), one(sp.to))
  const q = (one(sp.q) ?? '').slice(0, 80)
  const keys = searchKeys(q)
  const status = isLocationStatus(one(sp.status)) ? (one(sp.status) as string) : ''
  const sortRaw = one(sp.sort) ?? 'hosts'
  const sort = SORTS.includes(sortRaw) ? sortRaw : 'hosts'
  const dir = one(sp.dir) === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, parseInt(one(sp.page) ?? '1', 10) || 1)
  const district = (one(sp.district) ?? '').slice(0, 40)
  const onlyWithUsers = one(sp.users) === '1'

  const [data, recent] = await Promise.all([
    loadLocationsOverview({
      period, ...keys, district, status, onlyWithUsers, sort, dir, page, pageSize: PAGE_SIZE,
    }),
    loadRecentChanges(),
  ])

  return (
    <LocationsView
      setupNeeded={data.setupNeeded}
      rows={data.rows}
      total={data.total}
      totals={data.totals}
      fastest={data.fastest}
      districts={data.districts}
      recent={recent}
      page={page}
      pageSize={PAGE_SIZE}
      query={{
        period: period.key, from: period.from ?? '', to: period.to ?? '', q, district, status, sort, dir, users: onlyWithUsers,
      }}
    />
  )
}
