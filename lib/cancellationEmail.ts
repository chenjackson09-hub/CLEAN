import type { SupabaseClient } from '@supabase/supabase-js'
import { reasonLabel, type CancelSuccess } from '@/lib/cancellation'
import { shortDateLabel } from '@/lib/dateLabels'
import { bookingLink, chatLink } from '@/lib/googleCalendar'
import { shortName } from '@/lib/chatFormat'
import { profileNames } from '@/lib/notifications'
import { publicOrigin } from '@/lib/siteOrigin'
import { isEmailAddress, sendMail, type MailResult } from '@/lib/mailer'

// The email the OTHER person gets when a CONFIRMED clean is cancelled (a withdrawn pending
// request only gets the bell notification). SERVER ONLY (it sends mail).
//
// One message in both languages, Hebrew first: the server doesn't know which language the
// recipient uses in the app. PRIVACY: like the calendar event, it never contains the street
// address or the booking notes — only who, when, the reason and the canceller's own note.

export type CancellationEmailInput = {
  recipientRole: 'host' | 'cleaner' // who receives it; the other side cancelled
  recipientName: string
  otherName: string // the person who cancelled, as the recipient knows them
  date: string // YYYY-MM-DD
  time: string // HH:MM
  reason: string | null
  message: string | null
  origin: string | null // public site address; null = no links
  otherUserId: string
  bookingId: string
  canRebook: boolean // host only: the day hasn't passed, so "find another cleaner" makes sense
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

export function buildCancellationEmail(input: CancellationEmailInput): { subject: string; html: string; text: string } {
  const { recipientRole, date, time, origin } = input
  const cancelledBy = recipientRole === 'host' ? 'cleaner' : 'host'
  const hi = firstName(input.recipientName)
  const other = input.otherName.trim()
  const dateEn = shortDateLabel(date, 'en')
  const dateHe = shortDateLabel(date, 'he')
  const reasonEn = reasonLabel(input.reason, cancelledBy, 'en')
  const reasonHe = reasonLabel(input.reason, cancelledBy, 'he')
  const note = (input.message ?? '').trim()

  const chat = origin && input.otherUserId ? chatLink(recipientRole, input.otherUserId, origin) : null
  const details = origin ? bookingLink(recipientRole, input.bookingId, origin) : null
  const rebook = origin && recipientRole === 'host' && input.canRebook ? `${origin}/browse?rebook=${encodeURIComponent(input.bookingId)}` : null

  const he = {
    hello: hi ? `שלום ${hi},` : 'שלום,',
    main:
      recipientRole === 'host'
        ? `הניקיון שנקבע${other ? ` עם ${other}` : ''} ל${dateHe} בשעה ${time} בוטל על ידי המנקה.`
        : `הניקיון שנקבע${other ? ` אצל ${other}` : ''} ל${dateHe} בשעה ${time} בוטל על ידי המארח.`,
    extra: recipientRole === 'cleaner' ? 'הזמן הזה חזר להיות פנוי ביומן שלך.' : '',
    reason: reasonHe ? `סיבה: ${reasonHe}` : '',
    note: note ? `הודעה${other ? ` מאת ${other}` : ''}:` : '',
    rebook: 'למציאת מנקה לאותו יום',
    chat: other ? `לשיחה עם ${other}` : 'לשיחה באפליקציה',
    details: 'לפרטי הניקיון שבוטל',
    footer: 'זוהי הודעה אוטומטית מ-Clean, אין להשיב לה. ליצירת קשר אפשר להשתמש בצ׳אט באפליקציה.',
  }
  const en = {
    hello: hi ? `Hi ${hi},` : 'Hi,',
    main:
      recipientRole === 'host'
        ? `${other || 'Your cleaner'} had to cancel the cleaning booked for ${dateEn} at ${time}.`
        : `${other || 'Your host'} cancelled the cleaning booked for ${dateEn} at ${time}.`,
    extra: recipientRole === 'cleaner' ? 'Your availability for this time has been reopened.' : '',
    reason: reasonEn ? `Reason: ${reasonEn}` : '',
    note: note ? `Note${other ? ` from ${other}` : ''}:` : '',
    rebook: 'Find another cleaner for that day',
    chat: other ? `Open your chat with ${other}` : 'Open the chat in the app',
    details: 'See the cancelled cleaning',
    footer: "This is an automatic message from Clean, so please don't reply to it. To get in touch, use the chat in the app.",
  }

  const block = (t: typeof en, dir: 'rtl' | 'ltr') => {
    const link = (href: string | null, label: string) =>
      href ? `<p style="margin:6px 0"><a href="${esc(href)}" style="color:#2563eb">${esc(label)}</a></p>` : ''
    return [
      `<div dir="${dir}" style="text-align:${dir === 'rtl' ? 'right' : 'left'}">`,
      `<p style="margin:0 0 10px">${esc(t.hello)}</p>`,
      `<p style="margin:0 0 10px"><strong>${esc(t.main)}</strong></p>`,
      t.extra ? `<p style="margin:0 0 10px">${esc(t.extra)}</p>` : '',
      t.reason ? `<p style="margin:0 0 10px">${esc(t.reason)}</p>` : '',
      t.note ? `<p style="margin:0 0 4px">${esc(t.note)}</p><p style="margin:0 0 10px;padding:8px 12px;background:#f3f4f6;border-radius:8px;white-space:pre-wrap">${esc(note)}</p>` : '',
      link(rebook, t.rebook),
      link(chat, t.chat),
      link(details, t.details),
      `<p style="margin:14px 0 0;color:#6b7280;font-size:12px">${esc(t.footer)}</p>`,
      `</div>`,
    ].join('')
  }

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:520px">` +
    block(he, 'rtl') +
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">` +
    block(en, 'ltr') +
    `</div>`

  const plain = (t: typeof en) =>
    [
      t.hello,
      '',
      t.main,
      t.extra,
      t.reason,
      t.note ? `${t.note} ${note}` : '',
      rebook ? `${t.rebook}: ${rebook}` : '',
      chat ? `${t.chat}: ${chat}` : '',
      details ? `${t.details}: ${details}` : '',
      '',
      t.footer,
    ]
      .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
      .join('\n')

  return {
    subject: `Clean: הניקיון בוטל / Cleaning cancelled (${dateEn}, ${time})`,
    html,
    text: `${plain(he)}\n\n----------\n\n${plain(en)}`,
  }
}

function israelToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
}

