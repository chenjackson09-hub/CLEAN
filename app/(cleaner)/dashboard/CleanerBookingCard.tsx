import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const STATUS_ACCENT: Record<BookingStatus, string> = {
  pending: 'border-t-yellow-400',
  accepted: 'border-t-green-400',
  declined: 'border-t-red-400',
  completed: 'border-t-blue-400',
  cancelled: 'border-t-gray-300',
}

const SERVICE_BADGE: Record<BookingResult['service_type'], string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Props = {
  booking: BookingResult
  onUpdateStatus: (id: string, status: 'accepted' | 'declined') => void
}

export function CleanerBookingCard({ booking, onUpdateStatus }: Props) {
  const { t } = useLanguage()
  const initial = (booking.customer_name ?? '?').charAt(0).toUpperCase()

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-t-4 ${STATUS_ACCENT[booking.status]} hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <div>
            <p className="font-bold text-gray-900">{booking.customer_name}</p>
            <p className="text-sm text-gray-500">
              {formatDate(booking.scheduled_date)} · {booking.scheduled_start} · {booking.duration_hours} {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap ${STATUS_BADGE[booking.status]}`}>
          {t(`bookingCard.status.${booking.status}`)}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3">📍 {booking.address}</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[booking.service_type]}`}>
          {t(`common.${booking.service_type}`)}
        </span>
      </div>

      {booking.notes && (
        <p className="text-sm text-gray-500 italic mb-3">&quot;{booking.notes}&quot;</p>
      )}

      {booking.status === 'pending' && (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onUpdateStatus(booking.id, 'declined')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('dashboard.deny')}
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(booking.id, 'accepted')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('dashboard.accept')}
          </button>
        </div>
      )}

      {booking.status === 'accepted' && booking.customer_phone && booking.customer_email && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingCard.contact.title')}</p>
          <p>{t('bookingCard.contact.phone')}: {booking.customer_phone}</p>
          <p>{t('bookingCard.contact.email')}: {booking.customer_email}</p>
        </div>
      )}
    </div>
  )
}
