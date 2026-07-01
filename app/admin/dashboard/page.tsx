import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardContent } from './DashboardContent'
import { unstable_noStore as noStore } from 'next/cache'

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  noStore()
  const admin = createAdminClient()

  const now = new Date()
  const thisWeekStart = startOfWeek(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

  const [
    { data: cleanerRows },
    { data: customerProfileRows },
    { data: appRows },
    { data: bookingRows },
  ] = await Promise.all([
    admin.from('cleaners').select('status'),
    admin.from('profiles').select('id, created_at').eq('role', 'customer'),
    admin.from('cleaner_applications').select('status'),
    admin
      .from('bookings')
      .select('id, status, address, created_at, responded_at, scheduled_date, cleaner_id, customer_id')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const cleaners = cleanerRows ?? []
  const totalCleaners = cleaners.length
  const activeCleaners = cleaners.filter((c) => c.status === 'active').length
  const newCleaners = cleaners.filter((c) => c.status === 'new').length

  const customers = customerProfileRows ?? []
  const totalHosts = customers.length
  const newHostsThisMonth = customers.filter((c) => c.created_at && new Date(c.created_at) >= thisMonthStart).length

  const applications = appRows ?? []
  const pendingApplications = applications.filter((a) => a.status === 'pending').length

  const bookings = bookingRows ?? []
  const matchesThisWeek = bookings.filter(
    (b) => b.status === 'accepted' && b.responded_at && new Date(b.responded_at) >= thisWeekStart,
  ).length
  const matchesLastWeek = bookings.filter(
    (b) =>
      b.status === 'accepted' &&
      b.responded_at &&
      new Date(b.responded_at) >= lastWeekStart &&
      new Date(b.responded_at) < thisWeekStart,
  ).length
  const matchesChangePct =
    matchesLastWeek === 0 ? null : Math.round(((matchesThisWeek - matchesLastWeek) / matchesLastWeek) * 100)

  const decidedBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'completed' || b.status === 'cancelled')
  const cancelledBookings = decidedBookings.filter((b) => b.status === 'cancelled')
  const cancellationRate = decidedBookings.length === 0 ? null : Math.round((cancelledBookings.length / decidedBookings.length) * 100)

  const unmatchedCount = bookings.filter((b) => b.status === 'pending' && new Date(b.created_at) < twoHoursAgo).length

  const recentSlice = bookings.slice(0, 8)
  const recentProfileIds = Array.from(new Set(recentSlice.flatMap((b) => [b.cleaner_id, b.customer_id])))
  const { data: recentProfileRows } = recentProfileIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', recentProfileIds)
    : { data: [] }
  const recentProfileMap = new Map((recentProfileRows ?? []).map((p) => [p.id, p.full_name]))

  const recentBookings = recentSlice.map((b) => ({
    id: b.id,
    status: b.status,
    created_at: b.created_at,
    cleaner_name: recentProfileMap.get(b.cleaner_id) ?? null,
    customer_name: recentProfileMap.get(b.customer_id) ?? null,
  }))

  const thisWeekAreas = bookings
    .filter((b) => new Date(b.created_at) >= thisWeekStart)
    .map((b) => b.address)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D3F0F0] via-[#DFF0ED] to-[#FFFFFF]">
      <Nav />
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <DashboardContent
          totalCleaners={totalCleaners}
          activeCleaners={activeCleaners}
          newCleaners={newCleaners}
          totalHosts={totalHosts}
          newHostsThisMonth={newHostsThisMonth}
          pendingApplications={pendingApplications}
          matchesThisWeek={matchesThisWeek}
          matchesChangePct={matchesChangePct}
          cancellationRate={cancellationRate}
          unmatchedCount={unmatchedCount}
          recentBookings={recentBookings}
          areaAddresses={thisWeekAreas}
        />
      </div>
    </div>
  )
}
