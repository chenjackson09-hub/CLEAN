'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DashboardKpiCard } from './DashboardKpiCard'
import { NeedsAttentionPanel } from './NeedsAttentionPanel'
import { RecentActivityFeed } from './RecentActivityFeed'
import { TopAreasWidget } from './TopAreasWidget'

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
  recentBookings,
  areaAddresses,
}: Props) {
  const { t } = useLanguage()

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeedsAttentionPanel unmatchedCount={unmatchedCount} pendingApplications={pendingApplications} />
        <RecentActivityFeed bookings={recentBookings} />
        <TopAreasWidget addresses={areaAddresses} />
      </div>
    </>
  )
}
