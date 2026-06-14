'use client'
import { LanguageToggle } from '@/lib/i18n/LanguageToggle'

export function Nav() {
  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <span className="font-bold text-lg">✨ Clean Cleaner</span>
      <LanguageToggle />
    </nav>
  )
}
