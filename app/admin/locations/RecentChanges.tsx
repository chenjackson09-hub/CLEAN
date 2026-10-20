'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { RecentChange } from '@/lib/locationsData'
import { btnGhost } from '../adminTable'
import { undoLocationChange } from './actions'
import { Toast, type ToastState } from './Toast'

export function RecentChanges({ changes }: { changes: RecentChange[] }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  if (changes.length === 0) return null

  const undo = async (batch: string) => {
    setBusy(true)
    const res = await undoLocationChange(batch)
    setBusy(false)
    setToast(res.error ? { message: res.error, error: true } : { message: t('admin.locations.undone') })
    router.refresh()
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">{t('admin.locations.recent')}</h2>
      <Toast toast={toast} busy={busy} onUndo={undo} onDismiss={() => setToast(null)} />
      <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        {changes.map((c) => {
          const places = c.names.join(', ') + (c.count > c.names.length ? ` +${c.count - c.names.length}` : '')
          const status = t(`admin.locations.recentStatus.${c.status}`)
          return (
            <li key={c.batch} className="px-4 py-3 text-sm flex flex-wrap items-center gap-2">
              <span className="text-gray-800">
                {c.kind === 'region' ? t('admin.locations.recentRegion', { places, status }) : t('admin.locations.recentLocality', { places, status })}
              </span>
              <span className="text-xs text-gray-400">
                {c.adminName ? `${c.adminName} · ` : ''}{new Date(c.at).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB')}
              </span>
              {c.undone ? (
                <span className="ms-auto text-xs text-gray-400">{t('admin.locations.undoneTag')}</span>
              ) : (
                <button type="button" className={`${btnGhost} ms-auto !py-1 text-xs`} disabled={busy} onClick={() => undo(c.batch)}>
                  {t('admin.locations.undo')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
