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
    { data: customerStatusRows },
    { data: appRows },
    { data: bookingRows },
    { count: disputesOpenCount },
  ] = await Promise.all([
    admin.from('cleaners').select('status, rating_avg, rating_count, birthdate'),
    admin.from('profiles').select('id, created_at').eq('role', 'customer'),
    admin.from('customers').select('rating_avg, rating_count'),
    // Queried separately from the rating fetch above so a stale schema cache
    // on this one column (see migration 0023) can't also take down the
    // pre-existing ratings KPI — a failure here just falls back to counting
    // every customer profile as a host, same as before this feature shipped.
    admin.from('customers').select('id, status'),
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
  // A cleaner isn't tallied here until admin has approved their application —
  // pending/rejected applicants only show up on the Applications KPI/screen.
  // Suspended cleaners were once approved, so they still count toward the
  // total (broken down as active vs. blocked below).
  const totalCleaners = cleaners.filter((c) => c.status === 'approved' || c.status === 'suspended').length
  const activeCleaners = cleaners.filter((c) => c.status === 'approved').length
  const blockedCleaners = cleaners.filter((c) => c.status === 'suspended').length
  // Cleaners still pending review whose birthdate puts them under 18 — not a
  // blocker, just something the admin needs to know follows a different
  // verification protocol. Computed on read from birthdate rather than a
  // stored flag, so it can never drift.
  const eighteenYearsAgo = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
  const minorCleanersPending = cleaners.filter(
    (c) => c.status === 'pending' && c.birthdate && new Date(c.birthdate) > eighteenYearsAgo,
  ).length

  const customers = customerProfileRows ?? []
  // A customer isn't tallied as a host until admin has approved their signup
  // (mirroring the cleaner rule above). `customerStatusRows` is `null`
  // specifically on a query error (e.g. migration 0023 not run yet /
  // schema cache not reloaded) — fall back to counting every customer
  // profile as before this feature shipped, rather than the KPI reading
  // zero because of an infra hiccup.
  const statusKnown = customerStatusRows != null
  const customerStatusMap = new Map((customerStatusRows ?? []).map((c) => [c.id, c.status]))
  const approvedCustomers = statusKnown ? customers.filter((c) => customerStatusMap.get(c.id) === 'approved') : customers
  const totalHosts = approvedCustomers.length
  const newHostsThisMonth = approvedCustomers.filter((c) => c.created_at && new Date(c.created_at) >= thisMonthStart).length
  const pendingCustomers = statusKnown ? customers.filter((c) => customerStatusMap.get(c.id) === 'pending').length : 0

  const applications = appRows ?? []
  // Combined with pending customer signups so this KPI (and the sidebar
  // badge fed by the same rule in admin/layout.tsx) matches what "All
  // Applications" actually shows once both categories are unified there.
  const pendingApplications = applications.filter((a) => a.status === 'pending').length + pendingCustomers

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

  // Plain YYYY-MM-DD comparison against scheduled_date — identical to the
  // `expired` check in app/admin/bookingsData.ts.
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  // "Unmatched" = needs attention: either stale 2h+ with no response, OR its
  // own scheduled_date has already passed (expired) — the second clause
  // explicitly folds expired requests in here even in the rare edge case
  // where one hasn't also crossed the 2h mark yet (e.g. a same-day booking).
  const unmatchedCount = bookings.filter(
    (b) => b.status === 'pending' && (new Date(b.created_at) < twoHoursAgo || b.scheduled_date < todayStr),
  ).length
  // Every currently-pending, not-yet-expired booking — unlike unmatchedCount
  // above (which flags requests needing attention), this is what makes a
  // request the customer *just* submitted show up immediately. Excludes
  // expired ones (own scheduled_date already passed) — those are dead, not
  // live, requests and belong in the Expired tab, not this count.
  const bookingRequestsCount = bookings.filter((b) => b.status === 'pending' && b.scheduled_date >= todayStr).length

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

  // Cleaner schedule changes that touched pending requests (migration 0033).
  // Isolated + fail-open: before the migration runs this just comes back empty.
  const { data: eventRows } = await admin
    .from('schedule_events')
    .select('id, kind, cleaner_id, affected_count, detail, created_at')
    .gte('created_at', activityCutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)
  const eventCleanerIds = Array.from(new Set((eventRows ?? []).map((e) => e.cleaner_id as string)))
  const { data: eventProfileRows } = eventCleanerIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', eventCleanerIds)
    : { data: [] }
  const eventProfileMap = new Map((eventProfileRows ?? []).map((p) => [p.id, p.full_name]))
  const scheduleEvents = (eventRows ?? []).map((e) => ({
    id: e.id as string,
    kind: e.kind as 'slot_deleted' | 'slot_changed',
    created_at: e.created_at as string,
    cleaner_name: eventProfileMap.get(e.cleaner_id as string) ?? null,
    affected_count: e.affected_count as number,
    detail: (e.detail as string | null) ?? null,
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
          blockedCleaners={blockedCleaners}
          totalHosts={totalHosts}
          newHostsThisMonth={newHostsThisMonth}
          pendingApplications={pendingApplications}
          bookingRequestsCount={bookingRequestsCount}
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
          scheduleEvents={scheduleEvents}
          areaAddresses={thisWeekAreas}
        />
      </div>
  )
}
