'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { signOut } from '@/app/(auth)/actions'

const NAV_ITEMS = [
  {
    href: '/admin/dashboard',
    labelKey: 'adminNav.dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
  {
    href: '/admin/applications',
    labelKey: 'adminNav.applications',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/bookings',
    labelKey: 'adminNav.bookings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/cleaners',
    labelKey: 'adminNav.cleaners',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    href: '/admin/customers',
    labelKey: 'adminNav.customers',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.7" />
      </svg>
    ),
  },
  {
    href: '/admin/support',
    labelKey: 'adminNav.support',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/admin/blocked',
    labelKey: 'adminNav.blocked',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    href: '/admin/inactive',
    labelKey: 'adminNav.inactive',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2m6-2a8 8 0 11-16 0 8 8 0 0116 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/admins',
    labelKey: 'adminNav.admins',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  // TEMPORARY: Availability is hidden from the admin nav for now — unsure if admins
  // need it. The /admin/availability page still exists and is reachable by URL.
  // Re-add this entry to restore the nav button. See CLAUDE.md "Route groups".
  // {
  //   href: '/admin/availability',
  //   labelKey: 'adminNav.availability',
  //   icon: (
  //     <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  //       <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  //     </svg>
  //   ),
  // },
] as const

export function Nav({ currentUserName }: { currentUserName: string }) {
  const pathname = usePathname()
  const { t, lang, toggleLanguage } = useLanguage()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const LangButtons = (
    <div className="flex gap-1">
      <button
        onClick={() => lang !== 'en' && toggleLanguage()}
        className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
          lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => lang !== 'he' && toggleLanguage()}
        className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
          lang === 'he' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        HE
      </button>
    </div>
  )

  const SettingsPanel = (
    <div className="absolute end-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4 flex flex-col gap-3">
      <div>
        <p className="text-xs text-gray-400 mb-1.5">{lang === 'he' ? 'שפה' : 'Language'}</p>
        {LangButtons}
      </div>
      <button
        onClick={() => { setSettingsOpen(false); setConfirmSignOut(true) }}
        className="w-full text-sm text-white bg-[#dc2626] hover:bg-red-700 transition-colors rounded-lg px-3 py-2 font-medium"
      >
        {lang === 'he' ? 'התנתק' : 'Sign out'}
      </button>
    </div>
  )

  return (
    <>
      {/* Top bar — full width, all breakpoints */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-5">
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-base font-bold text-blue-600">{lang === 'he' ? 'מנהל' : 'Admin'}</span>
          <span className="text-xs text-gray-500 truncate max-w-[160px]">{currentUserName}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Nav-links menu — mobile only, the sidebar covers this at md+ */}
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => { setMenuOpen((o) => !o); setSettingsOpen(false) }}
              aria-label={lang === 'he' ? 'תפריט' : 'Menu'}
              aria-expanded={menuOpen}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                menuOpen ? 'bg-[#F7F4EA] text-[#6EB5B4]' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute end-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-2 flex flex-col">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          active
                            ? 'bg-[#F7F4EA] text-[#6EB5B4] font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-5 h-5 shrink-0">{item.icon}</span>
                        <span className="text-sm">{t(item.labelKey)}</span>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Settings gear — will later be swapped for a profile picture */}
          <div className="relative shrink-0">
            <button
              onClick={() => { setSettingsOpen((o) => !o); setMenuOpen(false) }}
              aria-label={lang === 'he' ? 'הגדרות' : 'Settings'}
              aria-expanded={settingsOpen}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                settingsOpen ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                {SettingsPanel}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar — nav links only, desktop (md+), fixed below the top bar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:top-14 md:bottom-0 md:start-0 md:w-56 bg-white border-e border-gray-200 z-40">
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-[#F7F4EA] text-[#6EB5B4] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#80A1D4]'
                }`}
              >
                <span className="w-5 h-5 shrink-0">{item.icon}</span>
                <span className="text-sm">{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {confirmSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmSignOut(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold text-gray-900 text-center">{lang === 'he' ? 'האם אתה בטוח?' : 'Sign out?'}</p>
            <form action={signOut} className="flex flex-col gap-2">
              <button type="submit" className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-semibold rounded-xl py-2.5 transition-colors">
                {lang === 'he' ? 'כן, התנתק' : 'Yes, sign out'}
              </button>
              <button type="button" onClick={() => setConfirmSignOut(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-2.5 transition-colors">
                {lang === 'he' ? 'ביטול' : 'Cancel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
