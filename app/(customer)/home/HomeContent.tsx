'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingDetailModal } from '@/app/(customer)/bookings/BookingDetailModal'
import { NextUpStrip, ScheduleBox, ScheduleRow } from '@/components/home/ScheduleParts'
import { extractArea } from '@/lib/bookingArea'
import { daysBetween } from '@/lib/dateMath'
import { countdownLabel } from '@/lib/countdown'
import type { DeadlineLabel } from '@/lib/deadline'
import type { BookingResult } from '@/lib/types/booking'

type PendingBooking = BookingResult & { daysAgo: number; left?: DeadlineLabel | null }

type Props = {
  firstName: string
  todayStr: string
  confirmed: BookingResult[]
  pending: PendingBooking[]
  past: BookingResult[]
}

// One compact row per booking. Tapping it opens the same BookingDetailModal
// every other booking view uses; /home itself stays read-only (no scheduling
// actions here — that's /browse).
function HomeBookingRow({
  booking,
  todayStr,
  title,
  subtitle,
  chipTone,
  faded,
  badge,
  countdown,
}: {
  booking: BookingResult
  todayStr: string
  title: string
  subtitle: string
  chipTone?: 'default' | 'active' | 'accent' | 'amber'
  faded?: boolean
  badge?: { text: string; className: string }
  countdown?: string
}) {
  const { lang } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <>
      <ScheduleRow
        dateStr={booking.scheduled_date}
        todayStr={todayStr}
        lang={lang === 'he' ? 'he' : 'en'}
        chipTone={chipTone}
        faded={faded}
        title={title}
        subtitle={subtitle}
        trailing={
          badge ? (
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}>{badge.text}</span>
          ) : countdown ? (
            <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 whitespace-nowrap">{countdown}</span>
          ) : undefined
        }
        onClick={() => setOpen(true)}
      />
      {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}

// Greeting, then everything in order of what needs attention: today & tomorrow (highlighted),
// requests still waiting for an answer, what's coming up, and past cleans (collapsed). The page
// just grows with its content, so nothing is pushed to the bottom and empty sections stay small
// (a waiting-for-an-answer box that is empty doesn't show at all).
export function HomeContent({ firstName, todayStr, confirmed, pending, past }: Props) {
  const { t, lang } = useLanguage()
  const [showPast, setShowPast] = useState(false)

  // The cleaner's own area (e.g. "Beit Hillel"), not this booking's clean
  // address (the host's own place) — the point of showing a location is
  // "which cleaner is this," not "where does this booking happen."
  const areaOf = (b: BookingResult) => (b.cleaner_address ? extractArea(b.cleaner_address) : null) ?? b.cleaner_address ?? ''
  const titleOf = (b: BookingResult) => {
    const area = areaOf(b)
    return area ? `${b.cleaner_name} — ${area}` : b.cleaner_name
  }
  const leftText = (l?: DeadlineLabel | null) =>
    !l || l.kind === 'expired' ? '' : l.kind === 'hours' ? t('home.leftHours', { n: String(l.n) }) : t('home.leftMinutes', { n: String(l.n) })

  const nextUp = confirmed.filter(b => daysBetween(todayStr, b.scheduled_date) <= 1)
  const later = confirmed.filter(b => daysBetween(todayStr, b.scheduled_date) > 1)

  return (
    <div className="max-w-xl -mx-1.5 sm:mx-auto pt-4 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('home.greeting', { name: firstName })}</h1>

      <NextUpStrip title={t('home.todayTomorrow')} count={nextUp.length}>
        {nextUp.map(b => (
          <HomeBookingRow
            key={b.id}
            booking={b}
            todayStr={todayStr}
            chipTone="accent"
            title={titleOf(b)}
            subtitle={`${daysBetween(todayStr, b.scheduled_date) <= 0 ? t('scheduleCard.today') : t('scheduleCard.tomorrow')} · ${b.scheduled_start.slice(0, 5)}`}
          />
        ))}
      </NextUpStrip>

      {/* Waiting for an answer: only when there is something to wait for. */}
      {pending.length > 0 && (
        <ScheduleBox maxH="max-h-[40vh]" title={t('home.waiting')} count={pending.length} empty="">
          {pending.map(b => {
            const left = leftText(b.left)
            const hours = b.duration_flexible ? '' : ` · ${b.duration_hours} h`
            return (
              <HomeBookingRow
                key={b.id}
                booking={b}
                todayStr={todayStr}
                chipTone="amber"
                title={`${t('home.requestSent')} · ${b.scheduled_start.slice(0, 5)}${hours}`}
                subtitle={[b.availability_notice ? t('bookingCard.noticeBadge') : t('home.waitingForAnswer'), left].filter(Boolean).join(' · ')}
                badge={b.availability_notice ? { text: '!', className: 'bg-amber-300 text-amber-950 w-6 h-6 !p-0 flex items-center justify-center' } : undefined}
              />
            )
          })}
        </ScheduleBox>
      )}

      <ScheduleBox
        maxH="max-h-[50vh]"
        title={t('home.comingUp')}
        count={later.length}
        empty={t('home.noConfirmed')}
        emptyAction={
          <Link href="/browse" className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {t('home.findCleaner')}
          </Link>
        }
      >
        {later.map(b => (
          <HomeBookingRow
            key={b.id}
            booking={b}
            todayStr={todayStr}
            chipTone="active"
            title={titleOf(b)}
            subtitle={b.scheduled_start.slice(0, 5)}
            countdown={countdownLabel(daysBetween(todayStr, b.scheduled_date), lang)}
          />
        ))}
      </ScheduleBox>

      {/* Past cleans: secondary, so it's one quiet line until you open it. */}
      {past.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setShowPast(o => !o)}
            aria-expanded={showPast}
            className="flex items-center gap-1 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {t('home.pastWithCount', { n: String(past.length) })}
            <span aria-hidden>{showPast ? '▴' : '▾'}</span>
          </button>
          {showPast && (
            <div className="mt-1.5 max-h-[40vh] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-sm divide-y divide-gray-100">
              {past.map(b => (
                <HomeBookingRow key={b.id} booking={b} todayStr={todayStr} faded title={b.cleaner_name} subtitle={areaOf(b)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="px-1 text-xs text-gray-400">{t('home.pastWithCount', { n: '0' })}</p>
      )}
    </div>
  )
}
