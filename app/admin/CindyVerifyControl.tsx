'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CindyVerifiedBadge } from '@/components/CindyVerifiedBadge'
import { setCindyVerified } from './verification'
import { btnPrimary, btnGhost } from './adminTable'

// In a Cleaners / Customers row's expanded panel: verify a person by hand, or remove the
// badge. Nobody is ever verified automatically.
export function CindyVerifyControl({ kind, id, verifiedAt, onChange }: {
  kind: 'cleaner' | 'customer'
  id: string
  verifiedAt: string | null
  onChange: (verifiedAt: string | null) => void
}) {
  const { t, lang } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(verified: boolean) {
    setBusy(true)
    setError(null)
    const res = await setCindyVerified({ kind, id, verified })
    setBusy(false)
    setConfirmRemove(false)
    if (res.error) { setError(res.error); return }
    onChange(res.verifiedAt ?? null)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('admin.verify.label')}</span>
      {verifiedAt ? (
        <>
          <CindyVerifiedBadge lang={lang === 'he' ? 'he' : 'en'} />
          <span className="text-xs text-gray-500">{t('admin.verify.since', { date: new Date(verifiedAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB') })}</span>
          {confirmRemove ? (
            <>
              <span className="text-sm text-gray-600">{t('admin.verify.removeConfirm')}</span>
              <button type="button" disabled={busy} onClick={() => run(false)} className={btnGhost}>{t('admin.verify.removeYes')}</button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="text-sm text-gray-500 underline">{t('admin.verify.cancel')}</button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmRemove(true)} className="text-sm text-gray-500 underline">{t('admin.verify.remove')}</button>
          )}
        </>
      ) : (
        <>
          <span className="text-sm text-gray-400">{t('admin.verify.not')}</span>
          <button type="button" disabled={busy} onClick={() => run(true)} className={btnPrimary}>{busy ? t('admin.verify.working') : t('admin.verify.verify')}</button>
        </>
      )}
      {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
    </div>
  )
}
