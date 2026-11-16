import type { SupabaseClient } from '@supabase/supabase-js'
import { shortDateLabel } from '@/lib/dateLabels'
import { bookingLink, chatLink } from '@/lib/googleCalendar'
import { shortName } from '@/lib/chatFormat'
import { profileNames } from '@/lib/notifications'
import { publicOrigin } from '@/lib/siteOrigin'
import { isEmailAddress, sendMail, type MailResult } from '@/lib/mailer'
import { bilingualEmail, hello } from '@/lib/emailLayout'

// The emails that tell people something happened while they were NOT in the app:
//   cleaner  ← a new request (they have 24 hours)
//   host     ← their request was accepted / declined / got no answer
//   anyone   ← their account was approved / not approved / needs more information
//   admins   ← someone finished signing up and waits for approval; a new support message
// (A cancelled confirmed clean has its own file, lib/cancellationEmail.ts.)
// SERVER ONLY. Every sender is best-effort and never throws: an email that can't be sent must
// never fail the action that caused it. PRIVACY: no street address, no phone number, no booking
// notes and no admin notes ever go into these messages.

export type EmailOutcome = MailResult | { sent: false; reason: 'skipped' }
type Built = { subject: string; html: string; text: string }

// ── What each message says (pure) ──────────────────────────────────────────

export function buildNewRequestEmail(i: { cleanerName: string; hostName: string; date: string; time: string; origin: string | null }): Built {
  const hi = hello(i.cleanerName)
  const host = i.hostName.trim()
  const link = i.origin ? `${i.origin}/cleaner/requests` : ''
  return bilingualEmail(
    `Clean: בקשת ניקיון חדשה / New cleaning request (${shortDateLabel(i.date, 'en')}, ${i.time})`,
    {
      hello: hi.he,
      lines: [
        `התקבלה בקשת ניקיון${host ? ` מאת ${host}` : ''} ל${shortDateLabel(i.date, 'he')} בשעה ${i.time}.`,
        'יש 24 שעות לאשר או לדחות את הבקשה. לאחר מכן היא נסגרת.',
      ],
      links: [{ href: link, label: 'לצפייה בבקשה' }],
    },
    {
      hello: hi.en,
      lines: [
        `${host || 'A host'} sent you a cleaning request for ${shortDateLabel(i.date, 'en')} at ${i.time}.`,
        'You have 24 hours to accept or decline. After that the request closes.',
      ],
      links: [{ href: link, label: 'See the request' }],
    },
  )
}

