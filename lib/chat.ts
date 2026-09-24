import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatBookingCard, ChatMessage } from '@/lib/chatFormat'

export const CHAT_PAGE_SIZE = 100

// Find-or-create the single conversation for a host/cleaner pair. The
// (host_id, cleaner_id) unique constraint + ON CONFLICT DO NOTHING makes this
// safe under concurrent calls; we then read the row back by the pair.
// Must be called with the service-role client (users have no insert policy).
export async function findOrCreateConversation(
  admin: SupabaseClient,
  hostId: string,
  cleanerId: string
): Promise<string | null> {
  const { error: upsertErr } = await admin
    .from('conversations')
    .upsert({ host_id: hostId, cleaner_id: cleanerId }, { onConflict: 'host_id,cleaner_id', ignoreDuplicates: true })
  if (upsertErr) return null

  const { data } = await admin
    .from('conversations')
    .select('id')
    .eq('host_id', hostId)
    .eq('cleaner_id', cleanerId)
    .single<{ id: string }>()
  return data?.id ?? null
}

// Attach a confirmed booking to the pair's conversation, exactly once
// (booking_id is the primary key of conversation_bookings).
export async function ensureBookingInConversation(
  admin: SupabaseClient,
  booking: { id: string; customer_id: string; cleaner_id: string; responded_at?: string | null }
): Promise<string | null> {
  const conversationId = await findOrCreateConversation(admin, booking.customer_id, booking.cleaner_id)
  if (!conversationId) return null

  await admin.from('conversation_bookings').upsert(
    {
      conversation_id: conversationId,
      booking_id: booking.id,
      created_at: booking.responded_at ?? new Date().toISOString(),
    },
    { onConflict: 'booking_id', ignoreDuplicates: true }
  )
  return conversationId
}

// Self-healing sync run whenever a thread is opened: makes sure every
// accepted/completed booking between the pair has its conversation + card.
// Returns whether the pair has any such booking (i.e. a chat relationship).
export async function syncConversationForPair(
  admin: SupabaseClient,
  hostId: string,
  cleanerId: string
): Promise<boolean> {
  const { data: bookings } = await admin
    .from('bookings')
    .select('id, customer_id, cleaner_id, responded_at')
    .eq('customer_id', hostId)
    .eq('cleaner_id', cleanerId)
    .in('status', ['accepted', 'completed'])
  if (!bookings || bookings.length === 0) return false

  for (const b of bookings) await ensureBookingInConversation(admin, b)
  return true
}

export type ChatThread = {
  conversationId: string
  other: { id: string; name: string; avatarUrl: string | null }
  messages: ChatMessage[]
  hasMore: boolean
  cards: ChatBookingCard[]
}

// Loads one thread for the signed-in user. `supabase` is the user's own
// RLS-scoped client (the participant check happens in the database);
// `admin` is used only for cross-user reads (other party's profile, cleaner
// rate, booking rows) after the pair is known to include the viewer.
// Returns null when the viewer has no chat relationship with `otherId`.
export async function loadChatThread(opts: {
  supabase: SupabaseClient
  admin: SupabaseClient
  userId: string
  role: 'host' | 'cleaner'
  otherId: string
}): Promise<ChatThread | null> {
  const { supabase, admin, userId, role, otherId } = opts
  const hostId = role === 'host' ? userId : otherId
  const cleanerId = role === 'host' ? otherId : userId

  await syncConversationForPair(admin, hostId, cleanerId)

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('host_id', hostId)
    .eq('cleaner_id', cleanerId)
    .maybeSingle<{ id: string }>()
  if (!conversation) return null

  const [{ data: profile }, { data: cleaner }, { data: msgRows }, { data: cardRows }] = await Promise.all([
    admin.from('profiles').select('full_name, avatar_url').eq('id', otherId).single<{ full_name: string | null; avatar_url: string | null }>(),
    admin.from('cleaners').select('hourly_rate').eq('id', cleanerId).maybeSingle<{ hourly_rate: number | null }>(),
    supabase
      .from('messages')
      .select('id, sender_id, body, created_at, client_id')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(CHAT_PAGE_SIZE + 1),
    admin
      .from('conversation_bookings')
      .select('booking_id, created_at, bookings(status, scheduled_date, scheduled_start, address)')
      .eq('conversation_id', conversation.id),
  ])

  const rows = (msgRows ?? []) as ChatMessage[]
  const hasMore = rows.length > CHAT_PAGE_SIZE
  const messages = rows.slice(0, CHAT_PAGE_SIZE).reverse()

  type CardRow = {
    booking_id: string
    created_at: string
    bookings: { status: string; scheduled_date: string; scheduled_start: string; address: string | null } | null
  }
  const cards: ChatBookingCard[] = ((cardRows ?? []) as unknown as CardRow[])
    .filter((r) => r.bookings)
    .map((r) => ({
      booking_id: r.booking_id,
      attached_at: r.created_at,
      status: r.bookings!.status,
      scheduled_date: r.bookings!.scheduled_date,
      scheduled_start: r.bookings!.scheduled_start,
      address: r.bookings!.address,
      hourly_rate: cleaner?.hourly_rate ?? null,
    }))

  return {
    conversationId: conversation.id,
    other: { id: otherId, name: profile?.full_name ?? '', avatarUrl: profile?.avatar_url ?? null },
    messages,
    hasMore,
    cards,
  }
}

export type ConversationSummary = {
  otherId: string
  name: string
  avatarUrl: string | null
  lastBody: string | null
  lastAt: string
}

// Inbox rows for the signed-in user, newest activity first. Also runs the
// pair sync for every party the viewer has a confirmed booking with, so a
// conversation whose creation failed at approval time still shows up here.
export async function listConversations(opts: {
  supabase: SupabaseClient
  admin: SupabaseClient
  userId: string
  role: 'host' | 'cleaner'
}): Promise<ConversationSummary[]> {
  const { supabase, admin, userId, role } = opts
  const mine = role === 'host' ? 'customer_id' : 'cleaner_id'

  const { data: booked } = await admin
    .from('bookings')
    .select('id, customer_id, cleaner_id, responded_at')
    .eq(mine, userId)
    .in('status', ['accepted', 'completed'])
  const seen = new Set<string>()
  for (const b of booked ?? []) {
    const key = `${b.customer_id}:${b.cleaner_id}`
    if (seen.has(key)) continue
    seen.add(key)
    await ensureBookingInConversation(admin, b)
  }

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, host_id, cleaner_id, last_activity_at')
    .order('last_activity_at', { ascending: false })
  if (!convs || convs.length === 0) return []

  const otherOf = (c: { host_id: string; cleaner_id: string }) => (role === 'host' ? c.cleaner_id : c.host_id)
  const otherIds = Array.from(new Set(convs.map(otherOf)))

  const [{ data: profiles }, { data: recent }] = await Promise.all([
    admin.from('profiles').select('id, full_name, avatar_url').in('id', otherIds),
    supabase
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', convs.map((c) => c.id))
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]))
  const lastByConv = new Map<string, { body: string; created_at: string }>()
  for (const m of recent ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m)

  return convs.map((c) => {
    const otherId = otherOf(c)
    const p = profileById.get(otherId)
    const last = lastByConv.get(c.id)
    return {
      otherId,
      name: (p?.full_name as string | null) ?? '',
      avatarUrl: (p?.avatar_url as string | null) ?? null,
      lastBody: last?.body ?? null,
      lastAt: last?.created_at ?? c.last_activity_at,
    }
  })
}
