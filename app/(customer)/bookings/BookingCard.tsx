'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingDetailModal } from './BookingDetailModal'
import { acknowledgeBookingSeen } from '@/app/(customer)/actions'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-200 text-gray-600',
}

// Date-cube colour: green when accepted, orange while pending, black for past
// cleans (completed/declined/cancelled).
const DATE_BLOCK_COLOR: Record<BookingStatus, string> = {
  accepted: 'bg-green-600',
  pending: 'bg-orange-500',
  completed: 'bg-black',
  declined: 'bg-red-600',
  cancelled: 'bg-black',
}

export function BookingCard({ booking, muted = false, dismissible = false }: { booking: BookingResult; muted?: boolean; dismissible?: boolean }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  async function markSeen(e: React.MouseEvent) {
    // Don't let the click bubble up and open the detail modal.
    e.stopPropagation()
    setDismissing(true)
    // On success the page revalidates and this card drops out of the list; only
    // re-enable on failure so it can be retried.
    const res = await acknowledgeBookingSeen(booking.id)
    if (res?.error) setDismissing(false)
  }

  const [y, m, d] = booking.scheduled_date.split('-').map(Number)
  const month = new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' })

  const initial = booking.cleaner_name.trim().charAt(0).toUpperCase() || '?'

  // The cleaner can edit a still-live booking (time / duration / note); flag it
  // so the customer notices their request changed. Only meaningful while the
  // booking is still active — terminal states (declined/cancelled/completed)
  // don't need to call out a stale edit.
  const modified = !!booking.cleaner_modified && (booking.status === 'pending' || booking.status === 'accepted')

  // Display name as "First L." — first name plus the last name's initial.
  const nameParts = booking.cleaner_name.trim().split(/\s+/)
  const displayName = nameParts.length > 1
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}.`
    : booking.cleaner_name

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(true)
        }
      }}
      className={`relative text-start cursor-pointer rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-start gap-4 ${muted ? 'bg-gray-50 opacity-75' : 'bg-white'} ${modified ? 'ring-2 ring-amber-400' : ''}`}
    >
      {/* Calendar-style date cube, coloured by status */}
      <div className={`${DATE_BLOCK_COLOR[booking.status]} rounded-xl px-3 py-2 text-center leading-tight min-w-[3.5rem] shrink-0`}>
        <div className="text-2xl font-bold text-white">{d}</div>
        <div className="text-xs font-medium text-white/80 uppercase tracking-wide">{month}</div>
      </div>

      {/* Cleaner profile picture, with the status badge beneath it. Absolutely
          positioned in the top-end corner so its height doesn't push the booking
          info below it down. */}
      <div className="absolute top-4 end-4 flex flex-col items-center gap-1">
        {booking.cleaner_avatar_url ? (
          <img
            src={booking.cleaner_avatar_url}
            alt={booking.cleaner_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
            {initial}
          </div>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-xl font-semibold whitespace-nowrap ${STATUS_BADGE[booking.status]}`}>
          {t(`bookingCard.status.${booking.status}`)}
        </span>
        {modified && (
          <span className="text-xs px-2 py-0.5 rounded-xl font-semibold whitespace-nowrap bg-amber-100 text-amber-800">
            {t('bookingCard.modified')}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 pe-16">
        <p className="font-bold text-gray-900 truncate mb-1">{displayName}</p>

        <p className="text-sm text-gray-500">
          {booking.scheduled_start.slice(0, 5)} · {booking.duration_hours} {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
        </p>

        <p className="text-sm text-gray-600 mt-1">{booking.address}</p>


        {booking.status === 'accepted' && booking.cleaner_phone && booking.cleaner_email && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingCard.contact.title')}</p>
            <p>{t('bookingCard.contact.phone')}: {booking.cleaner_phone}</p>
            <p>{t('bookingCard.contact.email')}: {booking.cleaner_email}</p>
          </div>
        )}

        {dismissible && (
          <button
            type="button"
            onClick={markSeen}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={dismissing}
            className="mt-3 rounded-full bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-gray-700 transition disabled:opacity-50"
          >
            {dismissing ? t('bookingCard.markingSeen') : t('bookingCard.markSeen')}
          </button>
        )}
      </div>
    </div>

    {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}
