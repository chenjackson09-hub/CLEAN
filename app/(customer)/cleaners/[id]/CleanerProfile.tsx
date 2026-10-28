'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookingRequestForm } from './BookingRequestForm'
import { AvatarLightbox } from './AvatarLightbox'
import { GalleryLightbox } from './GalleryLightbox'
import { GALLERY_ENABLED } from '@/lib/features'
import { CindyVerifiedBadge } from '@/components/CindyVerifiedBadge'
import { lookingForLabels } from '@/lib/matchPreferences'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

type WeeklySlot = { day_of_week: number; start_time: string; end_time: string }
type DateSlot = { date: string; start_time: string; end_time: string }

// Small line icons for the "Preferences & details" rows and stat tiles.
const ICON = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
function IconSprout({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><path d="M12 21v-8M12 13c0-3 2-5 6-5 0 3-2 5-6 5zM12 15c0-2.5-1.8-4.5-5-4.5 0 2.5 1.8 4.5 5 4.5z" /></svg>
}
function IconCar({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><path d="M5 16V11l1.6-4.2A2 2 0 018.5 5.5h7a2 2 0 011.9 1.3L19 11v5M3 16h18v2.5a.5.5 0 01-.5.5H19a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H3.5a.5.5 0 01-.5-.5V16zM7.5 13h.01M16.5 13h.01" /></svg>
}
function IconGlobe({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>
}
function IconBriefcase({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18" /></svg>
}
function IconPin({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
}
function IconCheckCircle({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" /></svg>
}
function IconClock({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} {...ICON}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
}

function ageFromBirthdate(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const mDiff = today.getMonth() - birth.getMonth()
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function CleanerProfile({ cleaner, gallery = [], weeklyAvailability = [], dateAvailability = [], presetDate, presetAddress, presetDuration, presetAvailFrom, presetAvailTo, cleanGroupId, bookingDisabled = false, completionPct, missingSummary, editHref }: {
  cleaner: CleanerResult
  gallery?: string[]
  weeklyAvailability?: WeeklySlot[]
  dateAvailability?: DateSlot[]
  presetDate?: string
  presetAddress?: string
  presetDuration?: number
  presetAvailFrom?: string
  presetAvailTo?: string
  // "Add a clean" (migration 0031) — carried through from the browse "View
  // Profile" link's query params when reached mid-flow. See BookingRequestForm.
  cleanGroupId?: string
  // Preview override — the cleaner's own preview reuses this exact shell, but
  // shows no booking section at all (a cleaner booking themselves makes no
  // sense — see showBooking below). The customer page never sets this, so its
  // behavior is unchanged. (Avatar + gallery zoom is the default for both.)
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
  const { t, lang } = useLanguage()
  const router = useRouter()
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const age = ageFromBirthdate(cleaner.birthdate)
  const [bioOpen, setBioOpen] = useState(false)

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
  // than the form. The cleaner's own preview (`bookingDisabled`) skips the whole
  // booking section — there's no context in which a cleaner should book themselves.
  const showBooking = !bookingDisabled && presetDate != null

  // "Read more" only appears when the bio is long enough to be cut off.
  const longBio = (cleaner.bio ?? '').length > 150 || (cleaner.bio ?? '').split('\n').length > 3

  // "3–6 h", "3+ h" (no upper limit), "up to 6 h" — or nothing when neither is set.
  const jobDuration =
    cleaner.min_hours != null && cleaner.max_hours != null
      ? `${cleaner.min_hours}–${cleaner.max_hours} ${t('filterBar.hoursShort')}`
      : cleaner.min_hours != null
        ? `${cleaner.min_hours}+ ${t('filterBar.hoursShort')}`
        : cleaner.max_hours != null
          ? `${t('cleanerProfile.upTo')} ${cleaner.max_hours} ${t('filterBar.hoursShort')}`
          : null

  const lookingFor = lookingForLabels(cleaner.match_preferences, cleaner.match_preference_other, {
    recurring: t('cleanerProfile.matchRecurring'),
    occasional: t('cleanerProfile.matchOccasional'),
    either: t('cleanerProfile.matchEither'),
    other: t('cleanerProfile.matchOther'),
  })

  // The rows of "Preferences & details" — only those the cleaner has filled in.
  const details: { key: string; icon: React.ReactNode; label: string; value: string }[] = []
  if (lookingFor.length > 0) details.push({ key: 'looking', icon: <IconSprout />, label: t('cleanerProfile.lookingFor'), value: lookingFor.join(', ') })
  if (cleaner.has_car && cleaner.gas_return_enabled) {
    details.push({
      key: 'travel', icon: <IconCar />, label: t('cleanerProfile.travel'),
      value: `₪${Number(cleaner.gas_return_rate ?? 1).toFixed(2).replace(/\.00$/, '')} / ${t('cleanerProfile.km')}`,
    })
  }
  // Experience and languages live in the "at a glance" block above, not in this list.
  const experience =
    cleaner.years_experience != null && cleaner.years_experience > 0
      ? `${cleaner.years_experience} ${cleaner.years_experience !== 1 ? t('cleanerProfile.years') : t('cleanerProfile.year')}`
      : null
  if (cleaner.distance_km > 0) {
    details.push({ key: 'dist', icon: <IconPin />, label: t('cleanerProfile.distance'), value: `${cleaner.distance_km.toFixed(1)} ${t('cleanerProfile.km')}` })
  }

  const services =
    cleaner.cleaning_categories && cleaner.cleaning_categories.length > 0
      ? cleaner.cleaning_categories.map(cat => (cat === 'Other' ? cleaner.cleaning_category_other || cat : cat))
      : cleaner.service_types.map(type => t(`common.${type}`))

  const rated = cleaner.rating_avg != null && (cleaner.rating_count ?? 0) > 0

  return (
    <div className="-mx-3 sm:-mx-8 -mt-2 min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-5 py-4 space-y-6">

        {/* Top bar: back, and (preview only) edit. */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/browse'))}
            aria-label={t('cleanerProfile.back')}
            className="w-10 h-10 -ms-2 flex items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 transition-colors rtl:rotate-180"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {editHref && (
            <button
              type="button"
              onClick={() => router.push(editHref)}
              aria-label={t('cleanerProfile.edit')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        {completionPct != null && completionPct < 100 && (
          <button type="button" onClick={() => editHref && router.push(editHref)} className="w-full text-start rounded-2xl bg-gray-50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-sm font-semibold text-gray-600">{completionPct}%</span>
            </div>
            {missingSummary && <p className="text-sm text-gray-500 mt-1.5">{missingSummary}</p>}
          </button>
        )}

        {/* Header: photo, name, area, rating — and the hourly rate. */}
        <div className="flex items-center gap-4">
          {cleaner.avatar_url ? (
            <AvatarLightbox src={cleaner.avatar_url} name={cleaner.full_name} size="xl" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {cleaner.full_name}
              {age !== null ? `, ${age}` : ''}
            </h1>
            {cleaner.area && (
              <p className="mt-1 flex items-center gap-1.5 text-gray-500">
                <IconPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{cleaner.area}</span>
              </p>
            )}
            {cleaner.cindy_verified && (
              <p className="mt-1.5"><CindyVerifiedBadge lang={lang === 'he' ? 'he' : 'en'} /></p>
            )}
            {rated && (
              <p className="mt-1 flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                  <path d="M9.05 2.93a1 1 0 011.9 0l1.29 3.96a1 1 0 00.95.69h4.16a1 1 0 01.59 1.81l-3.37 2.45a1 1 0 00-.36 1.12l1.29 3.96a1 1 0 01-1.54 1.12l-3.37-2.45a1 1 0 00-1.18 0l-3.37 2.45a1 1 0 01-1.54-1.12l1.29-3.96a1 1 0 00-.36-1.12L2.36 9.39a1 1 0 01.59-1.81h4.16a1 1 0 00.95-.69l1.29-3.96z" />
                </svg>
                <span className="text-lg font-bold text-gray-900">{Number(cleaner.rating_avg).toFixed(1)}</span>
                <span className="text-gray-500">
                  · {cleaner.rating_count === 1 ? t('common.cleanRated') : t('common.cleansRated', { n: String(cleaner.rating_count ?? 0) })}
                </span>
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-emerald-50 text-emerald-900 px-3 py-2.5 text-center shrink-0">
            <p className="text-2xl font-bold leading-none">₪{cleaner.hourly_rate}</p>
            <p className="text-xs mt-1">{t('common.perHour')}</p>
          </div>
        </div>

        {/* At a glance: one row of equal tiles (cleans, experience, job length), then languages. */}
        <div className="space-y-3">
          <div className={`grid gap-3 ${[true, experience, jobDuration].filter(Boolean).length === 3 ? 'grid-cols-3' : [true, experience, jobDuration].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="rounded-2xl bg-gray-50 px-2 py-4 text-center">
              <IconCheckCircle className="w-6 h-6 mx-auto text-emerald-700" />
              <p className="mt-2 text-xl font-bold text-gray-900">{cleaner.cleans_completed ?? 0}</p>
              <p className="text-sm text-gray-500">{t('cleanerProfile.completedCleans')}</p>
            </div>
            {experience && (
              <div className="rounded-2xl bg-gray-50 px-2 py-4 text-center">
                <IconBriefcase className="w-6 h-6 mx-auto text-gray-500" />
                <p className="mt-2 text-xl font-bold text-gray-900">{experience}</p>
                <p className="text-sm text-gray-500">{t('cleanerProfile.experience')}</p>
              </div>
            )}
            {jobDuration && (
              <div className="rounded-2xl bg-gray-50 px-2 py-4 text-center">
                <IconClock className="w-6 h-6 mx-auto text-gray-500" />
                <p className="mt-2 text-xl font-bold text-gray-900">{jobDuration}</p>
                <p className="text-sm text-gray-500">{t('cleanerProfile.jobDuration')}</p>
              </div>
            )}
          </div>
          {cleaner.languages.length > 0 && (
            <div className="rounded-2xl bg-gray-50 px-4 py-3 flex items-center gap-3">
              <IconGlobe className="w-5 h-5 text-gray-500 shrink-0" />
              <span className="text-sm text-gray-500 shrink-0">{t('cleanerProfile.languages')}</span>
              <span className="flex flex-wrap gap-1.5 ms-auto justify-end">
                {cleaner.languages.map(l => (
                  <span key={l} className="px-3 py-1 rounded-full bg-white text-gray-800 text-sm">{l}</span>
                ))}
              </span>
            </div>
          )}
        </div>

        {cleaner.bio && (
          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cleanerProfile.aboutMe')}</h2>
            <p className={`text-gray-700 leading-relaxed whitespace-pre-line ${longBio && !bioOpen ? 'line-clamp-4' : ''}`}>{cleaner.bio}</p>
            {longBio && (
              <button
                type="button"
                onClick={() => setBioOpen(o => !o)}
                aria-expanded={bioOpen}
                className="mt-2 text-sm font-semibold text-emerald-800 hover:underline"
              >
                {bioOpen ? t('cleanerProfile.readLess') : t('cleanerProfile.readMore')}
              </button>
            )}
          </section>
        )}

        {services.length > 0 && (
          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('cleanerProfile.cleaningServices')}</h2>
            <div className="flex flex-wrap gap-2">
              {services.map(label => (
                <span key={label} className="px-4 py-2 rounded-full bg-gray-100 text-gray-800">{label}</span>
              ))}
            </div>
          </section>
        )}

        {details.length > 0 && (
          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cleanerProfile.details')}</h2>
            <ul className="divide-y divide-gray-100">
              {details.map(d => (
                <li key={d.key} className="flex items-center gap-4 py-3">
                  <span className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">{d.icon}</span>
                  <span className="flex-1 text-gray-500">{d.label}</span>
                  <span className="text-end font-medium text-gray-900">{d.value}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Booking form — only when the customer arrived from a dated browse
            search. Otherwise a prompt to search, since booking needs that
            context. The cleaner's own preview shows neither — booking
            themselves makes no sense, so the whole section is skipped. */}
        {!bookingDisabled && (
          showBooking ? (
            <div id="book" className="bg-gray-50 rounded-2xl p-5 scroll-mt-4">
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
              <BookingRequestForm cleaner={cleaner} weeklyAvailability={weeklyAvailability} dateAvailability={dateAvailability} presetDate={presetDate} presetAddress={presetAddress} presetDuration={presetDuration} cleanGroupId={cleanGroupId} />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-5 text-center">
              <p className="text-base text-gray-700 mb-3">{t('cleanerProfile.bookPrompt')}</p>
              <button
                type="button"
                onClick={() => router.push('/browse')}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-2xl text-sm font-semibold transition-colors"
              >
                {t('cleanerProfile.bookCta')}
              </button>
            </div>
          )
        )}

        {/* Gallery — tap a thumbnail to zoom. Renders nothing when empty. */}
        {GALLERY_ENABLED && <GalleryLightbox photos={gallery} name={cleaner.full_name} />}

      </div>
    </div>
  )
}
