'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/lib/i18n/LanguageToggle'
import { signOut } from '@/app/(auth)/actions'

export function Nav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [confirm, setConfirm] = useState(false)

  const links = [
    { href: '/admin/applications', label: t('adminNav.applications') },
    { href: '/admin/bookings', label: t('adminNav.bookings') },
    { href: '/admin/cleaners', label: t('adminNav.cleaners') },
    { href: '/admin/customers', label: t('adminNav.customers') },
    { href: '/admin/availability', label: 'Availability' },
  ]

  return (
    <>
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">✨ Clean Admin</span>
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
          <button
            onClick={() => setConfirm(true)}
            className="text-xs text-white bg-red-600 hover:bg-red-700 transition-colors rounded-lg px-3 py-1.5 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-semibold text-gray-900 text-center">Sign out?</p>
            <form action={signOut} className="flex flex-col gap-2">
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-2.5 transition-colors">
                Yes, sign out
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-2.5 transition-colors">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
