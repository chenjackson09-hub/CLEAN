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
  // The cleaner's hourly rate in shekels (shown as "₪80 per hour"); omitted when unknown.
  hourlyRate?: number | string | null
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
    booked: 'Cleaning Booked',
    bookedWith: (name: string) => `Cleaning Booked with ${name}`,
    location: 'Location',
    service: 'Service',
    regular: 'Regular Cleaning',
    deep: 'Deep Cleaning',
    rate: 'Rate',
    perHour: (r: string) => `₪${r} per hour`,
    view: 'View Booking',
    privacy: 'For exact address or coordination please use your private chat in app',
  },
  he: {
    booked: 'ניקיון נקבע',
    bookedWith: (name: string) => `ניקיון נקבע עם ${name}`,
    location: 'מיקום',
    service: 'שירות',
    regular: 'ניקיון רגיל',
    deep: 'ניקיון יסודי',
    rate: 'תעריף',
    perHour: (r: string) => `₪${r} לשעה`,
    view: 'צפייה בהזמנה',
    privacy: 'לכתובת המדויקת או לתיאום, אנא השתמשו בצ׳אט הפרטי באפליקציה',
  },
} as const

function rateLabel(rate: CalendarEventInput['hourlyRate']): string | null {
  const n = typeof rate === 'string' ? parseFloat(rate) : rate
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

// "Cleaning Booked - Chen J." (just "Cleaning Booked" when the other person's name is unknown)
export function calendarTitle(input: Pick<CalendarEventInput, 'withName' | 'lang'>): string {
  const s = TEXT[input.lang]
  const name = input.withName?.trim()
  return name ? `${s.booked} - ${name}` : s.booked
}

export function calendarDescription(input: CalendarEventInput): string {
  const s = TEXT[input.lang]
  const name = input.withName?.trim()
  const rate = rateLabel(input.hourlyRate)
  const area = input.area?.trim()
  const lines = [
    name ? s.bookedWith(name) : s.booked,
    area ? `${s.location}: ${area}` : null,
    input.cleaningType ? `${s.service}: ${input.cleaningType === 'deep' ? s.deep : s.regular}` : null,
    rate ? `${s.rate}: ${s.perHour(rate)}` : null,
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
