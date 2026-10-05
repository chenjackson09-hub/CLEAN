import type { SupabaseClient } from '@supabase/supabase-js'

// What happened. Text is rendered client-side from the kind + data
// (lib/notificationText.ts) so it follows the viewer's language.
export type NotificationKind =
  | 'request_received' // cleaner: a host sent a request
  | 'request_accepted' // host
  | 'request_declined' // host
  | 'request_expired' // host: the cleaner never answered in 24h
  | 'request_cancelled_by_host' // cleaner: a pending request was cancelled
  | 'request_expiring' // cleaner: a pending request is about to lapse
  | 'clean_tomorrow' // either: reminder the day before a matched clean
  | 'chat_message' // either: new chat message(s), grouped per conversation
  | 'request_taken' // cleaner: the host got matched with someone else
  | 'request_cleaner_unavailable' // host: cleaner deleted the slot it relied on
  | 'availability_changed' // host: cleaner changed their hours — still relevant?
  | 'host_kept_request' // cleaner: host answered ✓ to the changed-hours notice
  | 'booking_cancelled_by_host' // cleaner
  | 'booking_cancelled_by_cleaner' // host
  | 'clean_completed' // host: rate your cleaner
  | 'rating_received' // either
  | 'account_approved' // either (cleaner application / host signup)
  | 'account_rejected' // either

export type NotifyInput = {
  userId: string
  kind: NotificationKind
  actorId?: string | null
  bookingId?: string | null
  data?: Record<string, string | number | null>
  href: string
  // Set for one-shot events so a retry can't notify twice; leave undefined for
  // repeatable ones (e.g. availability_changed).
  once?: boolean
}

// Writes one notification per input. Best-effort and never throws: a missing
// table (migration not applied) or any write failure must not break the action
// that triggered it. Must be called with the service-role client — users have
// no insert policy.
export async function notify(admin: SupabaseClient, inputs: NotifyInput | NotifyInput[]): Promise<void> {
  const list = (Array.isArray(inputs) ? inputs : [inputs]).filter((i) => i.userId)
  if (list.length === 0) return
  try {
    const rows = list.map((i) => ({
      user_id: i.userId,
      kind: i.kind,
      actor_id: i.actorId ?? null,
      booking_id: i.bookingId ?? null,
      data: i.data ?? {},
      href: i.href,
      dedupe_key: i.once && i.bookingId ? `${i.kind}:${i.bookingId}` : null,
    }))
    const { error } = await admin
      .from('notifications')
      .upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    if (error) console.error('notify: insert failed', error.message)
  } catch (e) {
    console.error('notify: failed', e)
  }
}

// id -> full_name for a handful of profiles (service-role client; RLS hides
// other users' profiles from a normal session).
export async function profileNames(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return new Map()
  try {
    const { data } = await admin.from('profiles').select('id, full_name').in('id', unique)
    return new Map((data ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? '']))
  } catch {
    return new Map()
  }
}

// A new chat message. Grouped per conversation: while the recipient hasn't read
// the earlier one, it is replaced by a single entry with a running count ("sent
// you 3 messages") instead of flooding the bell. Best-effort, never throws.
export async function notifyChatMessage(
  admin: SupabaseClient,
  input: { recipientId: string; senderId: string; conversationId: string; name: string; href: string },
): Promise<void> {
  try {
    const { data: existing } = await admin
      .from('notifications')
      .select('id, data')
      .eq('user_id', input.recipientId)
      .eq('kind', 'chat_message')
      .is('read_at', null)
      .contains('data', { conversation: input.conversationId })
      .limit(1)
    const previous = Number((existing?.[0]?.data as { count?: number } | undefined)?.count ?? 0)
    if (existing && existing.length > 0) await admin.from('notifications').delete().eq('id', existing[0].id)
    await notify(admin, {
      userId: input.recipientId,
      kind: 'chat_message',
      actorId: input.senderId,
      data: { name: input.name, conversation: input.conversationId, count: previous + 1 },
      href: input.href,
    })
  } catch (e) {
    console.error('notifyChatMessage: failed', e)
  }
}
