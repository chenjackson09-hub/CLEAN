'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { CleanerResult } from '@/lib/types/cleaner'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StarRatingDisplay } from '@/components/StarRating'
import { ScheduleCleanModal } from './ScheduleCleanModal'

// "Sarah Cohen" → "Sarah C." — shorten the surname to its first initial for privacy.
function shortenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return fullName
  const last = parts[parts.length - 1]
  return `${parts.slice(0, -1).join(' ')} ${last.charAt(0).toUpperCase()}.`
}

export function CleanerCard({ cleaner, date, location, duration, availFrom, availTo }: { cleaner: CleanerResult; date?: string; location?: string; duration?: number; availFrom?: string; availTo?: string }) {
  const { t } = useLanguage()
  const [scheduling, setScheduling] = useState(false)
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const displayName = shortenName(cleaner.full_name)
  // Available time slots for the date this card is shown under; each renders as
  // its own badge, e.g. "08:00–12:00".
  const availability = cleaner.availability ?? []
  // Carry the date this cleaner was matched under and the searched location into
  // the profile/booking flow so the customer doesn't re-enter either.
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (location) params.set('location', location)
  if (duration) params.set('duration', String(duration))
  if (availFrom) params.set('from', availFrom)
  if (availTo) params.set('to', availTo)
  const qs = params.toString()
  const href = qs ? `/cleaners/${cleaner.id}?${qs}` : `/cleaners/${cleaner.id}`

  // Schedule (opens the booking modal here) + View profile. Rendered in two
  // spots: under the price on desktop, and as a full-width row at the bottom of
  // the card on mobile — flex-1 splits the width evenly on phones, lg:flex-none
  // restores their natural size on desktop.
  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => setScheduling(true)}
        className="flex-1 lg:flex-none block text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap"
      >
        {t('cleanerCard.schedule')}
      </button>
      <Link
        href={href}
        className="flex-1 lg:flex-none block text-center bg-[#3D8B5E] text-white hover:bg-[#31704C] px-4 py-1.5 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap"
      >
        {t('cleanerCard.viewProfile')}
      </Link>
    </>
  )

  return (
    <div className="bg-white flex flex-col gap-4">
      {/* Top section — avatar, info and price share one row at all sizes */}
      <div className="flex gap-4">
      {/* Left column — profile picture */}
      <div className="shrink-0">
        {cleaner.avatar_url ? (
          <img src={cleaner.avatar_url} alt={cleaner.full_name} className="w-12 h-12 lg:w-20 lg:h-20 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-2xl">
            {initial}
          </div>
        )}
      </div>

      {/* Middle column — cleaner info */}
      <div className="flex-1 min-w-0">
        <div className="mb-3 min-w-0">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <p className="font-bold text-gray-900 truncate">{displayName}</p>
            {availability.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 flex-1">
                {availability.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-xl bg-blue-50 text-blue-700 text-sm font-medium px-2 py-0.5 whitespace-nowrap"
                  >
                    {s.start} – {s.end}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {cleaner.distance_km > 0 && <>{t('common.kmAway', { km: cleaner.distance_km.toFixed(1) })} · </>}
            {t('common.yearsExp', { years: cleaner.years_experience })}
          </p>
          {cleaner.rating_avg != null && (cleaner.rating_count ?? 0) > 0 && (
            <StarRatingDisplay value={cleaner.rating_avg} count={cleaner.rating_count} size="sm" className="mt-1" />
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {cleaner.area && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {cleaner.area}
            </span>
          )}
        </div>
      </div>

      {/* Right column (desktop only) — centered price over the buttons */}
      <div className="hidden lg:flex flex-col items-center justify-center gap-2 shrink-0">
        <span className="font-bold text-xl text-gray-900 whitespace-nowrap">₪{cleaner.hourly_rate}{t('common.perHour')}</span>
        <div className="flex items-center gap-2">{actionButtons}</div>
      </div>
      </div>

      {/* Mobile — buttons in their own bottom row; the price sits on the right,
          directly above the View Profile button with only a small gap */}
      <div className="flex items-end gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setScheduling(true)}
          className="flex-1 block text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {t('cleanerCard.schedule')}
        </button>
        <div className="flex-1 flex flex-col items-end gap-1">
          <span className="font-bold text-xl text-gray-900 whitespace-nowrap pe-2">₪{cleaner.hourly_rate}{t('common.perHour')}</span>
          <Link
            href={href}
            className="w-full block text-center bg-[#3D8B5E] text-white hover:bg-[#31704C] px-4 py-1.5 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap"
          >
            {t('cleanerCard.viewProfile')}
          </Link>
        </div>
      </div>

      {scheduling && (
        <ScheduleCleanModal
          cleaner={cleaner}
          date={date}
          location={location}
          duration={duration}
          availFrom={availFrom}
          availTo={availTo}
          onClose={() => setScheduling(false)}
        />
      )}
    </div>
  )
}
