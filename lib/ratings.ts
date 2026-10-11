import type { SupabaseClient } from '@supabase/supabase-js'

// Saves one person's rating of ONE clean (a booking). Rating the same clean again
// edits it; a different clean with the same person is a new rating that counts
// toward their average and "N cleans". The database trigger keeps the person's
// rating_avg / rating_count current.
//
// Before migration 0038 the database allowed one rating per person, so inserting
// a second one fails with a unique violation; in that case the old behaviour is
// kept (the existing rating is updated and re-pointed at this clean) rather than
// failing the rating.
export async function saveRating(
  client: SupabaseClient,
  input: {
    bookingId: string
    raterId: string
    rateeId: string
    rateeRole: 'cleaner' | 'customer'
    score: number
    // undefined = leave any existing review text alone; null/'' = clear it.
    reviewText?: string | null
  },
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = { score: input.score, updated_at: new Date().toISOString() }
  if (input.reviewText !== undefined) patch.review_text = input.reviewText?.trim() ? input.reviewText.trim() : null

  // 1. This clean was already rated by this person → edit that rating.
  const { data: updated, error: updateErr } = await client
    .from('ratings')
    .update(patch)
    .eq('booking_id', input.bookingId)
    .eq('rater_id', input.raterId)
    .select('id')
  if (updateErr) return { error: updateErr.message }
  if (updated && updated.length > 0) return {}

  // 2. First rating for this clean.
  const { error: insertErr } = await client.from('ratings').insert({
    booking_id: input.bookingId,
    rater_id: input.raterId,
    ratee_id: input.rateeId,
    ratee_role: input.rateeRole,
    ...patch,
  })
  if (!insertErr) return {}

  // 3. Pre-0038 database: one rating per person already exists — update it.
  if (insertErr.code === '23505') {
    const { error } = await client
      .from('ratings')
      .update({ ...patch, booking_id: input.bookingId })
      .eq('rater_id', input.raterId)
      .eq('ratee_id', input.rateeId)
    return error ? { error: error.message } : {}
  }
  return { error: insertErr.message }
}
