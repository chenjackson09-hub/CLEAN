'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Link back to the read-only profile preview. Client component so its label
// follows the language toggle. No directional icon — an SVG arrow wouldn't
// auto-flip under RTL, so the plain translated label stays correct both ways.
export function BackToProfileLink() {
  const { t } = useLanguage()
  return (
    <Link
      href="/profile"
      className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors mb-1 py-3"
    >
      ← {t('profile.backToProfile')}
    </Link>
  )
}
