'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingDetailModal } from '@/app/(customer)/bookings/BookingDetailModal'
import { NextUpStrip, ScheduleBox, ScheduleRow } from '@/components/home/ScheduleParts'
import { extractArea } from '@/lib/bookingArea'
import { daysBetween } from '@/lib/dateMath'
import type { BookingResult } from '@/lib/types/booking'

type PendingBooking = BookingResult & { daysAgo: number }

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
}: {
  booking: BookingResult
  todayStr: string
  title: string
  subtitle: string
  chipTone?: 'default' | 'accent' | 'amber'
  faded?: boolean
  badge?: { text: string; className: string }
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
          ) : undefined
        }
        onClick={() => setOpen(true)}
      />
      {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}

// Greeting, then: Confirmed (its own scrolling box), a highlighted Today &
// tomorrow strip, Pending requests, and Past cleans (its own scrolling box).
// Today/tomorrow confirmed cleans live only in the strip so nothing shows twice.
export function HomeContent({ firstName, todayStr, confirmed, pending, past }: Props) {
  const { t } = useLanguage()

  // The cleaner's own area (e.g. "Beit Hillel"), not this booking's clean
  // address (the host's own place) — the point of showing a location is
  // "which cleaner is this," not "where does this booking happen."
  const areaOf = (b: BookingResult) => (b.cleaner_address ? extractArea(b.cleaner_address) : null) ?? b.cleaner_address ?? ''
  const titleOf = (b: BookingResult) => {
    const area = areaOf(b)
    return area ? `${b.cleaner_name} — ${area}` : b.cleaner_name
  }

  const nextUp = confirmed.filter(b => daysBetween(todayStr, b.scheduled_date) <= 1)
  const later = confirmed.filter(b => daysBetween(todayStr, b.scheduled_date) > 1)

  return (
    <div className="max-w-xl -mx-1.5 sm:mx-auto pt-2">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('home.greeting', { name: firstName })}</h1>

      <ScheduleBox title={t('home.confirmed')} count={later.length} empty={t('home.noConfirmed')}>
        {later.map(b => (
          <HomeBookingRow key={b.id} booking={b} todayStr={todayStr} title={titleOf(b)} subtitle={b.scheduled_start.slice(0, 5)} />
        ))}
      </ScheduleBox>

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

      <ScheduleBox title={t('home.pending')} count={pending.length} empty={t('home.noPending')}>
        {pending.map(b => {
          const requested =
            b.daysAgo <= 0 ? t('home.requestedToday') : b.daysAgo === 1 ? t('home.requestedYesterday') : t('home.requestedDaysAgo', { n: String(b.daysAgo) })
          return (
            <HomeBookingRow
              key={b.id}
              booking={b}
              todayStr={todayStr}
              chipTone="amber"
              title={t('home.awaitingResponse')}
              subtitle={b.availability_notice ? `${requested} · ${t('bookingCard.noticeBadge')}` : requested}
              badge={b.availability_notice ? { text: '!', className: 'bg-amber-300 text-amber-950 w-6 h-6 !p-0 flex items-center justify-center' } : undefined}
            />
          )
        })}
      </ScheduleBox>

      <ScheduleBox title={t('home.past')} count={past.length} empty={t('home.noPast')}>
        {past.map(b => (
          <HomeBookingRow key={b.id} booking={b} todayStr={todayStr} faded title={b.cleaner_name} subtitle={areaOf(b)} />
        ))}
      </ScheduleBox>
    </div>
  )
}
