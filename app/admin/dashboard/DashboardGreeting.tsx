'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Computed entirely client-side (never from a server-rendered guess) so the
// greeting/date reflect the viewer's own local clock and timezone, not the
// server's. Renders nothing until mounted rather than risk a server/client
// time-of-day mismatch flashing the wrong greeting for a frame.
export function DashboardGreeting({ name }: { name: string }) {
  const { t, lang } = useLanguage()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  if (!now) return <div className="mb-6 h-[72px]" />

  const hour = now.getHours()
  const greeting =
    hour < 12
      ? t('admin.dashboard.greetingMorning')
      : hour < 18
        ? t('admin.dashboard.greetingAfternoon')
        : t('admin.dashboard.greetingEvening')

  const dateLocale = lang === 'he' ? 'he-IL' : 'en-US'
  const dateStr = now.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-gray-900">
        {greeting}{name ? `, ${name}` : ''}
      </h1>
      <p className="text-sm text-gray-500 mt-1">{dateStr}</p>
      <p className="text-sm text-gray-500">
        {t('admin.dashboard.regionLabel')}: {t('admin.dashboard.regionValue')}
      </p>
    </div>
  )
}
