'use client'
import { useEffect, useState } from 'react'
import { bookingLink, buildGoogleCalendarUrl, type CalendarLang } from '@/lib/googleCalendar'

const STRINGS = {
  en: { label: 'Add to Google Calendar', hint: 'Opens Google Calendar in a new tab — press Save there to add it.' },
  he: { label: 'הוספה ליומן Google', hint: 'פותח את יומן Google בלשונית חדשה — לחצו שם על שמירה כדי להוסיף.' },
} as const

const WORKDAY_TZ = 'Asia/Jerusalem'
// A localhost value (left over from development) must never end up in someone's calendar,
// so only a real public URL from the environment is trusted; otherwise use the address
// the app is open on, which on the live site IS the production URL.
const rawOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()
const envOrigin = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(rawOrigin) ? '' : rawOrigin

// "Add to Google Calendar" for a CONFIRMED, upcoming clean — for hosts and cleaners.
// A plain link (Google's event-template URL): nothing is connected, nothing is
// saved by us, and we never assume the person pressed Save. The event holds only
// the general area, never the street address (see lib/googleCalendar.ts).
// i18n-agnostic (a plain `lang` prop) because it sits in both i18n systems.
export function AddToCalendarButton({ booking, role, lang, withName, hourlyRate }: {
  booking: {
    id: string
    status: string
    scheduled_date: string
    scheduled_start: string
    duration_hours: number
    cleaning_type?: 'regular' | 'deep' | null
    area?: { he: string; en: string } | null
  }
  // The cleaner's hourly rate in shekels (the booking itself doesn't store one).
  hourlyRate?: number | string | null
  role: 'host' | 'cleaner'
  lang: CalendarLang
  withName?: string | null
}) {
  // The production URL when configured, else wherever the app is open right now.
  const [origin, setOrigin] = useState(envOrigin)
  useEffect(() => {
    if (!envOrigin) setOrigin(window.location.origin)
  }, [])

  // Only a confirmed clean that hasn't happened yet.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: WORKDAY_TZ })
  if (booking.status !== 'accepted' || booking.scheduled_date < today) return null

  const url = buildGoogleCalendarUrl({
    bookingId: booking.id,
    date: booking.scheduled_date,
    start: booking.scheduled_start,
    durationHours: booking.duration_hours,
    cleaningType: booking.cleaning_type,
    area: booking.area ? booking.area[lang] : null,
    withName,
    hourlyRate,
    link: bookingLink(role, booking.id, origin),
    lang,
  })
  if (!url) return null
  const s = STRINGS[lang]

  return (
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {s.label}
      </a>
      <p className="mt-1.5 text-xs text-gray-400">{s.hint}</p>
    </div>
  )
}
