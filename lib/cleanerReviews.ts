import type { SupabaseClient } from '@supabase/supabase-js'
import { shortName } from '@/lib/chatFormat'
import type { ReviewItem } from '@/components/HostProfileReviews'

// The written reviews hosts have left for a cleaner (a host's short note after a completed
// clean), newest first, each with the host's name as "First L." only. Read with the admin
// client because ratings are only visible to the two people involved. FAILS OPEN: any error
// returns no reviews and the profile simply has no Reviews section.
export async function fetchCleanerReviews(admin: SupabaseClient, cleanerId: string): Promise<ReviewItem[]> {
  try {
    const { data, error } = await admin
      .from('ratings')
      .select('id, score, review_text, updated_at, rater:profiles!rater_id(full_name)')
      .eq('ratee_id', cleanerId)
      .eq('ratee_role', 'cleaner')
      .not('review_text', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error || !data) return []
    return (data as unknown as { id: string; score: number; review_text: string; rater: { full_name: string | null } | null }[])
      .filter((r) => r.review_text?.trim())
      .map((r) => ({
        id: r.id,
        score: r.score,
        reviewText: r.review_text,
        reviewerName: r.rater?.full_name ? shortName(r.rater.full_name) : 'A host',
      }))
  } catch {
    return []
  }
}
