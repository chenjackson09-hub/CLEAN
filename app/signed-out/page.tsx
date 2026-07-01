'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Shared post-logout screen for all three roles. `signOut` (app/(auth)/actions.ts)
// redirects here after clearing the session; it's a public route (see middleware).
export default function SignedOutPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#75C9C8]/20 via-white to-[#80A1D4]/20">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-[#75C9C8]/15 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-[#2f7d7c]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('signedOut.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('signedOut.subtitle')}</p>
        </div>

        <Link
          href="/login"
          className="w-full bg-[#75C9C8] hover:brightness-95 text-white font-semibold rounded-xl py-3 transition-colors shadow-sm"
        >
          {t('signedOut.loginAgain')}
        </Link>
      </div>
    </div>
  )
}
