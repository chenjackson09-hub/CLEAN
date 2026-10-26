// Builds the "Add to Google Calendar" link for a confirmed clean (Phase 1: a plain
// prefilled-event URL — no Google sign-in, no API, nothing is saved by us; the
// person presses Save in Google Calendar).
//
// PRIVACY: the event never contains the exact address. The only place information
// that goes in is the general AREA (the host's chosen town, e.g. "Beit Hillel"),
// passed in separately — this module never receives the street address or the
// booking notes at all, so it can't leak them. The exact address is shared in the
// private chat.

export type CalendarLang = 'en' | 'he'

export type CalendarEventInput = {
  bookingId: string
  date: string // 'YYYY-MM-DD'
  start: string // 'HH:MM' or 'HH:MM:SS' (Israel local time)
  durationHours: number | string | null | undefined
  cleaningType?: 'regular' | 'deep' | null
  // General area only (a town name). Blank/undefined → no location on the event.
  area?: string | null
  // The person on the other side, as already shown in the app ("Noa R.").
  withName?: string | null
  // Full URL of the booking in the web app.
  link: string
  lang: CalendarLang
}

// Clean's market is Israel; times are stored as local wall-clock time.
export const CALENDAR_TIME_ZONE = 'Asia/Jerusalem'
// Used only when a booking has no usable duration ("Not sure" bookings still store
// a default, so this is a last resort).
const FALLBACK_HOURS = 2

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^(\d{2}):(\d{2})/

export function bookingReference(bookingId: string): string {
  return `#${bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// "2026-10-15" + "09:00" + 3.5h → { date: "2026-10-15", time: "12:30" }. Pure
// calendar arithmetic (no Date in the local zone), so a clean that runs past
// midnight rolls to the next day and DST/zone offsets can never shift it.
export function addHours(date: string, start: string, hours: number): { date: string; time: string } | null {
  const m = TIME_RE.exec(start)
  if (!DATE_RE.test(date) || !m) return null
  const [y, mo, d] = date.split('-').map(Number)
  const minutes = Math.round(hours * 60)
  const t = new Date(Date.UTC(y, mo - 1, d, Number(m[1]), Number(m[2]) + minutes))
  return {
    date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`,
  }
}

// Google's compact local-time format: 20261015T090000
function stamp(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

function cleanDuration(d: CalendarEventInput['durationHours']): number {
  const n = typeof d === 'string' ? parseFloat(d) : d
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 24 ? n : FALLBACK_HOURS
}

const TEXT = {
  en: {
    title: 'Cleaning Appointment',
    confirmed: 'Cleaning appointment confirmed.',
    reference: 'Booking Reference',
    service: 'Service',
    regular: 'Regular cleaning',
    deep: 'Deep cleaning',
    area: 'Area',
    with: 'With',
    duration: 'Estimated duration',
    hours: (h: string) => `about ${h} h`,
    view: 'View Booking',
    privacy: 'For the exact address and any coordination, please use your private chat in the app.',
  },
  he: {
    title: 'ניקיון',
    confirmed: 'הניקיון אושר.',
    reference: 'מספר הזמנה',
    service: 'סוג שירות',
    regular: 'ניקיון רגיל',
    deep: 'ניקיון יסודי',
    area: 'אזור',
    with: 'עם',
    duration: 'משך משוער',
    hours: (h: string) => `כ-${h} שעות`,
    view: 'צפייה בהזמנה',
    privacy: 'לכתובת המדויקת ולתיאום, השתמשו בצ׳אט הפרטי באפליקציה.',
  },
} as const

function hoursLabel(h: number): string {
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 10) / 10)
}

export function calendarTitle(input: Pick<CalendarEventInput, 'bookingId' | 'lang'>): string {
  return `${TEXT[input.lang].title} – ${bookingReference(input.bookingId)}`
}

export function calendarDescription(input: CalendarEventInput): string {
  const s = TEXT[input.lang]
  const hours = cleanDuration(input.durationHours)
  const lines = [
    s.confirmed,
    `${s.reference}: ${bookingReference(input.bookingId)}`,
    input.cleaningType ? `${s.service}: ${input.cleaningType === 'deep' ? s.deep : s.regular}` : null,
    input.area?.trim() ? `${s.area}: ${input.area.trim()}` : null,
    input.withName?.trim() ? `${s.with}: ${input.withName.trim()}` : null,
    `${s.duration}: ${s.hours(hoursLabel(hours))}`,
    '',
    `${s.view}:`,
    input.link,
    '',
    s.privacy,
  ]
  return lines.filter((l): l is string => l !== null).join('\n')
}

// Returns null when the booking has no usable date/time (the button then isn't shown).
export function buildGoogleCalendarUrl(input: CalendarEventInput): string | null {
  const end = addHours(input.date, input.start, cleanDuration(input.durationHours))
  const startMatch = TIME_RE.exec(input.start)
  if (!end || !startMatch) return null
  const startTime = `${startMatch[1]}:${startMatch[2]}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarTitle(input),
    dates: `${stamp(input.date, startTime)}/${stamp(end.date, end.time)}`,
    ctz: CALENDAR_TIME_ZONE,
    details: calendarDescription(input),
  })
  const area = input.area?.trim()
  if (area) params.set('location', area)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Where a person lands when they open the booking from the calendar event. The
// pages themselves only ever load that person's OWN bookings, so a link to someone
// else's booking simply opens nothing.
export function bookingLink(role: 'host' | 'cleaner', bookingId: string, origin: string): string {
  const base = origin.replace(/\/+$/, '')
  const path = role === 'host' ? '/bookings' : '/cleaner/dashboard'
  return `${base}${path}?booking=${encodeURIComponent(bookingId)}`
}
