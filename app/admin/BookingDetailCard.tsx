'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StatusPill } from './adminTable'
import BookingRequestSummary from '@/components/BookingRequestSummary'
import { buildBookingSummaryData } from '@/lib/bookingSummary'
import type { BookingResult } from '@/lib/types/booking'

// The "View booking request" popup — full detail for one booking, reached
// from the document icon in the Booking Requests/Matches row. Reuses the
// same BookingResult already fetched for the row, no extra query. Renders
// the same shared BookingRequestSummary every other role sees for this
// booking (home/pets/cleaning type/extras/price), not just status/date/
// address, so an admin auditing a request sees the full agreement.
export function BookingDetailCard({ booking, onClose }: { booking: BookingResult; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const summaryData = buildBookingSummaryData(booking, booking.home_info, booking.hourly_rate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{t('admin.bookings.detailTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('admin.shared.close')}
            className="text-xl text-gray-400 hover:text-gray-700 font-bold leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">{t('admin.shared.status')}</span>
            {booking.expired ? (
              <StatusPill status="expired" label={t('admin.bookings.expiredLabel')} />
            ) : (
              <StatusPill status={booking.status} label={t(`bookingCard.status.${booking.status}`)} />
            )}
          </div>

          {booking.expired && (
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              {t('admin.bookings.expiredNote')}
            </p>
          )}

          <BookingRequestSummary data={summaryData} cleanerName={booking.cleaner_name} lang={lang} />
          {booking.duration_flexible && (
            <p className="text-sm font-semibold text-amber-600">{t('admin.bookings.notSure')}</p>
          )}

          <div className="flex items-start justify-between gap-3">
            <span className="text-gray-400 shrink-0">{t('admin.shared.location')}</span>
            <span className="text-gray-700 text-end">{booking.address}</span>
          </div>

          {booking.cleaner_modified && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {t('admin.bookings.cleanerModifiedNote')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
