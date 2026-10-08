'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingDetailModal } from './BookingDetailModal'
import { AvailabilityNotice } from './AvailabilityNotice'
import { StarRatingDisplay } from '@/components/StarRating'
import { shortDateLabel } from '@/lib/dateLabels'
import { daysBetween } from '@/lib/dateMath'
import { countdownLabel } from '@/lib/countdown'
import { shortName } from '@/lib/chatFormat'
import { reasonLabel } from '@/lib/cancellation'
import { isCancelledClean } from '@/lib/bookingBuckets'
import type { BookingResult } from '@/lib/types/booking'

// One booking, one calm row — the same shape wherever a host sees a booking:
// the cleaner's photo and name, "Thu 15 Oct · 09:00 · about 3h", and a single
// status on the right. A thin bar on the left carries the status colour. The
// street address is deliberately absent (it's the host's own place); it, and
// everything else, is in the detail that opens on tap.
export function BookingRow({ booking, todayStr }: { booking: BookingResult; todayStr: string }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const l = lang === 'he' ? 'he' : 'en'

  const name = shortName(booking.cleaner_name)
  const cancelledClean = isCancelledClean(booking)
  const stale = booking.status === 'accepted' && booking.scheduled_date < todayStr // confirmed, day passed
  const days = daysBetween(todayStr, booking.scheduled_date)

  const bar =
    booking.status === 'pending' ? 'border-orange-300'
    : booking.status === 'accepted' && !stale ? 'border-green-500'
    : 'border-gray-200'
  const quiet = booking.status !== 'pending' && !(booking.status === 'accepted' && !stale)

  // The single status on the right.
  let status: React.ReactNode = null
  if (booking.status === 'accepted' && !stale) {
    status = <span className="text-xs font-semibold text-green-700">{countdownLabel(days, l)}</span>
  } else if (booking.status === 'pending') {
    status = <span className="text-xs font-semibold text-orange-600">{t('bookings.awaitingReply')}</span>
  } else if (booking.status === 'completed') {
    status = booking.my_rating
      ? <StarRatingDisplay value={booking.my_rating} showNumber={false} size="sm" />
      : <span className="text-xs font-semibold text-blue-600">{t('bookings.rate')}</span>
  } else if (cancelledClean) {
    status = <span className="text-xs font-semibold text-gray-500">{t('bookings.tagCancelled')}</span>
  } else if (stale) {
    status = <span className="text-xs font-semibold text-gray-500">{t('bookings.tagPast')}</span>
  }

  // A second line only when there is something worth saying about the state.
  const reason = cancelledClean ? reasonLabel(booking.cancellation_reason, booking.cancelled_by, l) : ''
  const note = cancelledClean
    ? booking.cancelled_by === 'host'
      ? t('bookingCard.cancelledByYou')
      : t('bookingCard.cancelledByCleaner').replace('{name}', name)
    : null

  const canRebook =
    cancelledClean && booking.cancelled_by === 'cleaner' && booking.scheduled_date >= todayStr

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-start flex items-center gap-3 rounded-2xl bg-white border-s-4 ${bar} shadow-sm p-3 hover:shadow-md transition-shadow ${quiet ? 'opacity-80' : ''}`}
      >
        {booking.cleaner_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={booking.cleaner_avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">
            {booking.cleaner_name.trim().charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-sm text-gray-500 truncate">
            {shortDateLabel(booking.scheduled_date, l)} · {booking.scheduled_start.slice(0, 5)} · {t('bookings.aboutHours', { n: String(booking.duration_hours) })}
          </p>
          {note && (
            <p className="text-xs text-gray-500 truncate">
              {note}
              {reason && <> · {reason}</>}
            </p>
          )}
        </div>
        <div className="shrink-0 text-end">{status}</div>
      </button>

      {booking.status === 'pending' && booking.availability_notice && (
        <AvailabilityNotice bookingId={booking.id} name={name} times={booking.availability_notice} />
      )}
      {canRebook && (
        <Link
          href={`/browse?rebook=${booking.id}`}
          className="ms-3 inline-block rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
        >
          {t('bookingCard.findAnother')}
        </Link>
      )}

      {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </div>
  )
}
