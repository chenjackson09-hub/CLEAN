import type { SupabaseClient } from '@supabase/supabase-js'
import { releaseBookingTime } from '@/lib/availability'
import { notify, profileNames, type NotificationKind } from '@/lib/notifications'
import { shortName } from '@/lib/chatFormat'

// ── Reasons ────────────────────────────────────────────────────────────────
// Fixed keys (also check-constrained in the database, migration 0036) so the
// reason can be counted later and shown in either language.
export const CANCEL_REASONS = ['plans_changed', 'time_no_longer_works', 'no_longer_need', 'unexpected', 'other'] as const
export type CancelReason = (typeof CANCEL_REASONS)[number]

type Lang = 'en' | 'he'

// What the person who cancels picks from. "no_longer_need" reads differently per
// side: a host no longer needs the cleaning, a cleaner no longer wants the job.
export const CANCEL_REASON_LABELS: Record<Lang, Record<CancelReason, { host: string; cleaner: string }>> = {
  en: {
    plans_changed: { host: 'Plans changed', cleaner: 'Plans changed' },
    time_no_longer_works: { host: 'Date/time no longer works', cleaner: 'Date/time no longer works' },
    no_longer_need: { host: 'I no longer need the cleaning', cleaner: 'I can no longer do this job' },
    unexpected: { host: 'Something unexpected happened', cleaner: 'Something unexpected happened' },
    other: { host: 'Other', cleaner: 'Other' },
  },
  he: {
    plans_changed: { host: 'התוכניות השתנו', cleaner: 'התוכניות השתנו' },
    time_no_longer_works: { host: 'התאריך/השעה כבר לא מתאימים', cleaner: 'התאריך/השעה כבר לא מתאימים' },
    no_longer_need: { host: 'אני כבר לא צריך/ה את הניקיון', cleaner: 'אני כבר לא יכול/ה לבצע את העבודה' },
    unexpected: { host: 'קרה משהו בלתי צפוי', cleaner: 'קרה משהו בלתי צפוי' },
    other: { host: 'אחר', cleaner: 'אחר' },
  },
}

// A plain label for a stored reason, from the *viewer's* point of view of the
// person who cancelled (used in chat, notifications, admin).
export function reasonLabel(reason: string | null | undefined, by: 'host' | 'cleaner' | null | undefined, lang: Lang): string {
  if (!reason || !(CANCEL_REASONS as readonly string[]).includes(reason)) return ''
  return CANCEL_REASON_LABELS[lang][reason as CancelReason][by === 'cleaner' ? 'cleaner' : 'host']
}

export const MAX_CANCEL_MESSAGE = 500

export type CancelInput = { reason?: string | null; message?: string | null }

// Clean the client-supplied reason/message: unknown reasons are dropped, the
// note is trimmed and capped. Both stay optional.
export function sanitizeCancelInput(input?: CancelInput): { reason: CancelReason | null; message: string | null } {
  const reason = input?.reason && (CANCEL_REASONS as readonly string[]).includes(input.reason) ? (input.reason as CancelReason) : null
  const message = (input?.message ?? '').trim().slice(0, MAX_CANCEL_MESSAGE)
  return { reason, message: message || null }
}

// ── How long before the clean ──────────────────────────────────────────────
// Booking dates/times are Israel wall-clock; cancelled_at is a real instant.
// Stored as-is so any policy can be computed later; this helper does the maths.
const TZ = 'Asia/Jerusalem'

function tzOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - utcMs
}

// The instant a booking starts (YYYY-MM-DD + HH:MM[:SS] in Israel time).
export function bookingStartMs(date: string, start: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = start.slice(0, 5).split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, mi)
  return guess - tzOffsetMs(guess - tzOffsetMs(guess))
}

// Minutes between the cancellation and the scheduled start (negative = after it began).
export function minutesBeforeStart(date: string, start: string, cancelledAtIso: string): number {
  return Math.round((bookingStartMs(date, start) - new Date(cancelledAtIso).getTime()) / 60000)
}

// "3 days before", "5 hours before", "20 min before", "after it started".
export function describeLead(minutes: number, lang: Lang = 'en'): string {
  if (minutes < 0) return lang === 'he' ? 'לאחר תחילת הניקיון' : 'after it started'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor(minutes / 60)
  if (lang === 'he') {
    if (days >= 1) return `${days} ימים לפני`
    if (hours >= 1) return `${hours} שעות לפני`
    return `${minutes} דקות לפני`
  }
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} before`
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} before`
  return `${minutes} min before`
}

// ── The cancellation itself ────────────────────────────────────────────────
export type CancelFailure = {
  ok: false
  code: 'invalid' | 'not_found' | 'already_cancelled' | 'not_cancellable' | 'failed'
  error: string
}
export type CancelSuccess = {
  ok: true
  role: 'host' | 'cleaner'
  wasConfirmed: boolean
  booking: { id: string; customer_id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string }
}

type BookingRow = {
  id: string
  customer_id: string
  cleaner_id: string
  status: string
  scheduled_date: string
  scheduled_start: string
  duration_hours: number
}