export function buildRequestAnsweredEmail(i: {
  kind: 'accepted' | 'declined' | 'expired'
  hostName: string
  cleanerName: string // as the host knows them ("First L.")
  date: string
  time: string
  origin: string | null
  cleanerId: string
  bookingId: string
}): Built {
  const hi = hello(i.hostName)
  const cleaner = i.cleanerName.trim()
  const dHe = shortDateLabel(i.date, 'he')
  const dEn = shortDateLabel(i.date, 'en')
  const browse = i.origin ? `${i.origin}/browse` : ''
  if (i.kind === 'accepted') {
    const chat = i.origin ? chatLink('host', i.cleanerId, i.origin) : ''
    const details = i.origin ? bookingLink('host', i.bookingId, i.origin) : ''
    return bilingualEmail(
      `Clean: הבקשה אושרה / Your request was accepted (${dEn}, ${i.time})`,
      {
        hello: hi.he,
        lines: [
          `הבקשה שלך ל${dHe} בשעה ${i.time} אושרה${cleaner ? ` על ידי ${cleaner}` : ''}.`,
          `הניקיון נקבע. אפשר לתאם את הפרטים${cleaner ? ` עם ${cleaner}` : ''} בצ׳אט באפליקציה.`,
        ],
        links: [{ href: chat, label: cleaner ? `לשיחה עם ${cleaner}` : 'לשיחה באפליקציה' }, { href: details, label: 'לפרטי הניקיון' }],
      },
      {
        hello: hi.en,
        lines: [
          `${cleaner || 'Your cleaner'} accepted your request for ${dEn} at ${i.time}.`,
          `The cleaning is booked. You can arrange the details${cleaner ? ` with ${cleaner}` : ''} in the app's chat.`,
        ],
        links: [{ href: chat, label: cleaner ? `Open your chat with ${cleaner}` : 'Open the chat' }, { href: details, label: 'See the cleaning' }],
      },
    )
  }
  const expired = i.kind === 'expired'
  return bilingualEmail(
    expired ? `Clean: הבקשה נסגרה ללא תשובה / Your request got no answer (${dEn})` : `Clean: הבקשה לא אושרה / Your request was declined (${dEn})`,
    {
      hello: hi.he,
      lines: [
        expired
          ? `הבקשה שלך ל${dHe} נסגרה, כי לא התקבלה תשובה${cleaner ? ` מ-${cleaner}` : ''} בתוך 24 שעות.`
          : `הבקשה שלך ל${dHe} לא אושרה${cleaner ? ` על ידי ${cleaner}` : ''}.`,
        'אפשר לחפש מנקה ולשלוח בקשה חדשה.',
      ],
      links: [{ href: browse, label: 'לחיפוש מנקה' }],
    },
    {
      hello: hi.en,
      lines: [
        expired
          ? `${cleaner || 'The cleaner'} didn't answer your request for ${dEn} within 24 hours, so it was closed.`
          : `${cleaner || 'The cleaner'} can't take your request for ${dEn}.`,
        'You can send a request to another cleaner.',
      ],
      links: [{ href: browse, label: 'Find a cleaner' }],
    },
  )
}

export function buildAccountDecisionEmail(i: { name: string; role: 'cleaner' | 'host'; status: 'approved' | 'rejected' | 'needs_info'; origin: string | null }): Built {
  const hi = hello(i.name)
  const at = (path: string) => (i.origin ? `${i.origin}${path}` : '')
  if (i.status === 'approved') {
    return bilingualEmail(
      'Clean: החשבון שלך אושר / Your account was approved',
      {
        hello: hi.he,
        lines: [
          'החשבון שלך ב-Clean אושר.',
          i.role === 'cleaner'
            ? 'מארחים יכולים עכשיו למצוא אותך. כדאי לוודא שיש בפרופיל תמונה ותעריף, ולסמן את הימים הפנויים.'
            : 'אפשר עכשיו לחפש מנקים ולשלוח בקשות.',
        ],
        links: [i.role === 'cleaner' ? { href: at('/cleaner/availability'), label: 'לסימון הימים הפנויים' } : { href: at('/browse'), label: 'לחיפוש מנקה' }],
      },
      {
        hello: hi.en,
        lines: [
          'Your Clean account was approved.',
          i.role === 'cleaner'
            ? "Hosts can now find you. Make sure your profile has a photo and a rate, and mark the days you're available."
            : 'You can now find cleaners and send requests.',
        ],
        links: [i.role === 'cleaner' ? { href: at('/cleaner/availability'), label: 'Mark your available days' } : { href: at('/browse'), label: 'Find a cleaner' }],
      },
    )
  }
  if (i.status === 'needs_info') {
    return bilingualEmail(
      'Clean: נדרש מידע נוסף / We need a bit more information',
      {
        hello: hi.he,
        lines: ['כדי להמשיך בבדיקת ההרשמה שלך ל-Clean נדרש מידע נוסף.', 'אפשר להשלים את הפרופיל באפליקציה, או לפנות אלינו דרך כפתור העזרה.'],
        links: [{ href: at(i.role === 'cleaner' ? '/cleaner/profile?edit=1' : '/profile?edit=1'), label: 'לעדכון הפרופיל' }],
      },
      {
        hello: hi.en,
        lines: ['We need a bit more information to finish reviewing your Clean sign-up.', 'You can complete your profile in the app, or reach us with the Help button.'],
        links: [{ href: at(i.role === 'cleaner' ? '/cleaner/profile?edit=1' : '/profile?edit=1'), label: 'Update your profile' }],
      },
    )
  }
  return bilingualEmail(
    'Clean: עדכון לגבי החשבון שלך / An update on your account',
    {
      hello: hi.he,
      lines: ['לא נוכל לאשר את החשבון שלך ב-Clean בשלב זה.', 'לשאלות אפשר לפנות אלינו דרך כפתור העזרה באפליקציה.'],
    },
    {
      hello: hi.en,
      lines: ["We can't approve your Clean account at this time.", 'If you have questions, reach us with the Help button in the app.'],
    },
  )
}

