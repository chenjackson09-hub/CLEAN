'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Shown instead of the browse UI while a customer's account is still pending
// admin approval — they can look around the rest of the app, just not
// browse cleaners or book, until they're approved.
export function WaitlistNotice({ name }: { name: string }) {
  const { t } = useLanguage()

  return (
    <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
      <p className="font-semibold text-gray-900 text-lg mb-3">{t('browse.waitlistTitle', { name })}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{t('browse.waitlistIntro')}</p>
      <p className="text-sm text-gray-600 leading-relaxed mt-3">
        {t('browse.waitlistBody1')} <strong className="text-gray-900">{t('browse.waitlistBold')}</strong>
      </p>
      <p className="text-sm text-gray-600 leading-relaxed mt-3">{t('browse.waitlistBody2')}</p>
      <p className="text-sm font-semibold text-gray-900 leading-relaxed mt-4">{t('browse.waitlistClosing')}</p>
    </div>
  )
}
