'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Booking {
  id: string
  status: string
  created_at: string
  cleaner_name: string | null
  customer_name: string | null
}

function timeAgo(dateStr: string, lang: 'en' | 'he'): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return lang === 'he' ? 'עכשיו' : 'just now'
  if (mins < 60) return lang === 'he' ? `לפני ${mins} דק׳` : `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'he' ? `לפני ${hours} ש׳` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return lang === 'he' ? `לפני ${days} ימים` : `${days}d ago`
}

const STATUS_TEXT: Record<string, { en: string; he: string }> = {
  pending: { en: 'requested', he: 'בקש/ה ניקיון מ' },
  accepted: { en: 'accepted a request from', he: 'אישר/ה בקשה מ' },
  declined: { en: 'declined a request from', he: 'דחה/תה בקשה מ' },
  completed: { en: 'completed a clean for', he: 'סיים/ה ניקיון עבור' },
  cancelled: { en: 'a booking was cancelled for', he: 'הזמנה בוטלה עבור' },
}

export function RecentActivityFeed({ bookings }: { bookings: Booking[] }) {
  const { t, lang } = useLanguage()

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">{t('admin.dashboard.recentActivity')}</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-gray-400">{t('admin.dashboard.recentActivityEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const statusText = STATUS_TEXT[b.status]?.[lang] ?? b.status
            const cleaner = b.cleaner_name ?? (lang === 'he' ? 'מנקה' : 'A cleaner')
            const customer = b.customer_name ?? (lang === 'he' ? 'לקוח' : 'a customer')
            return (
              <li key={b.id} className="flex justify-between gap-3 text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-700">
                  <span className="font-semibold">{cleaner}</span> {statusText} <span className="font-semibold">{customer}</span>
                </span>
                <span className="text-gray-400 whitespace-nowrap text-xs shrink-0">{timeAgo(b.created_at, lang)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
