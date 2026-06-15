'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function BrowseTitle() {
  const { t } = useLanguage()
  return <h1 className="text-xl font-bold text-gray-900 mb-4">{t('browse.title')}</h1>
}
