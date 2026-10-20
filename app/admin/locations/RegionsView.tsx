'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { RegionRow } from '@/lib/locationsData'
import { btnGhost, btnPrimary } from '../adminTable'
import { createRegion, setRegionActive, undoLocationChange } from './actions'
import { ConfirmDialog, Toast, type ToastState } from './Toast'

const fmt = (n: number, lang: string) => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US').format(n)

// Higher-level view: Clean's own service areas (not official districts). A region
// is opened or closed as a whole; places inside it can still have their own setting.
export function RegionsView({ regions }: { regions: RegionRow[] }) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirm, setConfirm] = useState<{ region: RegionRow; active: boolean } | null>(null)

  const create = async () => {
    setBusy(true)
    const res = await createRegion({ name })
    setBusy(false)
    if (res.error) { setToast({ message: res.error, error: true }); return }
    setName('')
    setToast({ message: t('admin.locations.updated', { count: 1 }) })
    router.refresh()
  }

  const toggle = async (region: RegionRow, active: boolean) => {
    setBusy(true)
    const res = await setRegionActive({ regionId: region.region_id, active })
    setBusy(false)
    setConfirm(null)
    if (res.error) { setToast({ message: res.error, error: true }); return }
    const extra = res.notified ? ` ${t('admin.locations.notified', { count: res.notified })}` : ''
    setToast({ message: t('admin.locations.updated', { count: res.changed ?? 0 }) + extra, batch: res.batch })
    router.refresh()
  }

  const undo = async (batch: string) => {
    setBusy(true)
    const res = await undoLocationChange(batch)
    setBusy(false)
    setToast(res.error ? { message: res.error, error: true } : { message: t('admin.locations.undone') })
    router.refresh()
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{t('admin.locations.regions.hint')}</p>
      <Toast toast={toast} busy={busy} onUndo={undo} onDismiss={() => setToast(null)} />

      <form
        className="flex flex-wrap gap-2 mb-5"
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) void create() }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t('admin.locations.regions.createPlaceholder')}
          aria-label={t('admin.locations.regions.createPlaceholder')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#75C9C8]"
        />
        <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>{t('admin.locations.regions.create')}</button>
      </form>

      {regions.length === 0 ? (
        <div className="rounded-2xl bg-white/70 p-10 text-center text-gray-500">{t('admin.locations.regions.empty')}</div>
      ) : (
        <ul className="space-y-3">
          {regions.map((r) => (
            <li key={r.region_id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">{r.name}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ring-1 ${r.is_active ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-gray-100 text-gray-500 ring-gray-200'}`}>
                  {r.is_active ? t('admin.locations.status.open') : t('admin.locations.status.closed')}
                </span>
                <div className="ms-auto flex flex-wrap gap-2">
                  <Link href={`/admin/locations?region=${r.region_id}`} className={btnGhost}>{t('admin.locations.regions.viewPlaces')}</Link>
                  <button
                    type="button"
                    disabled={busy}
                    className={r.is_active ? btnGhost : btnPrimary}
                    onClick={() => setConfirm({ region: r, active: !r.is_active })}
                  >
                    {r.is_active ? t('admin.locations.regions.close') : t('admin.locations.regions.open')}
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-600">
                <p>{t('admin.locations.regions.places', { open: fmt(r.open_localities, lang), total: fmt(r.localities, lang) })}</p>
                <p>{t('admin.locations.regions.people', { customers: fmt(r.customers, lang), cleaners: fmt(r.cleaners, lang) })}</p>
                <p className={r.waiting_customers + r.waiting_cleaners > 0 ? 'text-amber-700' : ''}>
                  {t('admin.locations.regions.waiting', { customers: fmt(r.waiting_customers, lang), cleaners: fmt(r.waiting_cleaners, lang) })}
                </p>
                {r.own_setting > 0 && <p className="text-xs text-gray-400 sm:col-span-3">{t('admin.locations.regions.ownSetting', { count: r.own_setting })}</p>}
              </dl>
            </li>
          ))}
        </ul>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.active ? t('admin.locations.regions.open') : t('admin.locations.confirmCloseTitle')}
          body={t(confirm.active ? 'admin.locations.regions.openBody' : 'admin.locations.regions.closeBody', { name: confirm.region.name })}
          busy={busy}
          onConfirm={() => toggle(confirm.region, confirm.active)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
