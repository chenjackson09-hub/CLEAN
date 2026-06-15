'use client'
import { useLanguage } from './LanguageContext'

export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="text-xs font-semibold border border-white/40 rounded-full px-2.5 py-1 hover:bg-white/10 transition-colors"
    >
      {lang === 'en' ? 'עברית' : 'English'}
    </button>
  )
}
