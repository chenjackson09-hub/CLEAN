'use client'
import { useLanguage } from './LanguageContext'

export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-full px-2.5 py-1 hover:bg-gray-100 transition-colors"
    >
      {lang === 'en' ? 'עברית' : 'English'}
    </button>
  )
}
