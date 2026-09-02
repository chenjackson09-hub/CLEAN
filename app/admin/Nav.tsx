'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { signOut } from '@/app/(auth)/actions'

type NavEntry =
  | { type: 'link'; href: string; labelKey: string; icon: React.ReactNode }
  | { type: 'divider' }

const NAV_ITEMS: NavEntry[] = [
  {
    type: 'link',
    href: '/admin/dashboard',
    labelKey: 'adminNav.dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
  {
    type: 'link',
    href: '/admin/applications',
    labelKey: 'adminNav.applications',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    type: 'link',
    href: '/admin/bookings',
    labelKey: 'adminNav.bookings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  { type: 'divider' },
  {
    type: 'link',
    href: '/admin/cleaners',
    labelKey: 'adminNav.cleaners',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    type: 'link',
    href: '/admin/customers',
    labelKey: 'adminNav.customers',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.7" />
      </svg>
    ),
  },
  {
    type: 'link',
    href: '/admin/admins',
    labelKey: 'adminNav.admins',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  { type: 'divider' },
  {
    type: 'link',
    href: '/admin/ads',
    labelKey: 'adminNav.ads',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.062 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 12.25c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-15.44c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73" />
      </svg>
    ),
  },
  {
    type: 'link',
    href: '/admin/push-notifications',
    labelKey: 'adminNav.pushNotifications',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a2.857 2.857 0 01-5.714 0" />
      </svg>
    ),
  },
  {
    type: 'link',
    href: '/admin/support',
    labelKey: 'adminNav.support',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  // TEMPORARY: Availability is hidden from the admin nav for now — unsure if admins
  // need it. The /admin/availability page still exists and is reachable by URL.
  // Re-add this entry to restore the nav button. See CLAUDE.md "Route groups".
  // {
  //   type: 'link',
  //   href: '/admin/availability',
  //   labelKey: 'adminNav.availability',
  //   icon: (
  //     <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  //       <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  //     </svg>
  //   ),
  // },
  // Blocked and Inactive were separate pages/nav entries — that functionality
  // now lives as filters within the Cleaners/Customers/Admins pages instead.
  // The pages themselves (/admin/blocked, /admin/inactive) still exist and
  // are reachable by URL, just no longer linked from the nav.
]

export function Nav({ currentUserName, currentUserAvatarUrl }: { currentUserName: string; currentUserAvatarUrl?: string | null }) {
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
      <Link
        href="/admin/profile"
        onClick={() => setSettingsOpen(false)}
        className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        {lang === 'he' ? 'פרופיל' : 'Profile'}
      </Link>
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
                <div className="absolute end-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-2 flex flex-col max-h-[calc(100vh-4rem)] overflow-y-auto">
                  {NAV_ITEMS.map((entry, i) => {
                    if (entry.type === 'divider') {
                      return <hr key={`divider-${i}`} className="my-2 border-gray-100" />
                    }
                    const active = isActive(entry.href)
                    return (
                      <Link
                        key={entry.href}
                        href={entry.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          active
                            ? 'bg-[#F7F4EA] text-[#6EB5B4] font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-5 h-5 shrink-0">{entry.icon}</span>
                        <span className="text-sm">{t(entry.labelKey)}</span>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Avatar — shows the admin's uploaded profile picture, or a placeholder */}
          <div className="relative shrink-0">
            <button
              onClick={() => { setSettingsOpen((o) => !o); setMenuOpen(false) }}
              aria-label={lang === 'he' ? 'תפריט חשבון' : 'Account menu'}
              aria-expanded={settingsOpen}
              className={`flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-gray-500 overflow-hidden transition-colors ${
                settingsOpen ? 'ring-2 ring-blue-400' : 'hover:bg-gray-300'
              }`}
            >
              {currentUserAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUserAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
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
          {NAV_ITEMS.map((entry, i) => {
            if (entry.type === 'divider') {
              return <hr key={`divider-${i}`} className="my-2 border-gray-100" />
            }
            const active = isActive(entry.href)
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-[#F7F4EA] text-[#6EB5B4] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#80A1D4]'
                }`}
              >
                <span className="w-5 h-5 shrink-0">{entry.icon}</span>
                <span className="text-sm">{t(entry.labelKey)}</span>
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
