import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
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

  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }
  const firstName = (profile?.full_name ?? '').trim().split(' ')[0] ?? ''

  const now = new Date()
  const thisWeekStart = startOfWeek(now)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

  const [
    { data: cleanerRows },
    { data: customerProfileRows },
    { data: customerRatingRows },
    { data: appRows },
    { data: bookingRows },
    { count: disputesOpenCount },
  ] = await Promise.all([
    admin.from('cleaners').select('status, rating_avg, rating_count, birthdate'),
    admin.from('profiles').select('id, created_at').eq('role', 'customer'),
    admin.from('customers').select('rating_avg, rating_count'),
    admin.from('cleaner_applications').select('status'),
    admin
      .from('bookings')
      .select('id, status, address, created_at, responded_at, scheduled_date, cleaner_id, customer_id')
      .order('created_at', { ascending: false })
      .limit(500),
    // "Disputes" are open (unresolved) support messages — every user question
    // surfaces here until an admin resolves it from /admin/support.
    admin.from('support_messages').select('id', { count: 'exact', head: true }).eq('resolved', false),
  ])

  const cleaners = cleanerRows ?? []
  const totalCleaners = cleaners.length
  // WAR-FIX cleaner_status enum: 'approved' cleaners are live; 'pending' are awaiting review.
  const activeCleaners = cleaners.filter((c) => c.status === 'approved').length
  const newCleaners = cleaners.filter((c) => c.status === 'pending').length
  // Cleaners still pending review whose birthdate puts them under 18 — not a
  // blocker, just something the admin needs to know follows a different
  // verification protocol. Computed on read from birthdate rather than a
  // stored flag, so it can never drift.
  const eighteenYearsAgo = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
  const minorCleanersPending = cleaners.filter(
    (c) => c.status === 'pending' && c.birthdate && new Date(c.birthdate) > eighteenYearsAgo,
  ).length

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

  // Rating averages — weighted by each row's rating_count so it's a true mean of
  // every individual rating (not an average of averages). rating_avg can arrive
  // as a string from PostgREST numeric, so coerce. Overall = cleaners + customers.
  function ratingAgg(rows: { rating_avg: number | string | null; rating_count: number | null }[] | null) {
    let sum = 0
    let count = 0
    for (const r of rows ?? []) {
      const avg = r.rating_avg == null ? null : Number(r.rating_avg)
      const cnt = r.rating_count ?? 0
      if (avg != null && !Number.isNaN(avg) && cnt > 0) {
        sum += avg * cnt
        count += cnt
      }
    }
    return { sum, count }
  }
  const cleanerRating = ratingAgg(cleanerRows)
  const customerRating = ratingAgg(customerRatingRows)
  const overallRatingCount = cleanerRating.count + customerRating.count
  const cleanersRatingAvg = cleanerRating.count ? cleanerRating.sum / cleanerRating.count : null
  const customersRatingAvg = customerRating.count ? customerRating.sum / customerRating.count : null
  const overallRatingAvg = overallRatingCount ? (cleanerRating.sum + customerRating.sum) / overallRatingCount : null

  // Feed the activity card the last ~month so it can filter to day/week/month
  // client-side; capped so the profile lookup stays small.
  const activityCutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
  const recentSlice = bookings
    .filter((b) => b.created_at && new Date(b.created_at) >= activityCutoff)
    .slice(0, 200)
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
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <DashboardContent
          firstName={firstName}
          disputesOpen={disputesOpenCount ?? 0}
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
          minorCleanersPending={minorCleanersPending}
          overallRatingAvg={overallRatingAvg}
          overallRatingCount={overallRatingCount}
          cleanersRatingAvg={cleanersRatingAvg}
          cleanersRatingCount={cleanerRating.count}
          customersRatingAvg={customersRatingAvg}
          customersRatingCount={customerRating.count}
          recentBookings={recentBookings}
          areaAddresses={thisWeekAreas}
        />
      </div>
  )
}
