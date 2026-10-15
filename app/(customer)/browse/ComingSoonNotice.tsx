'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Shown instead of the schedule when the host's chosen locality isn't open yet.
// Same family as WaitlistNotice (account approval), but about *where* we operate:
// the host can still use the rest of the app, and can correct their area.
export function ComingSoonNotice({ nameHe, nameEn }: { nameHe: string | null; nameEn: string | null }) {
  const { t, lang } = useLanguage()
  const place = lang === 'he' ? nameHe ?? nameEn : nameEn ?? nameHe

  return (
    <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
      <p className="font-semibold text-gray-900 text-lg mb-3">
        {place ? t('browse.comingSoonTitle', { place }) : t('browse.comingSoonTitleNoPlace')}
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">{t('browse.comingSoonBody')}</p>
      <Link href="/profile?edit=1" className="inline-block mt-4 text-sm font-medium text-blue-600 hover:underline">
        {t('browse.comingSoonChange')}
      </Link>
    </div>
  )
}
