'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { acknowledgeAvailabilityNotice, cancelBooking } from '../actions'

// Shown on a still-pending request when the cleaner changed their available
// times so the request no longer fits (migration 0033). The host answers: v =
// still relevant (clears the notice, the cleaner can adjust/accept), x =
// cancel the request (the normal cancel flow, so the cleaner sees it in
// their Updates).
export function AvailabilityNotice({ bookingId, name, times }: { bookingId: string; name: string; times: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function answer(action: 'keep' | 'cancel') {
    setError(null)
    start(async () => {
      const res = action === 'keep' ? await acknowledgeAvailabilityNotice(bookingId) : await cancelBooking(bookingId)
      if (res && 'error' in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div
      className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-bold text-amber-900">
        {t('bookingCard.availabilityNotice', { name, times })}
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => answer('keep')}
          aria-label={t('bookingCard.noticeKeep')}
          title={t('bookingCard.noticeKeep')}
          className="w-10 h-10 rounded-full bg-green-600 text-white text-lg font-bold hover:bg-green-700 disabled:opacity-50"
        >
          ✓
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => answer('cancel')}
          aria-label={t('bookingCard.noticeCancel')}
          title={t('bookingCard.noticeCancel')}
          className="w-10 h-10 rounded-full bg-red-600 text-white text-lg font-bold hover:bg-red-700 disabled:opacity-50"
        >
          ✕
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
