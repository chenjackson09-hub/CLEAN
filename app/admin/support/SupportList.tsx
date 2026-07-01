'use client'

import { useState, useTransition } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { resolveSupportMessage } from '../actions'

export type SupportMessage = {
  id: string
  userRole: string
  name: string
  phone: string
  message: string
  resolved: boolean
  createdAt: string
}

export function SupportList({ messages }: { messages: SupportMessage[] }) {
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState<'open' | 'resolved'>('open')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startResolve] = useTransition()

  const visible = messages.filter((m) => (tab === 'open' ? !m.resolved : m.resolved))

  function handleResolve(id: string) {
    setPendingId(id)
    startResolve(async () => {
      await resolveSupportMessage(id)
      setPendingId(null)
    })
  }

  function roleLabel(role: string) {
    if (role === 'cleaner') return t('support.cleaner')
    if (role === 'customer') return t('support.customer')
    return role
  }

  const dateFmt = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('support.title')}</h1>

      <div className="mb-4 flex gap-2">
        {(['open', 'resolved'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {key === 'open' ? t('support.openTab') : t('support.resolvedTab')}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {t('support.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {m.name || t('support.from')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      m.userRole === 'cleaner'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {roleLabel(m.userRole)}
                  </span>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="text-xs text-blue-600 hover:underline">
                      {m.phone}
                    </a>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {dateFmt.format(new Date(m.createdAt))}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{m.message}</p>

              {m.resolved ? (
                <p className="mt-3 text-xs font-medium text-green-600">{t('support.resolved')}</p>
              ) : (
                <button
                  onClick={() => handleResolve(m.id)}
                  disabled={pendingId === m.id}
                  className="mt-3 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60"
                >
                  {t('support.resolve')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
