// Pure chat helpers shared by the server loaders and the ChatView client
// component: types, display-name shortening, message merging, and the
// timeline builder (messages + booking cards + date dividers).

export type ChatMessage = {
  id: string
  sender_id: string
  body: string
  created_at: string
  client_id?: string | null
  // Client-only send state for optimistic messages.
  status?: 'sending' | 'failed'
}

// A booking card is a live view of a real booking — nothing here is a chat
// copy; the loader reads it from `bookings` (+ `cleaners.hourly_rate`).
export type ChatBookingCard = {
  booking_id: string
  attached_at: string
  status: string
  scheduled_date: string // YYYY-MM-DD
  scheduled_start: string // HH:MM[:SS]
  address: string | null
  hourly_rate: number | null
}

export type TimelineItem =
  | { kind: 'divider'; key: string; date: Date }
  | { kind: 'message'; key: string; message: ChatMessage }
  | { kind: 'card'; key: string; card: ChatBookingCard }

// "First L." — first name plus the last name's initial (the app-wide way a
// cleaner's name is shown to hosts).
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : fullName.trim()
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? ''
}

// Local-calendar-day key, so dividers follow the *viewer's* timezone rather
// than the UTC date of the stored timestamp.
export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Merge an incoming list into the current one: dedupe by id, and let a real
// server row replace the optimistic one it was sent as (matched by client_id).
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  const clientToId = new Map<string, string>()
  for (const m of current) {
    byId.set(m.id, m)
    if (m.client_id) clientToId.set(m.client_id, m.id)
  }
  for (const m of incoming) {
    const optimisticId = m.client_id ? clientToId.get(m.client_id) : undefined
    if (optimisticId && optimisticId !== m.id) byId.delete(optimisticId)
    byId.set(m.id, m)
    if (m.client_id) clientToId.set(m.client_id, m.id)
  }
  return Array.from(byId.values())
}

// Booking cards sit in the timeline at the moment they were attached (the
// booking was confirmed); messages at their created_at. Ties: cards first (a
// card is created before anyone can talk about it), then by id, so ordering
// is deterministic.
export function buildTimeline(
  messages: ChatMessage[],
  cards: ChatBookingCard[],
  withDividers: boolean
): TimelineItem[] {
  const entries: { ts: number; order: number; id: string; item: TimelineItem }[] = [
    ...messages.map((message) => ({
      ts: new Date(message.created_at).getTime(),
      order: 1,
      id: message.id,
      item: { kind: 'message', key: `m-${message.id}`, message } as TimelineItem,
    })),
    ...cards.map((card) => ({
      ts: new Date(card.attached_at).getTime(),
      order: 0,
      id: card.booking_id,
      item: { kind: 'card', key: `c-${card.booking_id}`, card } as TimelineItem,
    })),
  ].sort((a, b) => a.ts - b.ts || a.order - b.order || a.id.localeCompare(b.id))

  if (!withDividers) return entries.map((e) => e.item)

  const out: TimelineItem[] = []
  let lastDay = ''
  for (const e of entries) {
    const d = new Date(e.ts)
    const day = localDayKey(d)
    if (day !== lastDay) {
      out.push({ kind: 'divider', key: `d-${day}`, date: d })
      lastDay = day
    }
    out.push(e.item)
  }
  return out
}

// "Today, 14 June" / "26 May" (+ year when it isn't the current year).
export function formatDividerLabel(date: Date, now: Date, lang: 'en' | 'he'): string {
  const locale = lang === 'he' ? 'he-IL' : 'en-GB'
  const sameYear = date.getFullYear() === now.getFullYear()
  const base = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  if (localDayKey(date) === localDayKey(now)) {
    return `${lang === 'he' ? 'היום' : 'Today'}, ${base}`
  }
  return base
}

// "17 June" from a YYYY-MM-DD booking date (parsed as a local calendar date so
// it can never slip a day across timezones).
export function formatBookingDate(dateStr: string, lang: 'en' | 'he'): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
  })
}