// Cancels one booking on behalf of `actorId` (taken from the session by the
// caller — never from the client). Works with the service-role client because
// it writes the other person's rows (availability, notifications); who may
// cancel is therefore decided here, not by RLS:
//   • only the booking's own host or cleaner;
//   • a host may cancel a pending request or a confirmed clean, a cleaner only
//     a confirmed clean (a pending request is declined, not cancelled);
//   • completed / declined / already-cancelled bookings are left alone.
// The status change is a single guarded update ("only if it is still the status
// I read"), so of two simultaneous cancels — or a cancel racing a completion —
// exactly one wins and only the winner runs the follow-ups (release the cleaner's
// time, notify). Everything after it is idempotent.
export async function cancelBookingCore(
  admin: SupabaseClient,
  opts: { bookingId: string; actorId: string; input?: CancelInput },
): Promise<CancelSuccess | CancelFailure> {
  const { bookingId, actorId } = opts
  if (!bookingId || !actorId) return { ok: false, code: 'invalid', error: 'Invalid request.' }

  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, cleaner_id, status, scheduled_date, scheduled_start, duration_hours')
    .eq('id', bookingId)
    .maybeSingle<BookingRow>()
  // The same answer for "no such booking" and "not yours": never confirm that an id exists.
  if (!booking || (booking.customer_id !== actorId && booking.cleaner_id !== actorId)) {
    return { ok: false, code: 'not_found', error: 'Booking not found.' }
  }
  const role: 'host' | 'cleaner' = booking.customer_id === actorId ? 'host' : 'cleaner'

  if (booking.status === 'cancelled') {
    return { ok: false, code: 'already_cancelled', error: 'This cleaning was already cancelled.' }
  }
  const allowed = role === 'host' ? ['pending', 'accepted'] : ['accepted']
  if (!allowed.includes(booking.status)) {
    return { ok: false, code: 'not_cancellable', error: 'This booking can no longer be cancelled.' }
  }
  const wasConfirmed = booking.status === 'accepted'
  const { reason, message } = sanitizeCancelInput(opts.input)

  // The guarded status change (+ who/when/why). If the metadata columns aren't
  // there yet (migration 0036 not applied) fall back to just the status so
  // cancelling never stops working because of a missing migration.
  const base = { status: 'cancelled', ...(role === 'cleaner' ? { cleaner_ack_cancelled: true } : {}) }
  const full = {
    ...base,
    cancelled_by: role,
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason,
    cancellation_message: message,
    cancelled_from_status: booking.status,
  }
  let res = await admin.from('bookings').update(full).eq('id', bookingId).eq('status', booking.status).select('id')
  if (res.error && /column|schema cache/i.test(res.error.message)) {
    res = await admin.from('bookings').update(base).eq('id', bookingId).eq('status', booking.status).select('id')
  }
  if (res.error) return { ok: false, code: 'failed', error: res.error.message }

  if (!res.data || res.data.length === 0) {
    // Lost the race: someone else changed it between our read and our write.
    const { data: now } = await admin.from('bookings').select('status').eq('id', bookingId).maybeSingle<{ status: string }>()
    return now?.status === 'cancelled'
      ? { ok: false, code: 'already_cancelled', error: 'This cleaning was already cancelled.' }
      : { ok: false, code: 'not_cancellable', error: 'This booking can no longer be cancelled.' }
  }

  // ── Winner only from here ────────────────────────────────────────────────
  if (wasConfirmed) {
    // The booking's own consumed slot (migration 0035) — read apart so a missing column can't break this.
    const { data: slot } = await admin
      .from('bookings')
      .select('slot_start, slot_end')
      .eq('id', bookingId)
      .maybeSingle<{ slot_start: string | null; slot_end: string | null }>()
    const release = () => releaseBookingTime(admin, { ...booking, slot_start: slot?.slot_start, slot_end: slot?.slot_end })
    try {
      await release()
    } catch (e) {
      try {
        await release() // one retry: the booking is already cancelled, so make sure the time comes back
      } catch (e2) {
        console.error('cancel: could not release the cleaner time', bookingId, e, e2)
      }
    }
  }

  try {
    const names = await profileNames(admin, [booking.customer_id, booking.cleaner_id])
    const hostName = names.get(booking.customer_id) ?? ''
    const cleanerName = names.get(booking.cleaner_id) ?? ''
    const time = booking.scheduled_start.slice(0, 5)
    if (role === 'host') {
      const kind: NotificationKind = wasConfirmed ? 'booking_cancelled_by_host' : 'request_cancelled_by_host'
      await notify(admin, {
        userId: booking.cleaner_id,
        kind,
        actorId,
        bookingId,
        data: { name: hostName, date: booking.scheduled_date, time },
        href: wasConfirmed ? `/cleaner/chat/${booking.customer_id}` : '/cleaner/requests',
        once: true,
      })
    } else {
      await notify(admin, {
        userId: booking.customer_id,
        kind: 'booking_cancelled_by_cleaner',
        actorId,
        bookingId,
        data: { name: shortName(cleanerName), date: booking.scheduled_date, time },
        href: `/chat/${booking.cleaner_id}`,
        once: true,
      })
    }
  } catch (e) {
    console.error('cancel: notification failed', e)
  }

  return {
    ok: true,
    role,
    wasConfirmed,
    booking: {
      id: booking.id,
      customer_id: booking.customer_id,
      cleaner_id: booking.cleaner_id,
      scheduled_date: booking.scheduled_date,
      scheduled_start: booking.scheduled_start,
    },
  }
}
