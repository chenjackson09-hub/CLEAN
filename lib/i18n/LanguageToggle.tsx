'use client'
import { useLanguage } from './LanguageContext'

export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="text-sm font-semibold text-gray-700 bg-gray-100 rounded-full px-3 py-1 hover:bg-gray-200 transition-colors"
    >
      {lang === 'en' ? 'עברית' : 'English'}
    </button>
  )
}
