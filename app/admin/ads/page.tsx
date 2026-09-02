'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function AdminAdsPage() {
  const { t } = useLanguage()
  return (
    <div className="max-w-lg mx-auto text-center py-16 flex flex-col items-center gap-3">
      <h1 className="text-xl font-bold text-gray-900">{t('admin.ads.title')}</h1>
      <p className="text-sm text-gray-500">{t('admin.ads.comingSoon')}</p>
    </div>
  )
}
