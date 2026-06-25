'use client'
import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { cancelBooking } from '../actions'
import type { BookingResult } from '@/lib/types/booking'

export function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: BookingResult
  onClose: () => void
}) {
  const { t, lang } = useLanguage()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [y, m, d] = booking.scheduled_date.split('-').map(Number)
  const month = new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' })

  const start = new Date(`1970-01-01T${booking.scheduled_start}`)
  const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000)
  const endStr = end.toTimeString().slice(0, 5)

  // Only active bookings can be cancelled — a pending request or a confirmed
  // (accepted) clean. Declined / completed / already-cancelled are terminal.
  const cancellable = booking.status === 'pending' || booking.status === 'accepted'

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
          <h2 className="text-2xl font-bold text-gray-900">{booking.cleaner_name}</h2>
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
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t('bookingCard.detail.date')}</p>
              <p className="text-lg font-semibold text-gray-900">{d} {month}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t('bookingCard.detail.time')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {booking.scheduled_start.slice(0, 5)} - {endStr}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t('bookingCard.detail.duration')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {booking.duration_hours} {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t('bookingCard.detail.address')}</p>
              <p className="text-lg font-semibold text-gray-900">{booking.address}</p>
            </div>
          </div>

          {booking.notes && (
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">{t('bookingCard.detail.notes')}</p>
              <p className="text-lg text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{booking.notes}</p>
            </div>
          )}

          {booking.status === 'accepted' && booking.cleaner_phone && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4">
              <p className="text-sm text-green-600 uppercase tracking-wide mb-1">{t('bookingCard.contact.phone')}</p>
              <a
                href={`tel:${booking.cleaner_phone}`}
                className="text-lg font-semibold text-green-800 hover:underline"
              >
                {booking.cleaner_phone}
              </a>
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
                onClick={() => setConfirming(true)}
                className="w-full bg-red-600 text-white rounded-2xl py-4 text-lg font-semibold hover:bg-red-700 transition-colors"
              >
                {t('bookingCard.detail.cancel')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
