import { formatBookingDate } from '@/lib/chatFormat'
import type { NotificationKind } from '@/lib/notifications'

export type NotificationData = Record<string, string | number | null | undefined>

type Lang = 'en' | 'he'

// One short sentence per kind. {name} is the other person (hosts see cleaners as
// "First L."), {date} a localized "17 June", {time} "HH:MM", {times} the new
// availability, {score} the star rating. Gender-neutral Hebrew on purpose.
const TEXT: Record<NotificationKind, Record<Lang, string>> = {
  request_received: { en: '{name} requested a clean on {date} at {time}', he: '{name} ביקש/ה ניקיון ב-{date} בשעה {time}' },
  request_accepted: { en: '{name} accepted your request for {date}', he: '{name} אישר/ה את הבקשה שלך ל-{date}' },
  request_declined: { en: '{name} declined your request for {date}', he: '{name} דחה/תה את הבקשה שלך ל-{date}' },
  request_expired: { en: '{name} didn’t respond to your request for {date}', he: '{name} לא הגיב/ה לבקשה שלך ל-{date}' },
  request_cancelled_by_host: { en: '{name} cancelled their request for {date}', he: '{name} ביטל/ה את הבקשה ל-{date}' },
  request_taken: { en: '{name}’s request for {date} was closed — they were matched with another cleaner', he: 'הבקשה של {name} ל-{date} נסגרה — הם הותאמו למנקה אחר/ת' },
  request_cleaner_unavailable: { en: '{name} is no longer available on {date} — your request was cancelled', he: '{name} כבר לא זמין/ה ב-{date} — הבקשה שלך בוטלה' },
  availability_changed: { en: '{name} changed their available times to {times} — is your request for {date} still relevant?', he: 'השעות של {name} השתנו ל-{times} — האם הבקשה שלך ל-{date} עדיין רלוונטית?' },
  host_kept_request: { en: '{name} confirmed their request for {date} is still relevant', he: '{name} אישר/ה שהבקשה ל-{date} עדיין רלוונטית' },
  booking_cancelled_by_host: { en: '{name} cancelled the clean on {date}', he: '{name} ביטל/ה את הניקיון ב-{date}' },
  booking_cancelled_by_cleaner: { en: '{name} cancelled the clean on {date}', he: '{name} ביטל/ה את הניקיון ב-{date}' },
  clean_completed: { en: 'Your clean with {name} is complete — tap to rate', he: 'הניקיון עם {name} הושלם — הקישו כדי לדרג' },
  rating_received: { en: '{name} rated you {score}★', he: '{name} דירג/ה אותך {score}★' },
  account_approved: { en: 'You’re approved — welcome to Clean!', he: 'אושרת — ברוכים הבאים ל-Clean!' },
  account_rejected: { en: 'Your account wasn’t approved', he: 'החשבון שלך לא אושר' },
}

export function describeNotification(kind: string, data: NotificationData, lang: Lang): string {
  const template = TEXT[kind as NotificationKind]?.[lang]
  if (!template) return ''
  const date = typeof data.date === 'string' && data.date ? formatBookingDate(data.date, lang) : ''
  const values: Record<string, string> = {
    name: String(data.name ?? (lang === 'he' ? 'מישהו' : 'Someone')),
    date,
    time: String(data.time ?? ''),
    times: String(data.times ?? ''),
    score: String(data.score ?? ''),
  }
  return Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), template)
}

// "just now", "5m", "3h", "Yesterday", "12 Oct" — short, Facebook-style.
export function relativeTime(iso: string, now: Date, lang: Lang): string {
  const diff = now.getTime() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return lang === 'he' ? 'עכשיו' : 'just now'
  if (min < 60) return lang === 'he' ? `לפני ${min} דק׳` : `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return lang === 'he' ? `לפני ${hr} שע׳` : `${hr}h`
  const days = Math.floor(hr / 24)
  if (days === 1) return lang === 'he' ? 'אתמול' : 'Yesterday'
  if (days < 7) return lang === 'he' ? `לפני ${days} ימים` : `${days}d`
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' })
}
