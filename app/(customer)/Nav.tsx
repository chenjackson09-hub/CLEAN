'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/lib/i18n/LanguageToggle'

export function Nav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const links = [
    { href: '/browse', label: t('nav.browse') },
    { href: '/bookings', label: t('nav.bookings') },
    { href: '/profile', label: t('nav.profile') },
  ]

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <span className="font-bold text-lg">✨ Clean</span>
      <div className="flex gap-6 text-sm items-center">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'font-semibold underline' : 'hover:underline'}
          >
            {link.label}
          </Link>
        ))}
        <LanguageToggle />
      </div>
    </nav>
  )
}
