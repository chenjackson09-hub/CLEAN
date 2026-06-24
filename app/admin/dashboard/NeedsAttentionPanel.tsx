'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  unmatchedCount: number
  pendingApplications: number
}

export function NeedsAttentionPanel({ unmatchedCount, pendingApplications }: Props) {
  const { t } = useLanguage()

  const items: { text: string; href: string }[] = []
  if (unmatchedCount > 0) {
    items.push({ text: t('admin.dashboard.attentionUnmatched', { count: unmatchedCount }), href: '/admin/bookings' })
  }
  if (pendingApplications > 0) {
    items.push({ text: t('admin.dashboard.attentionApplications', { count: pendingApplications }), href: '/admin/applications' })
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">{t('admin.dashboard.needsAttention')}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{t('admin.dashboard.needsAttentionEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i}>
              <Link href={item.href} className="flex items-center justify-between text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl px-3 py-2 transition-colors">
                <span>{item.text}</span>
                <span className="text-lg leading-none">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
