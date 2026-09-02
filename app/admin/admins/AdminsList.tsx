'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createAdminInvite, revokeAdminInvite } from '@/app/admin/actions'
import { StatusFilterDropdown, StatusPill } from '@/app/admin/adminTable'

export type AdminAccount = {
  id: string
  full_name: string
  email: string
  isYou: boolean
  userStatus: 'active' | 'inactive'
}

export type PendingInvite = {
  id: string
  token: string
  created_at: string
  expires_at: string
}

function buildLink(token: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/register/admin?token=${token}`
}

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="text-sm font-semibold text-[#2f7d7c] bg-[#75C9C8]/15 hover:bg-[#75C9C8]/25 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

export function AdminsList({
  admins,
  invites: initialInvites,
}: {
  admins: AdminAccount[]
  invites: PendingInvite[]
}) {
  const { t, lang } = useLanguage()
  const [invites, setInvites] = useState(initialInvites)
  const [newLink, setNewLink] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active')

  const filteredAdmins = useMemo(
    () => (filter === 'all' ? admins : admins.filter((a) => a.userStatus === filter)),
    [admins, filter],
  )
  const filterOptions = [
    { value: 'active', label: t('admin.shared.filterActive') },
    { value: 'inactive', label: t('admin.shared.filterInactive') },
    { value: 'all', label: t('admin.shared.filterAll') },
  ]
  const statusLabel = { active: t('admin.shared.filterActive'), inactive: t('admin.shared.filterInactive') }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    const result = await createAdminInvite()
    setGenerating(false)
    if (result.error || !result.id || !result.token || !result.expiresAt) {
      setError(result.error ?? t('admin.admins.error'))
      return
    }
    setNewLink(buildLink(result.token))
    setInvites((prev) => [
      { id: result.id!, token: result.token!, created_at: new Date().toISOString(), expires_at: result.expiresAt! },
      ...prev,
    ])
  }

  async function handleRevoke(id: string) {
    if (!window.confirm(t('admin.admins.confirmRevoke'))) return
    const result = await revokeAdminInvite(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setInvites((prev) => prev.filter((i) => i.id !== id))
  }

  const dateLocale = lang === 'he' ? 'he-IL' : 'en-US'

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{t('admin.admins.title')}</h1>
        <div className="ms-auto">
          <StatusFilterDropdown value={filter} onChange={(v) => setFilter(v as typeof filter)} options={filterOptions} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-1">
        {filteredAdmins.length === 0 ? (
          <p className="text-sm text-gray-400">{t('admin.admins.empty')}</p>
        ) : (
          filteredAdmins.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-gray-900 truncate">{a.full_name || '—'}</span>
                <span className="text-sm text-gray-500 break-all">{a.email}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill status={a.userStatus} label={statusLabel[a.userStatus]} />
                {a.isYou && (
                  <span className="text-xs font-semibold text-[#2f7d7c] bg-[#75C9C8]/15 rounded-full px-2.5 py-1 whitespace-nowrap">
                    {t('admin.admins.you')}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">{t('admin.admins.inviteTitle')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('admin.admins.inviteDesc')}</p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="self-start bg-[#75C9C8] hover:bg-[#5fb3b2] disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2 transition-colors"
        >
          {generating ? t('admin.admins.generating') : t('admin.admins.generateLink')}
        </button>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {newLink && (
          <div className="flex items-center gap-2 bg-[#F7F4EA] rounded-xl p-3">
            <input
              readOnly
              value={newLink}
              dir="ltr"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0"
            />
            <CopyButton text={newLink} label={t('admin.admins.copyLink')} copiedLabel={t('admin.admins.copied')} />
          </div>
        )}

        {invites.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">{t('admin.admins.pendingTitle')}</h3>
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-gray-500">
                  {t('admin.admins.linkExpires', { date: new Date(inv.expires_at).toLocaleDateString(dateLocale) })}
                </span>
                <div className="flex items-center gap-2">
                  <CopyButton
                    text={buildLink(inv.token)}
                    label={t('admin.admins.copyLink')}
                    copiedLabel={t('admin.admins.copied')}
                  />
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    className="text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {t('admin.admins.revoke')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
