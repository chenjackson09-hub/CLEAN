'use client'
import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cancelBooking, acknowledgeBookingModified, rateCleaner } from '../actions'
import { AvailabilityNotice } from './AvailabilityNotice'
import { StarRatingInput } from '@/components/StarRating'
import BookingRequestSummary from '@/components/BookingRequestSummary'
import { buildBookingSummaryData } from '@/lib/bookingSummary'
import CancelCleaningSheet from '@/components/CancelCleaningSheet'
import { reasonLabel } from '@/lib/cancellation'
import type { BookingResult } from '@/lib/types/booking'

export function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: BookingResult
  onClose: () => void
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Locally hide the "modified" banner the moment the customer acknowledges it,
  // before the server refresh removes the card's ring.
  const [seen, setSeen] = useState(false)
  const [seeing, startSeeing] = useTransition()

  const summaryData = buildBookingSummaryData(booking, booking.home_info, booking.hourly_rate)

  // Display name as "First L." — first name plus the last name's initial (same
  // as BookingCard).
  const nameParts = booking.cleaner_name.trim().split(/\s+/)
  const displayName = nameParts.length > 1
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}.`
    : booking.cleaner_name

  // Only active bookings can be cancelled — a pending request or a confirmed
  // (accepted) clean. Declined / completed / already-cancelled are terminal.
  const cancellable = booking.status === 'pending' || booking.status === 'accepted'
  // After the cleaner cancels a confirmed clean the host still needs it done:
  // offer to reopen the same request, while the day hasn't passed.
  const canRebook =
    booking.status === 'cancelled' &&
    booking.cancelled_by === 'cleaner' &&
    booking.cancelled_from_status === 'accepted' &&
    booking.scheduled_date >= new Date().toLocaleDateString('en-CA')

  // Surface that the cleaner edited this booking after the customer requested it.
  const modified = !!booking.cleaner_modified && cancellable && !seen

  // Rating — only for completed cleans. Seed from any score the customer already
  // gave; persist on each star click via the rateCleaner action.
  const [rating, setRating] = useState<number | null>(booking.my_rating ?? null)
  const [ratingErr, setRatingErr] = useState(false)
  const [ratingPending, startRating] = useTransition()

  function handleRate(score: number) {
    setRatingErr(false)
    const prev = rating
    setRating(score)
    startRating(async () => {
      const res = await rateCleaner(booking.id, score)
      if (res?.error) {
        setRating(prev)
        setRatingErr(true)
        return
      }
      router.refresh()
    })
  }

  function handleSeen() {
    startSeeing(async () => {
      await acknowledgeBookingModified(booking.id)
      setSeen(true)
      router.refresh()
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const res = await cancelBooking(booking.id)
      if (res?.error) {
        setError(t('bookingCard.detail.cancelError'))
        return
      }
      // revalidatePath in the action re-fetches the Server Component list; just
      // close the modal so the now-cancelled card reflects its new status.
      onClose()
    })
  }

  // Render at document.body via a portal so the card's hover transform can't
  // become the containing block for this `fixed` overlay (same as CleanDetailModal).
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
            {booking.cleaner_id && (
              <div className="flex flex-wrap gap-2 mt-1">
                <Link
                  href={`/cleaners/${booking.cleaner_id}`}
                  className="inline-flex items-center gap-1 p-1 px-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('cleanerCard.viewProfile')}
                </Link>
                {(booking.status === 'accepted' || booking.status === 'completed') && (
                  <Link
                    href={`/chat/${booking.cleaner_id}`}
                    className="inline-flex items-center gap-1 p-1 px-2 rounded-full text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    {t('cleanerCard.message')}
                  </Link>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-gray-400 hover:text-gray-700 font-bold leading-none ms-4"
            aria-label={t('bookingCard.detail.done')}
          >
            ✕
          </button>
        </div>

        {/* Details */}
        <div className="px-8 py-6 space-y-5">
          {booking.status === 'cancelled' && booking.status_reason === 'cleaner_unavailable' && (
            <p className="text-sm font-semibold text-red-600">{t('bookingCard.reasonCleanerUnavailable')}</p>
          )}
          {booking.status === 'cancelled' && booking.cancelled_by && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 space-y-1.5">
              <p className="text-sm font-semibold text-gray-800">
                {booking.cancelled_by === 'host'
                  ? t('bookingCard.cancelledByYou')
                  : t('bookingCard.cancelledByCleaner').replace('{name}', displayName)}
              </p>
              {reasonLabel(booking.cancellation_reason, booking.cancelled_by, lang) && (
                <p className="text-sm text-gray-600">
                  {t('bookingCard.cancelledReason')}: {reasonLabel(booking.cancellation_reason, booking.cancelled_by, lang)}
                </p>
              )}
              {booking.cancellation_message && (
                <p className="text-sm italic text-gray-600 whitespace-pre-wrap break-words">“{booking.cancellation_message}”</p>
              )}
              {canRebook && (
                <div className="pt-2">
                  <p className="text-sm text-gray-600 mb-2">{t('bookingCard.findAnotherHint')}</p>
                  <Link
                    href={`/browse?rebook=${booking.id}`}
                    className="inline-block rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    {t('bookingCard.findAnother')}
                  </Link>
                </div>
              )}
            </div>
          )}
          {booking.status === 'pending' && booking.availability_notice && (
            <AvailabilityNotice bookingId={booking.id} name={displayName} times={booking.availability_notice} />
          )}
          {modified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
              <p className="text-sm font-semibold text-amber-800">{t('bookingCard.modified')}</p>
              <p className="text-sm text-amber-700 mt-0.5">{t('bookingCard.detail.modifiedNote')}</p>
              <button
                onClick={handleSeen}
                disabled={seeing}
                className="mt-3 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                {seeing ? t('bookingCard.detail.modifiedSeeing') : t('bookingCard.detail.modifiedSeen')}
              </button>
            </div>
          )}

          <BookingRequestSummary data={summaryData} cleanerName={booking.cleaner_name} lang={lang} />
          {booking.duration_flexible && (
            <p className="text-sm font-semibold text-red-600">{t('bookingRequestForm.durationNotSure')}</p>
          )}

          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t('bookingCard.detail.address')}</p>
            <p className="text-lg font-semibold text-gray-900">{booking.address}</p>
          </div>


          {booking.status === 'completed' && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-2">{t('bookingCard.rating.title')}</p>
              <div className="flex items-center gap-3">
                <StarRatingInput value={rating} onChange={handleRate} disabled={ratingPending} />
                {ratingPending && <span className="text-sm text-gray-400">{t('bookingCard.rating.saving')}</span>}
                {!ratingPending && rating != null && !ratingErr && (
                  <span className="text-sm text-gray-500">{t('bookingCard.rating.saved')}: {rating}/5</span>
                )}
              </div>
              {ratingErr && <p className="text-sm text-red-600 mt-1">{t('bookingCard.rating.error')}</p>}
            </div>
          )}
        </div>

        {cancellable && (
          <div className="px-8 pb-8 space-y-3">
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            {confirming ? (
              <>
                <p className="text-sm text-gray-600 text-center">{t('bookingCard.detail.cancelConfirm')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-4 text-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
                  >
                    {t('bookingCard.detail.cancelNo')}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={pending}
                    className="flex-1 bg-red-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {pending ? t('bookingCard.detail.cancelling') : t('bookingCard.detail.cancelYes')}
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => (booking.status === 'accepted' ? setSheetOpen(true) : setConfirming(true))}
                className="w-full bg-red-600 text-white rounded-2xl py-4 text-lg font-semibold hover:bg-red-700 transition-colors"
              >
                {booking.status === 'accepted' ? t('bookingCard.detail.cancelCleaning') : t('bookingCard.detail.cancel')}
              </button>
            )}
          </div>
        )}
        {sheetOpen && (
          <CancelCleaningSheet
            lang={lang}
            role="host"
            date={booking.scheduled_date}
            start={booking.scheduled_start}
            durationHours={booking.duration_hours}
            hourlyRate={booking.hourly_rate}
            otherName={displayName}
            onConfirm={(input) => cancelBooking(booking.id, input)}
            onClose={() => setSheetOpen(false)}
            onDone={() => {
              setSheetOpen(false)
              onClose()
              router.refresh()
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
