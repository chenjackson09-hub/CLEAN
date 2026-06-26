'use client'
import { useLanguage } from './LanguageContext'

export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="text-sm font-semibold bg-gray-300 text-gray-700 rounded-full px-4 py-1 hover:bg-gray-100 transition-colors"
    >
      {lang === 'en' ? 'עברית' : 'English'}
    </button>
  )
}
