import { createAdminClient } from '@/lib/supabase/admin'
import { notify, profileNames } from '@/lib/notifications'
import { shortName } from '@/lib/chatFormat'

const ISRAEL_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' })
const EXPIRING_WITHIN_MS = 6 * 60 * 60 * 1000

// Reminders can't come from a scheduled job (the project has none), so they are
// raised lazily on each page load of the person they are for — the same trick
// lib/expireRequests.ts uses. Every one is `once` per booking, so repeated loads
// never notify twice. Best-effort: never throws.
//   • both roles: pick your locality (once, if none is chosen yet)
//   • hosts: fill in the household / cleaning-needs questions added later (once,
//     only if none of them is answered and sign-up is finished)
//   • both roles: a matched clean is tomorrow
//   • cleaners: a pending request lapses within 6 hours
export async function sendReminders(userId: string, role: 'host' | 'cleaner'): Promise<void> {
  try {
    const admin = createAdminClient()
    const tomorrow = ISRAEL_DAY.format(new Date(Date.now() + 24 * 60 * 60 * 1000))

    // Everyone is asked to pick their locality from the official list, once. The
    // read is skipped on any error (e.g. migration 0039 not applied), so this can
    // never nag someone about a column that doesn't exist yet.
    const { data: placeRow, error: placeErr } = await admin
      .from(role === 'host' ? 'customers' : 'cleaners')
      .select('locality_id')
      .eq('id', userId)
      .maybeSingle<{ locality_id: string | null }>()
    if (!placeErr && placeRow && placeRow.locality_id == null) {
      await notify(admin, {
        userId,
        kind: 'choose_area',
        data: {},
        href: role === 'host' ? '/profile?edit=1' : '/cleaner/profile?edit=1',
        dedupeKey: `choose_area:${userId}`,
      })
    }

    // Existing hosts are asked once to answer the household / cleaning-needs
    // questions that were added after they signed up. Skipped on any error (e.g.
    // migration 0045 not applied) and while their sign-up wizard is unfinished
    // (they'll meet the questions there).
    if (role === 'host') {
      const { data: needs, error: needsErr } = await admin
        .from('customers')
        .select('household_type, usage_frequency, typical_hours, preferred_days, flexibility, extra_note')
        .eq('id', userId)
        .maybeSingle<{
          household_type: string | null
          usage_frequency: string | null
          typical_hours: number | null
          preferred_days: string[] | null
          flexibility: string | null
          extra_note: string | null
        }>()
      if (!needsErr && needs) {
        const { data: prof, error: profErr } = await admin
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('id', userId)
          .maybeSingle<{ onboarding_completed_at: string | null }>()
        const unfinished = !profErr && !!prof && prof.onboarding_completed_at == null
        const answered =
          needs.household_type != null ||
          needs.usage_frequency != null ||
          needs.typical_hours != null ||
          needs.flexibility != null ||
          (needs.extra_note ?? '').trim() !== '' ||
          (needs.preferred_days ?? []).length > 0
        if (!unfinished && !answered) {
          await notify(admin, {
            userId,
            kind: 'complete_host_profile',
            data: {},
            href: '/profile?edit=1',
            dedupeKey: `complete_host_profile:${userId}`,
          })
        }
      }
    }

    const mine = role === 'host' ? 'customer_id' : 'cleaner_id'
    const { data: cleans } = await admin
      .from('bookings')
      .select('id, customer_id, cleaner_id, scheduled_date, scheduled_start')
      .eq(mine, userId)
      .eq('status', 'accepted')
      .eq('scheduled_date', tomorrow)
    const soon = role === 'cleaner'
      ? (await admin
          .from('bookings')
          .select('id, customer_id, scheduled_date, scheduled_start')
          .eq('cleaner_id', userId)
          .eq('status', 'pending')
          .gt('response_deadline', new Date().toISOString())
          .lt('response_deadline', new Date(Date.now() + EXPIRING_WITHIN_MS).toISOString())).data
      : null

    const otherIds = [
      ...(cleans ?? []).map((b) => (role === 'host' ? b.cleaner_id : b.customer_id) as string),
      ...(soon ?? []).map((b) => b.customer_id as string),
    ]
    if (otherIds.length === 0) return
    const names = await profileNames(admin, otherIds)
    const display = (id: string) => (role === 'host' ? shortName(names.get(id) ?? '') : names.get(id) ?? '')

    await notify(admin, [
      ...(cleans ?? []).map((b) => {
        const other = (role === 'host' ? b.cleaner_id : b.customer_id) as string
        return {
          userId,
          kind: 'clean_tomorrow' as const,
          actorId: other,
          bookingId: b.id as string,
          data: { name: display(other), date: b.scheduled_date as string, time: (b.scheduled_start as string).slice(0, 5) },
          href: role === 'host' ? '/bookings' : '/cleaner/dashboard',
          once: true,
        }
      }),
      ...(soon ?? []).map((b) => ({
        userId,
        kind: 'request_expiring' as const,
        actorId: b.customer_id as string,
        bookingId: b.id as string,
        data: { name: display(b.customer_id as string), date: b.scheduled_date as string },
        href: '/cleaner/requests',
        once: true,
      })),
    ])
  } catch (e) {
    console.error('sendReminders failed', e)
  }
}
