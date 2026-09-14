'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingDetailModal } from './BookingDetailModal'
import { extractArea } from '@/lib/bookingArea'
import { daysBetween } from '@/lib/dateMath'
import type { BookingResult } from '@/lib/types/booking'

// A quick-glance "confirmed schedule" card — accepted/completed bookings
// only (see /home and the /bookings "Confirmed"/"Past cleans" tabs) — matching
// the stakeholder developer spec's Home Screen mockup: date cube, "Booked
// with {name}", area · time · countdown, and a status pill. Tapping it opens
// the same BookingDetailModal every other booking view uses for full detail.
export function ScheduleCard({ booking, todayStr }: { booking: BookingResult; todayStr: string }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)

  const [y, m, d] = booking.scheduled_date.split('-').map(Number)
  const month = new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' })

  const isPast = booking.status === 'completed'
  const daysUntil = daysBetween(todayStr, booking.scheduled_date)
  const countdown = isPast
    ? null
    : daysUntil <= 0
      ? t('scheduleCard.today')
      : daysUntil === 1
        ? t('scheduleCard.tomorrow')
        : t('scheduleCard.inDays', { n: String(daysUntil) })

  const area = extractArea(booking.address) ?? booking.address

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-start bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
      >
        <div className={`${isPast ? 'bg-gray-800' : 'bg-green-600'} rounded-xl px-3 py-2 text-center leading-tight min-w-[3.5rem] shrink-0`}>
          <div className="text-xl font-bold text-white">{d}</div>
          <div className="text-xs font-medium text-white/80 uppercase tracking-wide">{month}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{t('scheduleCard.bookedWith', { name: booking.cleaner_name })}</p>
          <p className="text-sm text-gray-500 truncate">
            {area} · {booking.scheduled_start.slice(0, 5)}
            {countdown && <> · {countdown}</>}
          </p>
          <span
            className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPast ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
            }`}
          >
            {isPast ? t('scheduleCard.completed') : t('scheduleCard.confirmed')}
          </span>
        </div>
      </button>

      {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}
