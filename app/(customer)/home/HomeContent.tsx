'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingDetailModal } from '@/app/(customer)/bookings/BookingDetailModal'
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

// One compact row per booking, grouped into a single white card per section
// (Confirmed/Pending/Past cleans) — matches the stakeholder mockup: a colored
// status dot, a two-line title/subtitle, and a status pill. Tapping a row
// opens the same BookingDetailModal every other booking view uses; /home
// itself stays read-only (no scheduling actions here — that's /browse).
function HomeBookingRow({
  booking,
  dotColor,
  title,
  subtitle,
  badgeText,
  badgeColor,
}: {
  booking: BookingResult
  dotColor: string
  title: string
  subtitle: string
  badgeText: string
  badgeColor: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-start flex items-start gap-3 py-3">
        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{title}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <span className={`shrink-0 self-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeColor}`}>
          {badgeText}
        </span>
      </button>
      {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}

function Section({ title, empty, hasRows, children }: { title: string; empty: string; hasRows: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">{title}</h2>
      {hasRows ? (
        <div className="bg-white rounded-2xl shadow-sm px-4 divide-y divide-gray-100">{children}</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm py-6 text-center text-gray-400 text-sm">{empty}</div>
      )}
    </section>
  )
}

export function HomeContent({ firstName, todayStr, confirmed, pending, past }: Props) {
  const { t, lang } = useLanguage()

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      lang === 'he' ? 'he-IL' : 'en-US',
      { weekday: 'short', day: 'numeric', month: 'long' }
    )
  }

  return (
    <div className="max-w-xl -mx-1.5 sm:mx-auto pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('home.greeting', { name: firstName })}</h1>

      <Section title={t('home.confirmed')} empty={t('home.noConfirmed')} hasRows={confirmed.length > 0}>
        {confirmed.map(b => {
          // The cleaner's own area (e.g. "Beit Hillel"), not this booking's
          // clean address (the host's own place) — the whole point of
          // showing a location here is "which cleaner is this," not
          // "where does this booking happen."
          const area = (b.cleaner_address ? extractArea(b.cleaner_address) : null) ?? b.cleaner_address ?? ''
          const daysUntil = daysBetween(todayStr, b.scheduled_date)
          const countdown =
            daysUntil <= 0 ? t('home.today') : daysUntil === 1 ? t('home.tomorrow') : t('home.inDays', { n: String(daysUntil) })
          return (
            <HomeBookingRow
              key={b.id}
              booking={b}
              dotColor="bg-green-600"
              title={area ? `${b.cleaner_name} — ${area}` : b.cleaner_name}
              subtitle={`${formatDate(b.scheduled_date)} · ${b.scheduled_start.slice(0, 5)} · ${countdown}`}
              badgeText={t('home.badgeConfirmed')}
              badgeColor="bg-green-100 text-green-700"
            />
          )
        })}
      </Section>

      <Section title={t('home.pending')} empty={t('home.noPending')} hasRows={pending.length > 0}>
        {pending.map(b => {
          const requested =
            b.daysAgo <= 0 ? t('home.requestedToday') : b.daysAgo === 1 ? t('home.requestedYesterday') : t('home.requestedDaysAgo', { n: String(b.daysAgo) })
          return (
            <HomeBookingRow
              key={b.id}
              booking={b}
              dotColor="bg-amber-500"
              title={t('home.awaitingResponse')}
              subtitle={`${formatDate(b.scheduled_date)} · ${requested}`}
              badgeText={t('home.badgePending')}
              badgeColor="bg-amber-100 text-amber-700"
            />
          )
        })}
      </Section>

      <Section title={t('home.past')} empty={t('home.noPast')} hasRows={past.length > 0}>
        {past.map(b => (
          <HomeBookingRow
            key={b.id}
            booking={b}
            dotColor="bg-gray-300"
            title={b.cleaner_name}
            subtitle={formatDate(b.scheduled_date)}
            badgeText={t('home.badgeDone')}
            badgeColor="bg-gray-100 text-gray-600"
          />
        ))}
      </Section>
    </div>
  )
}
