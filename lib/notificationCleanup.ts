import type { SupabaseClient } from '@supabase/supabase-js'

// When a host's request to a cleaner is settled (answered, withdrawn, closed by
// the app, or its slot deleted), the cleaner's "new request" and "about to
// lapse" bell entries about that host are no longer news — mark them read.
//
// A host who opened several days sends one request per day, and the cleaner
// gets ONE bell entry for the whole need, so this only clears the entries once
// the cleaner has NO pending request left from that host.
// Best-effort: never throws, and only ever sets read_at.
export async function clearSettledRequestNotifications(
  admin: SupabaseClient,
  pairs: { cleanerId: string; hostId: string }[],
): Promise<void> {
  try {
    const seen = new Set<string>()
    for (const { cleanerId, hostId } of pairs) {
      if (!cleanerId || !hostId) continue
      const key = `${cleanerId}:${hostId}`
      if (seen.has(key)) continue
      seen.add(key)

      const { data: stillPending, error: pendingErr } = await admin
        .from('bookings')
        .select('id')
        .eq('cleaner_id', cleanerId)
        .eq('customer_id', hostId)
        .eq('status', 'pending')
        .limit(1)
      if (pendingErr || (stillPending ?? []).length > 0) continue // unsure, or still waiting: leave them

      await admin
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', cleanerId)
        .eq('actor_id', hostId)
        .in('kind', ['request_received', 'request_expiring'])
        .is('read_at', null)
    }
  } catch (e) {
    console.error('clearSettledRequestNotifications failed', e)
  }
}
