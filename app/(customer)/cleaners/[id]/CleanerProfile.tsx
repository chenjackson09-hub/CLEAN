'use client'
import { useRouter } from 'next/navigation'
import { BookingRequestForm } from './BookingRequestForm'
import { AvatarLightbox } from './AvatarLightbox'
import { GalleryLightbox } from './GalleryLightbox'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StarRatingDisplay } from '@/components/StarRating'
import type { CleanerResult } from '@/lib/types/cleaner'
import type { ReactNode } from 'react'

type WeeklySlot = { day_of_week: number; start_time: string; end_time: string }
type DateSlot = { date: string; start_time: string; end_time: string }

function ageFromBirthdate(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const mDiff = today.getMonth() - birth.getMonth()
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function CleanerProfile({ cleaner, gallery = [], weeklyAvailability = [], dateAvailability = [], presetDate, presetAddress, presetDuration, presetAvailFrom, presetAvailTo, banner, bookingDisabled = false, completionPct, missingSummary, editHref }: {
  cleaner: CleanerResult
  gallery?: string[]
  weeklyAvailability?: WeeklySlot[]
  dateAvailability?: DateSlot[]
  presetDate?: string
  presetAddress?: string
  presetDuration?: number
  presetAvailFrom?: string
  presetAvailTo?: string
  // Preview overrides — the cleaner's own preview reuses this exact shell, but
  // swaps a couple pieces: an edit banner instead of the back button and a
  // non-interactive booking form. The customer page passes neither, so its
  // behavior is unchanged. (Avatar + gallery zoom is now the default for both.)
  banner?: ReactNode
  bookingDisabled?: boolean
  // Profile-completeness bar + edit pencil, mirroring the cleaner's own
  // editable profile view (ProfileView.tsx). Only the preview page passes
  // these (computed server-side from the cleaner's own data) — the real
  // customer-facing page never does, so customers never see "still missing"
  // or an edit affordance on someone else's profile.
  completionPct?: number
  missingSummary?: string
  editHref?: string
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const age = ageFromBirthdate(cleaner.birthdate)

  // Availability badges shown next to the "Book {name}" header — the cleaner's
  // slots for the date the customer came from (presetDate), mirroring the slot
  // badges on the browse CleanerCard. Union of the recurring weekly slots for
  // that weekday and any specific-date slots, de-duped and sorted by start.
  const bookingDaySlots = presetDate
    ? [
        ...weeklyAvailability.filter(s => s.day_of_week === new Date(presetDate + 'T12:00:00').getDay()),
        ...dateAvailability.filter(s => s.date === presetDate),
      ]
    : []
  const availabilityBadges = Array.from(
    new Map(
      bookingDaySlots.map(s => [
        `${s.start_time}-${s.end_time}`,
        { start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) },
      ])
    ).values()
  ).sort((a, b) => a.start.localeCompare(b.start))

  // A booking can only be requested when the customer arrived from a dated
  // browse search — the "View profile" link carries the searched `date` (and the
  // duration/availability window the booking form needs). Landing on the profile
  // without that context (a direct/shared link) shows a prompt to search rather
  // than the form. The cleaner's own preview (`bookingDisabled`) still renders
  // the form so they see exactly what a browsing customer would.
  const showBooking = bookingDisabled || presetDate != null

  return (
    <div className="-mx-3 sm:-mx-8 -mt-2 min-h-screen">
      {/* Back button — uses browser history so filters are preserved. The
          preview passes a `banner` instead (its own edit bar). */}
      {banner ?? (
        <div className="px-6 lg:px-10 pt-5">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('cleanerProfile.backToSearch')}
          </button>
        </div>
      )}

      <div className="px-4 lg:px-10 py-6 space-y-4">

        {/* Main card: avatar/name/price header, bio, stats, services, looking for —
            mirrors the layout of the cleaner's own editable profile (ProfileView.tsx). */}
        <div className="bg-white shadow-sm rounded-2xl p-6">
          {completionPct != null && completionPct < 100 && (
            <button type="button" onClick={() => editHref && router.push(editHref)} className="w-full text-start mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-600">{completionPct}%</span>
              </div>
              {missingSummary && <p className="text-sm text-gray-400 mt-1.5">{missingSummary}</p>}
            </button>
          )}

          {editHref && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => router.push(editHref)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                ✏️ {t('cleanerProfile.edit')}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 min-w-0">
              {cleaner.avatar_url ? (
                <AvatarLightbox src={cleaner.avatar_url} name={cleaner.full_name} size="md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {cleaner.full_name}
                  {age !== null ? `, ${age}` : ''}
                </h1>
                {cleaner.rating_avg != null && (cleaner.rating_count ?? 0) > 0 && (
                  <div className="mt-1">
                    <StarRatingDisplay value={cleaner.rating_avg} count={cleaner.rating_count} />
                  </div>
                )}
                {cleaner.area && <p className="text-sm text-gray-500 mt-1 truncate">{cleaner.area}</p>}
              </div>
            </div>
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-2.5 text-center shrink-0">
              <p className="text-xl font-semibold leading-none">₪{cleaner.hourly_rate}</p>
              <p className="text-[10px] font-medium mt-1 leading-none">{t('common.perHour')}</p>
            </div>
          </div>

          {cleaner.bio && <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{cleaner.bio}</p>}

          <div className="grid grid-cols-2 gap-3 mb-4">
            {cleaner.years_experience != null && cleaner.years_experience > 0 && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400">{t('cleanerProfile.experience')}</p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">
                  {cleaner.years_experience} {cleaner.years_experience !== 1 ? t('cleanerProfile.years') : t('cleanerProfile.year')}
                </p>
              </div>
            )}
            {cleaner.distance_km > 0 && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400">{t('cleanerProfile.distance')}</p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">{cleaner.distance_km.toFixed(1)} {t('cleanerProfile.km')}</p>
              </div>
            )}
            {cleaner.min_hours != null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400">{t('cleanerProfile.minJob')}</p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">{cleaner.min_hours} {t('filterBar.hoursShort')}</p>
              </div>
            )}
            {cleaner.max_hours != null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400">{t('cleanerProfile.maxJob')}</p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">{cleaner.max_hours} {t('filterBar.hoursShort')}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-400">{t('cleanerProfile.cleansDone')}</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">{cleaner.cleans_completed ?? 0}</p>
            </div>
            {cleaner.has_car && cleaner.gas_return_enabled && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 col-span-2">
                <p className="text-xs text-gray-400">{t('cleanerProfile.gasReturn')}</p>
                <p className="text-base font-semibold text-gray-900 mt-0.5">
                  ₪{Number(cleaner.gas_return_rate ?? 1).toFixed(2)} <b>{t('cleanerProfile.perKm')}</b>
                </p>
              </div>
            )}
          </div>

          {cleaner.languages.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1.5">{t('cleanerProfile.languages')}</p>
              <div className="flex flex-wrap gap-1.5">
                {cleaner.languages.map(lang => (
                  <span key={lang} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-2.5 py-0.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                    </svg>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Services — the richer cleaning_categories list (migration 0018) takes
              priority; falls back to the older residential/commercial service_types
              for cleaners who signed up before that redesign and never set it. */}
          {cleaner.cleaning_categories && cleaner.cleaning_categories.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-1.5">{t('cleanerProfile.serviceTypes')}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {cleaner.cleaning_categories.map(cat => (
                  <span key={cat} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                    {cat === 'Other' ? cleaner.cleaning_category_other || cat : cat}
                  </span>
                ))}
              </div>
            </>
          ) : cleaner.service_types.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-1.5">{t('cleanerProfile.serviceTypes')}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {cleaner.service_types.map(type => (
                  <span key={type} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                    {t(`common.${type}`)}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Looking for — the cleaner's match preferences (recurring/occasional/other), a multi-select. */}
          {cleaner.match_preferences && cleaner.match_preferences.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-1.5">{t('cleanerProfile.lookingFor')}</p>
              <div className="flex flex-wrap gap-1.5">
                {cleaner.match_preferences.map(pref => (
                  <span key={pref} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                    {pref === 'other'
                      ? cleaner.match_preference_other || t('cleanerProfile.matchOther')
                      : pref === 'recurring'
                        ? t('cleanerProfile.matchRecurring')
                        : t('cleanerProfile.matchOccasional')}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Booking form — only when the customer arrived from a
            dated browse search (or the cleaner's own preview). Otherwise a
            prompt to search, since booking needs that context. */}
        {showBooking ? (
          <div id="book" className="bg-white shadow-sm rounded-2xl p-6 scroll-mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {t('cleanerProfile.book').replace('{name}', cleaner.full_name)}
              </h2>
              {availabilityBadges.map((s, i) => (
                <span
                  key={i}
                  className="rounded-xl bg-blue-50 text-blue-700 text-sm font-medium px-2 py-0.5 whitespace-nowrap"
                >
                  {s.start} – {s.end}
                </span>
              ))}
            </div>
            <BookingRequestForm cleaner={cleaner} weeklyAvailability={weeklyAvailability} dateAvailability={dateAvailability} presetDate={presetDate} presetAddress={presetAddress} presetDuration={presetDuration} presetAvailFrom={presetAvailFrom} presetAvailTo={presetAvailTo} disabled={bookingDisabled} />
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-2xl p-6 text-center">
            <p className="text-base text-gray-700 mb-3">{t('cleanerProfile.bookPrompt')}</p>
            <button
              type="button"
              onClick={() => router.push('/browse')}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-2xl text-sm font-semibold transition-colors"
            >
              {t('cleanerProfile.bookCta')}
            </button>
          </div>
        )}

        {/* Gallery — tap a thumbnail to zoom. Renders nothing when empty. */}
        <GalleryLightbox photos={gallery} name={cleaner.full_name} />

      </div>
    </div>
  )
}
