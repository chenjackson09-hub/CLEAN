'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export type InactiveUser = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  date: string | null
}

type Info = { label: string; date: string | null }
type Row = { user: InactiveUser; infos: Info[] }

export function InactiveList({ noLogin, noRequests }: { noLogin: InactiveUser[]; noRequests: InactiveUser[] }) {
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState<'all' | 'noLogin' | 'noRequests'>('all')

  const dateFmt = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium' })
  const loginLabel = t('admin.inactive.lastLogin')
  const reqLabel = t('admin.inactive.lastRequest')

  const loginMap = new Map(noLogin.map(u => [u.id, u]))
  const reqMap = new Map(noRequests.map(u => [u.id, u]))
  const allIds = Array.from(new Set([...noLogin.map(u => u.id), ...noRequests.map(u => u.id)]))

  // "All" merges both types (deduped) and shows every reason that applies.
  const rows: Row[] =
    tab === 'noLogin'
      ? noLogin.map(u => ({ user: u, infos: [{ label: loginLabel, date: u.date }] }))
      : tab === 'noRequests'
      ? noRequests.map(u => ({ user: u, infos: [{ label: reqLabel, date: u.date }] }))
      : allIds.map(id => {
          const lu = loginMap.get(id)
          const ru = reqMap.get(id)
          const infos: Info[] = []
          if (lu) infos.push({ label: loginLabel, date: lu.date })
          if (ru) infos.push({ label: reqLabel, date: ru.date })
          return { user: (lu ?? ru)!, infos }
        })

  const tabs = [
    ['all', t('admin.inactive.tabAll'), allIds.length],
    ['noLogin', t('admin.inactive.tabNoLogin'), noLogin.length],
    ['noRequests', t('admin.inactive.tabNoRequests'), noRequests.length],
  ] as const

  const emptyMsg =
    tab === 'noLogin'
      ? t('admin.inactive.emptyNoLogin')
      : tab === 'noRequests'
      ? t('admin.inactive.emptyNoRequests')
      : t('admin.inactive.emptyAll')

  function roleLabel(role: string) {
    if (role === 'cleaner') return t('support.cleaner')
    if (role === 'customer') return t('support.customer')
    return role
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('admin.inactive.title')}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors shadow-md ${
              tab === key ? 'bg-[#75C9C8] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">{emptyMsg}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ user, infos }) => (
            <li key={user.id} className="rounded-2xl bg-white p-4 shadow-xl ring-1 ring-gray-100">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{user.name || '—'}</span>
                  {user.role && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        user.role === 'cleaner' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {roleLabel(user.role)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 text-xs text-gray-400">
                  {infos.map((info, i) => (
                    <span key={i}>
                      {info.label}: {info.date ? dateFmt.format(new Date(info.date)) : t('admin.inactive.never')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {user.email && (
                  <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline break-all">
                    {user.email}
                  </a>
                )}
                {user.phone && (
                  <a href={`tel:${user.phone}`} className="text-gray-600 hover:underline" dir="ltr">
                    {user.phone}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
