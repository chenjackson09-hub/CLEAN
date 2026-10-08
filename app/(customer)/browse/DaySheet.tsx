'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CleanerCard } from './CleanerCard'
import { bookedHours, type DayModel, type HostBooking, type RebookInfo } from '@/lib/hostCalendar'
import { shortName } from '@/lib/chatFormat'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  // One day normally; the frame's days (switchable) in flexible-days mode.
  days: string[]
  active: string
  model: DayModel
  todayStr: string
  hasLocation: boolean
  locationError: boolean
  location: string
  cleanersById: Map<string, CleanerResult>
  // Set in flexible-days mode: every request sent from here joins this frame, so
  // the first acceptance cancels the rest.
  frameId?: string
  // Set when re-requesting a cancelled clean: details are carried over on its day.
  rebook?: RebookInfo
  onPick: (day: string) => void
  onClose: () => void
  onRequestSent: () => void
}

// The host's view of one day: what's booked, which requests are out, and who is
// free to ask — the host-side twin of the cleaner's day panel.
export function DaySheet({ days, active, model, todayStr, hasLocation, locationError, location, cleanersById, frameId, rebook, onPick, onClose, onRequestSent }: Props) {
  const { t, lang } = useLanguage()
  const locale = lang === 'he' ? 'he-IL' : 'en-GB'
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(d + 'T12:00:00').toLocaleDateString(locale, opts)
  const past = active < todayStr
  const rebooking = rebook && rebook.date === active ? rebook : undefined
  // The cleaner who cancelled isn't offered again for the day they cancelled.
  const freeList = rebooking ? model.free.filter((e) => e.id !== rebooking.cleanerId) : model.free

  const chatIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6 3.5-3.5H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
    </svg>
  )

  const bookedCard = (b: HostBooking) => {
    const name = shortName(b.cleanerName)
    return (
      <div key={b.id} className="relative bg-green-100 rounded-xl px-4 py-3 pe-14">
        <Link
          href={`/chat/${b.cleanerId}`}
          aria-label={t('browse.sheetChat', { name })}
          title={t('browse.sheetChat', { name })}
          className="absolute top-2.5 end-2.5 w-9 h-9 rounded-full bg-white/70 text-green-800 hover:bg-white flex items-center justify-center"
        >
          {chatIcon}
        </Link>
        <p className="text-lg font-semibold text-green-800">
          {b.slotStart && b.slotEnd
            ? `${b.slotStart.slice(0, 5)}–${b.slotEnd.slice(0, 5)}`
            : `${b.start} · ${t('browse.sheetAbout', { n: b.durationHours })}`}
        </p>
        <p className="text-base text-green-800">
          {t('browse.sheetWith')}{' '}
          <Link href={`/cleaners/${b.cleanerId}`} className="font-semibold underline hover:text-green-600">
            {name}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label={fmt(active, { weekday: 'long', day: 'numeric', month: 'long' })}
        className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{fmt(active, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <button onClick={onClose} aria-label={t('bookingRequestForm.cancel')} className="text-2xl text-gray-400 hover:text-gray-700 font-bold leading-none">
            ✕
          </button>
        </div>

        {days.length > 1 && (
          <div className="flex flex-wrap gap-2 px-6 pt-3">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onPick(d)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                  d === active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {rebooking && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('browse.rebookBanner', { name: shortName(rebooking.cleanerName) })}
            </p>
          )}

          {past && model.booked.length === 0 && model.requested.length === 0 && model.closed.length === 0 && (
            <p className="text-center text-gray-400 italic py-4">{t('browse.sheetPast')}</p>
          )}

          {model.booked.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">{t('browse.sheetBooked')}</h3>
              <div className="space-y-2">{model.booked.map(bookedCard)}</div>
            </section>
          )}

          {model.requested.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">{t('browse.sheetRequests')}</h3>
              <ul className="space-y-1.5">
                {model.requested.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate">
                      <Link href={`/cleaners/${b.cleanerId}`} className="font-medium text-gray-900 underline">
                        {shortName(b.cleanerName)}
                      </Link>{' '}
                      · {b.start}
                      {b.groupId && <span className="ms-1.5 text-xs text-blue-700">· {t('browse.sheetFlexible')}</span>}
                    </span>
                    <span className="shrink-0 font-semibold text-orange-700">{t('browse.sheetPending')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {model.closed.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">{t('browse.sheetClosed')}</h3>
              <ul className="space-y-1.5">
                {model.closed.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                    <span className="truncate">{shortName(b.cleanerName)} · {b.start}</span>
                    <span className="shrink-0 text-end">{b.closedReason ? t(`browse.closed_${b.closedReason}`) : t('browse.sheetCancelled')}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!past && (
            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">
                {t('browse.sheetFree')}
                {hasLocation && !locationError && freeList.length > 0 && <span className="ms-1.5 text-gray-400 font-normal">({freeList.length})</span>}
              </h3>
              {locationError ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                  {t('browse.locationNotFound')}{' '}
                  <Link href="/profile" className="font-semibold text-blue-600 hover:underline">{t('browse.goToProfile')}</Link>
                </p>
              ) : !hasLocation ? (
                <p className="text-sm text-gray-600">
                  {t('browse.enterLocation')}{' '}
                  <Link href="/profile" className="font-semibold text-blue-600 hover:underline">{t('browse.goToProfile')}</Link>
                </p>
              ) : freeList.length === 0 ? (
                <p className="text-sm text-gray-500">{t('browse.sheetNoFree')}</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {freeList.map((entry) => {
                    const cleaner = cleanersById.get(entry.id)
                    if (!cleaner) return null
                    return (
                      <div key={entry.id} className="py-3 first:pt-0">
                        <CleanerCard
                          cleaner={{ ...cleaner, availability: entry.slots }}
                          date={active}
                          location={rebooking?.address ?? location}
                          duration={rebooking?.duration}
                          prefill={rebooking?.prefill}
                          cleanGroupId={frameId}
                          onModalClosed={onRequestSent}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
