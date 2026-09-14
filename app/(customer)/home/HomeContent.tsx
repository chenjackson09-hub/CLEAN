'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ScheduleCard } from '@/app/(customer)/bookings/ScheduleCard'
import type { BookingResult } from '@/lib/types/booking'

type Props = {
  firstName: string
  todayStr: string
  today: BookingResult[]
  upcoming: BookingResult[]
  past: BookingResult[]
}

// Mirrors the cleaner dashboard's shape: a greeting, then Today/Upcoming/Past
// sections of actual bookings — replaces /home's old plain link-tile menu
// entirely (Schedule/Bookings/Profile are already one tap away via the nav).
// Uses the shared ScheduleCard (not the general BookingCard) since every
// booking here is accepted/completed only — see ScheduleCard.tsx.
export function HomeContent({ firstName, todayStr, today, upcoming, past }: Props) {
  const { t } = useLanguage()

  return (
    <div className="max-w-xl -mx-1.5 sm:mx-auto pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('home.greeting', { name: firstName })}</h1>
      <p className="text-gray-500 mb-8">{t('home.subtitle')}</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('home.today')}</h2>
        {today.length > 0 ? (
          <div className="space-y-4">
            {today.map(b => <ScheduleCard key={b.id} booking={b} todayStr={todayStr} />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">
            {t('home.noToday')}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('home.upcoming')}</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map(b => <ScheduleCard key={b.id} booking={b} todayStr={todayStr} />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">
            {t('home.noUpcoming')}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('home.past')}</h2>
        {past.length > 0 ? (
          <div className="space-y-4">
            {past.map(b => <ScheduleCard key={b.id} booking={b} todayStr={todayStr} />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">
            {t('home.noPast')}
          </div>
        )}
      </section>
    </div>
  )
}