export type CancellationEmailResult = MailResult | { sent: false; reason: 'skipped' }

// Called by the two cancel actions after cancelBookingCore succeeded. Best-effort: it never
// throws, and a clean is cancelled whether or not the email goes out.
export async function sendCancellationEmail(admin: SupabaseClient, result: CancelSuccess): Promise<CancellationEmailResult> {
  try {
    if (!result.wasConfirmed) return { sent: false, reason: 'skipped' }
    const { booking, role } = result
    const recipientRole: 'host' | 'cleaner' = role === 'host' ? 'cleaner' : 'host'
    const recipientId = recipientRole === 'host' ? booking.customer_id : booking.cleaner_id
    const otherId = recipientRole === 'host' ? booking.cleaner_id : booking.customer_id

    const { data: account } = await admin.auth.admin.getUserById(recipientId)
    const to = account?.user?.email
    if (!isEmailAddress(to)) return { sent: false, reason: 'bad_recipient' }

    // Why it was cancelled — read apart, so a database without those columns still sends the email.
    const { data: why } = await admin
      .from('bookings')
      .select('cancellation_reason, cancellation_message')
      .eq('id', booking.id)
      .maybeSingle<{ cancellation_reason: string | null; cancellation_message: string | null }>()

    const names = await profileNames(admin, [recipientId, otherId])
    const otherFull = names.get(otherId) ?? ''

    const email = buildCancellationEmail({
      recipientRole,
      recipientName: names.get(recipientId) ?? '',
      // A host knows their cleaner as "First L."; a cleaner sees the host's name as everywhere else.
      otherName: recipientRole === 'host' ? shortName(otherFull) : otherFull,
      date: booking.scheduled_date,
      time: booking.scheduled_start.slice(0, 5),
      reason: why?.cancellation_reason ?? null,
      message: why?.cancellation_message ?? null,
      origin: publicOrigin(),
      otherUserId: otherId,
      bookingId: booking.id,
      canRebook: booking.scheduled_date >= israelToday(),
    })
    return await sendMail({ to, ...email })
  } catch (e) {
    console.error('cancel: email failed', e)
    return { sent: false, reason: 'failed', error: e instanceof Error ? e.message : String(e) }
  }
}
