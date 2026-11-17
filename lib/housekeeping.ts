import type { SupabaseClient } from '@supabase/supabase-js'
import { sweepExpiredRequests } from '@/lib/expireRequests'
import { notifyNew, profileNames } from '@/lib/notifications'
import { shortName } from '@/lib/chatFormat'
import { emailCleanTomorrow, emailRequestExpiring } from '@/lib/appEmails'

// The things that must happen on time even when nobody has the app open. Run every half hour
// by the scheduled job (/api/cron/housekeeping, called from .github/workflows/housekeeping.yml):
//   1. requests with no answer after 24 hours are closed and the host is told (bell + email);
//   2. a cleaner is warned when a request will close within 6 hours (bell + email);
//   3. both people are reminded the day before a confirmed clean (bell + email).
// Everything is once-only per booking: the bell entry is written with a dedupe key and the email
// is sent only by whoever wrote that entry first — so running this often, or at the same time as
// someone opening the app (which raises the same bell entries), never repeats anything.
// SERVER ONLY, service-role client. Each part is independent: one failing never stops the others.

const ISRAEL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' })
const EXPIRING_WITHIN_MS = 6 * 60 * 60 * 1000

export type HousekeepingResult = { expired: number; expiringWarned: number; tomorrowReminded: number }

async function warnExpiring(admin: SupabaseClient): Promise<number> {
  const now = Date.now()
  const { data } = await admin
    .from('bookings')
    .select('id, customer_id, cleaner_id, scheduled_date, scheduled_start')
    .eq('status', 'pending')
    .gt('response_deadline', new Date(now).toISOString())
    .lt('response_deadline', new Date(now + EXPIRING_WITHIN_MS).toISOString())
  const rows = (data ?? []) as { id: string; customer_id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string }[]
  if (rows.length === 0) return 0
  const names = await profileNames(admin, rows.map((b) => b.customer_id))
  let told = 0
  for (const b of rows) {
    const isNew = await notifyNew(admin, {
      userId: b.cleaner_id,
      kind: 'request_expiring',
      actorId: b.customer_id,
      bookingId: b.id,
      data: { name: names.get(b.customer_id) ?? '', date: b.scheduled_date },
      href: '/cleaner/requests',
      once: true,
    })
    if (!isNew) continue
    told++
    await emailRequestExpiring(admin, { cleanerId: b.cleaner_id, hostId: b.customer_id, date: b.scheduled_date, time: b.scheduled_start })
  }
  return told
}

async function remindTomorrow(admin: SupabaseClient): Promise<number> {
  const tomorrow = ISRAEL_DAY.format(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const { data } = await admin
    .from('bookings')
    .select('id, customer_id, cleaner_id, scheduled_date, scheduled_start')
    .eq('status', 'accepted')
    .eq('scheduled_date', tomorrow)
  const rows = (data ?? []) as { id: string; customer_id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string }[]
  if (rows.length === 0) return 0
  const names = await profileNames(admin, rows.flatMap((b) => [b.customer_id, b.cleaner_id]))
  let told = 0
  for (const b of rows) {
    const time = (b.scheduled_start ?? '').slice(0, 5)
    for (const side of ['host', 'cleaner'] as const) {
      const userId = side === 'host' ? b.customer_id : b.cleaner_id
      const otherId = side === 'host' ? b.cleaner_id : b.customer_id
      const otherName = side === 'host' ? shortName(names.get(otherId) ?? '') : names.get(otherId) ?? ''
      const isNew = await notifyNew(admin, {
        userId,
        kind: 'clean_tomorrow',
        actorId: otherId,
        bookingId: b.id,
        data: { name: otherName, date: b.scheduled_date, time },
        href: side === 'host' ? '/bookings' : '/cleaner/dashboard',
        once: true,
      })
      if (!isNew) continue
      told++
      await emailCleanTomorrow(admin, { recipientId: userId, recipientRole: side, otherId, bookingId: b.id, date: b.scheduled_date, time })
    }
  }
  return told
}

export async function runHousekeeping(admin: SupabaseClient): Promise<HousekeepingResult> {
  const part = async (name: string, run: () => Promise<number>): Promise<number> => {
    try {
      return await run()
    } catch (e) {
      console.error(`housekeeping: ${name} failed`, e)
      return 0
    }
  }
  const expired = await part('expired requests', () => sweepExpiredRequests(admin))
  const expiringWarned = await part('expiring requests', () => warnExpiring(admin))
  const tomorrowReminded = await part('tomorrow reminders', () => remindTomorrow(admin))
  return { expired, expiringWarned, tomorrowReminded }
}
