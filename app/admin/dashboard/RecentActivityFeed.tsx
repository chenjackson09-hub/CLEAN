'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Booking {
  id: string
  status: string
  created_at: string
  cleaner_name: string | null
  customer_name: string | null
}

type Range = 'day' | 'week' | 'month'
const RANGE_DAYS: Record<Range, number> = { day: 1, week: 7, month: 31 }
const RANGE_KEY: Record<Range, string> = {
  day: 'admin.dashboard.rangeDay',
  week: 'admin.dashboard.rangeWeek',
  month: 'admin.dashboard.rangeMonth',
}

// A distinct dot colour per activity type.
const DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  accepted: 'bg-[#75C9C8]',
  declined: 'bg-red-400',
  completed: 'bg-[#80A1D4]',
  cancelled: 'bg-gray-400',
}

const STATUS_TEXT: Record<string, { en: string; he: string }> = {
  pending: { en: 'requested', he: 'בקש/ה ניקיון מ' },
  accepted: { en: 'accepted a request from', he: 'אישר/ה בקשה מ' },
  declined: { en: 'declined a request from', he: 'דחה/תה בקשה מ' },
  completed: { en: 'completed a clean for', he: 'סיים/ה ניקיון עבור' },
  cancelled: { en: 'a booking was cancelled for', he: 'הזמנה בוטלה עבור' },
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function RecentActivityFeed({ bookings }: { bookings: Booking[] }) {
  const { t, lang } = useLanguage()
  const [range, setRange] = useState<Range>('week')

  const locale = lang === 'he' ? 'he-IL' : 'en-US'
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' })
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })

  const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000
  const filtered = bookings.filter((b) => new Date(b.created_at).getTime() >= cutoff)

  // Group into days, preserving the incoming newest-first order.
  const order: string[] = []
  const map = new Map<string, { date: Date; items: Booking[] }>()
  for (const b of filtered) {
    const d = new Date(b.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    let group = map.get(key)
    if (!group) {
      group = { date: d, items: [] }
      map.set(key, group)
      order.push(key)
    }
    group.items.push(b)
  }
  const groups = order.map((key) => ({ key, ...map.get(key)! }))

  function dayHeader(d: Date) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (sameDay(d, today)) return t('admin.dashboard.today')
    if (sameDay(d, yesterday)) return t('admin.dashboard.yesterday')
    return dayFmt.format(d)
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          {t('admin.dashboard.recentActivity')}
        </h2>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r ? 'bg-[#75C9C8] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t(RANGE_KEY[r])}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-400">{t('admin.dashboard.recentActivityEmpty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key}>
              {/* Per-day header: Today / Yesterday / weekday + date */}
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {dayHeader(group.date)}
              </div>
              <ul className="flex flex-col gap-2.5">
                {group.items.map((b) => {
                  const statusText = STATUS_TEXT[b.status]?.[lang] ?? b.status
                  const cleaner = b.cleaner_name ?? (lang === 'he' ? 'מנקה' : 'A cleaner')
                  const customer = b.customer_name ?? (lang === 'he' ? 'לקוח' : 'a customer')
                  return (
                    <li key={b.id} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${DOT[b.status] ?? 'bg-gray-300'}`} />
                      <span className="text-gray-700 flex-1 min-w-0">
                        <span className="font-semibold">{cleaner}</span> {statusText}{' '}
                        <span className="font-semibold">{customer}</span>
                      </span>
                      <span className="text-gray-400 text-xs whitespace-nowrap shrink-0">
                        {timeFmt.format(new Date(b.created_at))}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