const ROLE_WORD = { he: { cleaner: 'מנקה', customer: 'מארח', host: 'מארח' }, en: { cleaner: 'cleaner', customer: 'host', host: 'host' } } as const
function roleWord(role: string, lang: 'he' | 'en'): string {
  return (ROLE_WORD[lang] as Record<string, string>)[role] ?? ''
}

export function buildAdminSignupEmail(i: { name: string; role: string; origin: string | null }): Built {
  const name = i.name.trim() || '—'
  const link = i.origin ? `${i.origin}/admin/applications` : ''
  return bilingualEmail(
    `Clean admin: הרשמה חדשה ממתינה לאישור / New sign-up waiting for approval`,
    {
      hello: 'שלום,',
      lines: [`הרשמה חדשה ממתינה לאישור: ${name}${roleWord(i.role, 'he') ? ` (${roleWord(i.role, 'he')})` : ''}.`],
      links: [{ href: link, label: 'לרשימת ההרשמות' }],
    },
    {
      hello: 'Hi,',
      lines: [`${name} finished signing up${roleWord(i.role, 'en') ? ` as a ${roleWord(i.role, 'en')}` : ''} and is waiting for approval.`],
      links: [{ href: link, label: 'Open the applications list' }],
    },
  )
}

const SUPPORT_PREVIEW = 600

export function buildAdminSupportEmail(i: { name: string; role: string; message: string; origin: string | null }): Built {
  const name = i.name.trim() || '—'
  const link = i.origin ? `${i.origin}/admin/support` : ''
  const text = i.message.length > SUPPORT_PREVIEW ? `${i.message.slice(0, SUPPORT_PREVIEW)}…` : i.message
  return bilingualEmail(
    `Clean admin: הודעת תמיכה חדשה / New support message`,
    {
      hello: 'שלום,',
      lines: [`הודעת תמיכה חדשה מאת ${name}${roleWord(i.role, 'he') ? ` (${roleWord(i.role, 'he')})` : ''}.`],
      quote: { label: 'ההודעה:', text },
      links: [{ href: link, label: 'לתיבת התמיכה' }],
    },
    {
      hello: 'Hi,',
      lines: [`New support message from ${name}${roleWord(i.role, 'en') ? ` (${roleWord(i.role, 'en')})` : ''}.`],
      quote: { label: 'Message:', text },
      links: [{ href: link, label: 'Open the support inbox' }],
    },
  )
}

// ── Sending (best-effort) ──────────────────────────────────────────────────

async function emailOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId)
  const email = data?.user?.email
  return isEmailAddress(email) ? email : null
}

async function adminEmails(admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin.from('profiles').select('id').eq('role', 'admin')
  const found = await Promise.all(((data ?? []) as { id: string }[]).map((p) => emailOf(admin, p.id).catch(() => null)))
  return found.filter((e): e is string => !!e)
}

async function safely(what: string, run: () => Promise<EmailOutcome>): Promise<EmailOutcome> {
  try {
    return await run()
  } catch (e) {
    console.error(`email (${what}) failed`, e)
    return { sent: false, reason: 'failed', error: e instanceof Error ? e.message : String(e) }
  }
}

