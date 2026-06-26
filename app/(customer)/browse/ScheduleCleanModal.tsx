'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BookingRequestForm } from '@/app/(customer)/cleaners/[id]/BookingRequestForm'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

// "Schedule a clean" modal opened from a browse CleanerCard. It reuses the same
// BookingRequestForm as the cleaner profile page, fed with the per-date slots the
// card already carries (turned into the form's dateAvailability shape) plus the
// matched date + searched location as presets — so the customer can book without
// leaving the search results.
export function ScheduleCleanModal({
  cleaner,
  date,
  location,
  duration,
  onClose,
}: {
  cleaner: CleanerResult
  date?: string
  location?: string
  duration?: number
  onClose: () => void
}) {
  const { t } = useLanguage()

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const dateAvailability = (cleaner.availability ?? []).map(s => ({
    date: date ?? '',
    start_time: s.start,
    end_time: s.end,
  }))

  // Portal to body so the card's hover transform can't become the containing
  // block for this fixed overlay (same pattern as CleanDetailModal).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {t('cleanerProfile.book').replace('{name}', cleaner.full_name)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('bookingRequestForm.cancel')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <BookingRequestForm
          cleaner={cleaner}
          dateAvailability={dateAvailability}
          presetDate={date}
          presetAddress={location}
          presetDuration={duration}
          defaultOpen
          onCancel={onClose}
        />
      </div>
    </div>,
    document.body
  )
}
