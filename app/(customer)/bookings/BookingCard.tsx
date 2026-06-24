'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

// Date-cube colour: green when accepted, orange while pending, black for past
// cleans (completed/declined/cancelled).
const DATE_BLOCK_COLOR: Record<BookingStatus, string> = {
  accepted: 'bg-green-600',
  pending: 'bg-orange-500',
  completed: 'bg-black',
  declined: 'bg-black',
  cancelled: 'bg-black',
}

const FUTURE_STATUSES: BookingStatus[] = ['pending', 'accepted']

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function BookingCard({ booking, muted = false }: { booking: BookingResult; muted?: boolean }) {
  const { t, lang } = useLanguage()

  const [y, m, d] = booking.scheduled_date.split('-').map(Number)
  const month = new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' })

  // End time = start + duration, for a "09:00 - 12:00" range.
  const start = new Date(`1970-01-01T${booking.scheduled_start}`)
  const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000)
  const endStr = end.toTimeString().slice(0, 5)

  const days = daysUntil(booking.scheduled_date)
  const showCountdown = FUTURE_STATUSES.includes(booking.status) && days >= 0
  const countdown = days === 0 ? t('bookingCard.today') : days === 1 ? t('bookingCard.tomorrow') : t('bookingCard.inDays', { days })

  return (
    <div className={`rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-start gap-4 ${muted ? 'bg-gray-50 opacity-75' : 'bg-white'}`}>
      {/* Calendar-style date cube, coloured by status */}
      <div className={`${DATE_BLOCK_COLOR[booking.status]} rounded-xl px-3 py-2 text-center leading-tight min-w-[3.5rem] shrink-0`}>
        <div className="text-2xl font-bold text-white">{d}</div>
        <div className="text-xs font-medium text-white/80 uppercase tracking-wide">{month}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex justify-between items-start gap-2 mb-1">
          <p className="font-bold text-gray-900 truncate">{booking.cleaner_name}</p>
          <span className={`text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap ${STATUS_BADGE[booking.status]}`}>
            {t(`bookingCard.status.${booking.status}`)}
          </span>
        </div>

        <p className="text-sm text-gray-500">
          {booking.scheduled_start.slice(0, 5)} - {endStr} · {booking.duration_hours} {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
          {showCountdown && <> · <span className="font-semibold text-blue-600">{countdown}</span></>}
        </p>

        <p className="text-sm text-gray-600 mt-1">{booking.address}</p>

        {booking.notes && (
          <p className="text-sm text-gray-500 italic mt-2">&quot;{booking.notes}&quot;</p>
        )}

        {booking.status === 'accepted' && booking.cleaner_phone && booking.cleaner_email && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingCard.contact.title')}</p>
            <p>{t('bookingCard.contact.phone')}: {booking.cleaner_phone}</p>
            <p>{t('bookingCard.contact.email')}: {booking.cleaner_email}</p>
          </div>
        )}
      </div>
    </div>
  )
}