// Cleaner ← a new request. A host who offers several days for ONE clean ("flexible days") sends a
// request per day; the cleaner gets one email for that clean, not one per day.
export function emailNewRequest(
  admin: SupabaseClient,
  o: { hostId: string; cleanerId: string; date: string; time: string; groupId?: string | null },
): Promise<EmailOutcome> {
  return safely('new request', async () => {
    if (o.groupId) {
      const { count } = await admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', o.hostId)
        .eq('cleaner_id', o.cleanerId)
        .eq('clean_group_id', o.groupId)
        .eq('status', 'pending')
      if ((count ?? 0) > 1) return { sent: false, reason: 'skipped' }
    }
    const to = await emailOf(admin, o.cleanerId)
    if (!to) return { sent: false, reason: 'bad_recipient' }
    const names = await profileNames(admin, [o.hostId, o.cleanerId])
    return sendMail({
      to,
      ...buildNewRequestEmail({
        cleanerName: names.get(o.cleanerId) ?? '',
        hostName: names.get(o.hostId) ?? '',
        date: o.date,
        time: o.time.slice(0, 5),
        origin: publicOrigin(),
      }),
    })
  })
}

// Host ← the answer to their request (or that nobody answered in time).
export function emailRequestAnswered(
  admin: SupabaseClient,
  o: { kind: 'accepted' | 'declined' | 'expired'; bookingId: string; hostId: string; cleanerId: string; date: string; time?: string | null },
): Promise<EmailOutcome> {
  return safely(`request ${o.kind}`, async () => {
    const to = await emailOf(admin, o.hostId)
    if (!to) return { sent: false, reason: 'bad_recipient' }
    const names = await profileNames(admin, [o.hostId, o.cleanerId])
    return sendMail({
      to,
      ...buildRequestAnsweredEmail({
        kind: o.kind,
        hostName: names.get(o.hostId) ?? '',
        cleanerName: shortName(names.get(o.cleanerId) ?? ''),
        date: o.date,
        time: (o.time ?? '').slice(0, 5),
        origin: publicOrigin(),
        cleanerId: o.cleanerId,
        bookingId: o.bookingId,
      }),
    })
  })
}

// Cleaner or host ← the admin's decision about their account.
export function emailAccountDecision(
  admin: SupabaseClient,
  o: { userId: string; role: 'cleaner' | 'host'; status: 'approved' | 'rejected' | 'needs_info' },
): Promise<EmailOutcome> {
  return safely(`account ${o.status}`, async () => {
    const to = await emailOf(admin, o.userId)
    if (!to) return { sent: false, reason: 'bad_recipient' }
    const names = await profileNames(admin, [o.userId])
    return sendMail({ to, ...buildAccountDecisionEmail({ name: names.get(o.userId) ?? '', role: o.role, status: o.status, origin: publicOrigin() }) })
  })
}

// Every admin ← someone finished signing up and is waiting to be approved.
export function emailAdminsNewSignup(admin: SupabaseClient, o: { userId: string; role: string }): Promise<EmailOutcome> {
  return safely('admin: new sign-up', async () => {
    const to = await adminEmails(admin)
    if (to.length === 0) return { sent: false, reason: 'bad_recipient' }
    const names = await profileNames(admin, [o.userId])
    return sendMail({ to, ...buildAdminSignupEmail({ name: names.get(o.userId) ?? '', role: o.role, origin: publicOrigin() }) })
  })
}

// Every admin ← a new message from the Help button.
export function emailAdminsSupportMessage(admin: SupabaseClient, o: { userId: string; role: string; message: string }): Promise<EmailOutcome> {
  return safely('admin: support message', async () => {
    const to = await adminEmails(admin)
    if (to.length === 0) return { sent: false, reason: 'bad_recipient' }
    const names = await profileNames(admin, [o.userId])
    return sendMail({ to, ...buildAdminSupportEmail({ name: names.get(o.userId) ?? '', role: o.role, message: o.message, origin: publicOrigin() }) })
  })
}
