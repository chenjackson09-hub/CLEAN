'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DashboardKpiCard } from './DashboardKpiCard'
import { NeedsAttentionPanel } from './NeedsAttentionPanel'
import { RecentActivityFeed } from './RecentActivityFeed'
import { TopAreasWidget } from './TopAreasWidget'

// One rating average within the combined ratings card.
function RatingStat({ label, value, count }: { label: string; value: string; count: number }) {
  return (
    <div className="flex-1 min-w-0 px-2 text-center">
      <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">{value}</div>
      <div className="text-xs font-semibold text-gray-600 mt-0.5 truncate">{label}</div>
      {count > 0 && <div className="text-[11px] text-gray-400">{count}</div>}
    </div>
  )
}

interface RecentBooking {
  id: string
  status: string
  created_at: string
  cleaner_name: string | null
  customer_name: string | null
}

interface Props {
  totalCleaners: number
  activeCleaners: number
  newCleaners: number
  totalHosts: number
  newHostsThisMonth: number
  pendingApplications: number
  matchesThisWeek: number
  matchesChangePct: number | null
  cancellationRate: number | null
  unmatchedCount: number
  minorCleanersPending: number
  overallRatingAvg: number | null
  overallRatingCount: number
  cleanersRatingAvg: number | null
  cleanersRatingCount: number
  customersRatingAvg: number | null
  customersRatingCount: number
  recentBookings: RecentBooking[]
  areaAddresses: string[]
}

export function DashboardContent({
  totalCleaners,
  activeCleaners,
  newCleaners,
  totalHosts,
  newHostsThisMonth,
  pendingApplications,
  matchesThisWeek,
  matchesChangePct,
  cancellationRate,
  unmatchedCount,
  minorCleanersPending,
  overallRatingAvg,
  overallRatingCount,
  cleanersRatingAvg,
  cleanersRatingCount,
  customersRatingAvg,
  customersRatingCount,
  recentBookings,
  areaAddresses,
}: Props) {
  const { t } = useLanguage()

  const fmtRating = (avg: number | null) => (avg == null ? '—' : `${avg.toFixed(1)} ★`)

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{t('admin.dashboard.title')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <DashboardKpiCard
          href="/admin/cleaners"
          value={totalCleaners}
          label={t('admin.dashboard.cleaners')}
          sub={t('admin.dashboard.cleanersSub', { active: activeCleaners, new: newCleaners })}
        />
        <DashboardKpiCard
          href="/admin/customers"
          value={totalHosts}
          label={t('admin.dashboard.hosts')}
          sub={t('admin.dashboard.hostsSub', { count: newHostsThisMonth })}
        />
        <DashboardKpiCard
          href="/admin/applications"
          value={pendingApplications}
          label={t('admin.dashboard.applications')}
          sub={t('admin.dashboard.applicationsSub')}
          highlight={pendingApplications > 0}
        />
        <DashboardKpiCard
          href="/admin/bookings"
          value={matchesThisWeek}
          label={t('admin.dashboard.matches')}
          sub={matchesChangePct === null ? undefined : `${matchesChangePct >= 0 ? '+' : ''}${matchesChangePct}%`}
        />
        <DashboardKpiCard
          href="/admin/bookings"
          value={unmatchedCount}
          label={t('admin.dashboard.unmatched')}
          sub={t('admin.dashboard.unmatchedSub')}
          highlight={unmatchedCount > 0}
        />
        <DashboardKpiCard
          href="/admin/bookings"
          value={cancellationRate === null ? '—' : `${cancellationRate}%`}
          label={t('admin.dashboard.cancellationRate')}
        />
        {/* All three rating averages combined on one card. */}
        <div className="col-span-2 rounded-2xl p-4 shadow-2xl bg-white border border-gray-100">
          <div className="text-sm font-semibold text-gray-700 mb-3">{t('admin.dashboard.ratingsTitle')}</div>
          <div className="flex items-stretch divide-x divide-gray-100">
            <RatingStat label={t('admin.dashboard.ratingOverall')} value={fmtRating(overallRatingAvg)} count={overallRatingCount} />
            <RatingStat label={t('admin.dashboard.ratingCleaners')} value={fmtRating(cleanersRatingAvg)} count={cleanersRatingCount} />
            <RatingStat label={t('admin.dashboard.ratingCustomers')} value={fmtRating(customersRatingAvg)} count={customersRatingCount} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeedsAttentionPanel
          unmatchedCount={unmatchedCount}
          pendingApplications={pendingApplications}
          minorCleanersPending={minorCleanersPending}
        />
        <RecentActivityFeed bookings={recentBookings} />
        <TopAreasWidget addresses={areaAddresses} />
      </div>
    </>
  )
}
