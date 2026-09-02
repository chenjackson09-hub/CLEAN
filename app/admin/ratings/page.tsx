import { createAdminClient } from '@/lib/supabase/admin'
import { RatingsPageContent, type RecentRating } from './RatingsPageContent'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

// Same weighted-mean approach as the dashboard's ratings KPI — a true mean of
// every individual rating (not an average of per-person averages).
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

export default async function AdminRatingsPage() {
  noStore()
  const admin = createAdminClient()

  const [{ data: cleanerRows }, { data: customerRows }, { data: ratingRows }] = await Promise.all([
    admin.from('cleaners').select('rating_avg, rating_count'),
    admin.from('customers').select('rating_avg, rating_count'),
    admin
      .from('ratings')
      .select('id, rater_id, ratee_id, ratee_role, score, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const cleanerAgg = ratingAgg(cleanerRows)
  const customerAgg = ratingAgg(customerRows)
  const overallCount = cleanerAgg.count + customerAgg.count

  const profileIds = Array.from(new Set((ratingRows ?? []).flatMap((r) => [r.rater_id, r.ratee_id])))
  const { data: profileRows } = profileIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', profileIds)
    : { data: [] }
  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.full_name ?? '']))

  const recentRatings: RecentRating[] = (ratingRows ?? []).map((r) => ({
    id: r.id,
    score: r.score,
    created_at: r.created_at,
    raterName: profileMap.get(r.rater_id) ?? '',
    rateeName: profileMap.get(r.ratee_id) ?? '',
    rateeRole: r.ratee_role,
  }))

  return (
    <div className="px-6 py-6">
      <RatingsPageContent
        overallAvg={overallCount ? (cleanerAgg.sum + customerAgg.sum) / overallCount : null}
        overallCount={overallCount}
        cleanersAvg={cleanerAgg.count ? cleanerAgg.sum / cleanerAgg.count : null}
        cleanersCount={cleanerAgg.count}
        customersAvg={customerAgg.count ? customerAgg.sum / customerAgg.count : null}
        customersCount={customerAgg.count}
        recentRatings={recentRatings}
      />
    </div>
  )
}
