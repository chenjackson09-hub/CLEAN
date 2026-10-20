'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AdminTable, AdminRow, TextCell, btnGhost, btnPrimary } from '../adminTable'
import { SearchInput } from '../SearchInput'
import {
  activeCard, CARD_FILTER, districtLabel, hasActiveFilters, localityName,
  type CardKey, type LocationFilters, type SetStatus,
} from '@/lib/locations'
import type { LocationRow, Summary } from '@/lib/locationsData'
import { assignToRegion, setLocalityStatus, undoLocationChange } from './actions'
import { ConfirmDialog, Toast, type ToastState } from './Toast'

type RegionOption = { id: string; name: string; is_active: boolean }

const SORTABLE = ['name', 'status', 'customers', 'cleaners'] as const
const TEMPLATE = '28px minmax(180px,1.7fr) 110px 90px 90px 160px'
const fmt = (n: number, lang: string) => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US').format(n)

export function ManageView({ summary, rows, total, regions, districts, filters, page, pageSize }: {
  summary: Summary
  rows: LocationRow[]
  total: number
  regions: RegionOption[]
  districts: string[]
  filters: LocationFilters
  page: number
  pageSize: number
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  // ── URL state ──────────────────────────────────────────────────────────
  const go = (updates: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!keepPage) next.delete('page')
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }
  const clearAll = () => go({ q: null, district: null, region: null, status: null, users: null, sort: null, dir: null })

  // Debounced search (kept in step with the URL when filters are cleared elsewhere).
  const [search, setSearch] = useState(filters.q)
  useEffect(() => setSearch(filters.q), [filters.q])
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const id = setTimeout(() => { if (search !== filters.q) go({ q: search, sort: null, dir: null }) }, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // ── Changes: selection, confirm, toast ─────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => void } | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setSelected(new Set()), [rows])

  const toggle = (id: string) => setSelected((prev) => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const finish = (res: { error?: string; batch?: string; changed?: number; notified?: number }, count: number) => {
    setBusy(false)
    setConfirm(null)
    if (res.error) { setToast({ message: res.error, error: true }); return }
    const extra = res.notified ? ` ${t('admin.locations.notified', { count: res.notified })}` : ''
    setToast({ message: t('admin.locations.updated', { count: res.changed ?? count }) + extra, batch: res.batch })
    setSelected(new Set())
    router.refresh()
  }

  const applyStatus = async (ids: string[], status: SetStatus) => {
    setBusy(true)
    finish(await setLocalityStatus({ ids, status }), ids.length)
  }
  const applyRegion = async (ids: string[], regionId: string | null) => {
    setBusy(true)
    finish(await assignToRegion({ ids, regionId }), ids.length)
  }

  // Would this change close a place that is open now?
  const regionOpen = (id: string | null) => !!regions.find((r) => r.id === id)?.is_active
  const closesOpenPlaces = (ids: string[], status: SetStatus) =>
    rows.filter((r) => ids.includes(r.locality_id) && r.is_open && (status === 'closed' || (status === 'inherit' && !regionOpen(r.region_id)))).length

  const changeStatus = (ids: string[], status: SetStatus) => {
    const closing = closesOpenPlaces(ids, status)
    if (closing > 0) {
      setConfirm({ title: t('admin.locations.confirmCloseTitle'), body: t('admin.locations.confirmCloseBody', { count: closing }), run: () => applyStatus(ids, status) })
    } else void applyStatus(ids, status)
  }
  const changeRegion = (ids: string[], regionId: string | null) => {
    if (regionId && regionOpen(regionId)) {
      setConfirm({ title: t('admin.locations.confirmOpenRegionTitle'), body: t('admin.locations.confirmOpenRegionBody'), run: () => applyRegion(ids, regionId) })
      return
    }
    // Taking an open place out of its (open) region closes it.
    const closing = regionId === null ? rows.filter((r) => ids.includes(r.locality_id) && r.is_open && r.status_source === 'region').length : 0
    if (closing > 0) {
      setConfirm({ title: t('admin.locations.confirmCloseTitle'), body: t('admin.locations.confirmCloseBody', { count: closing }), run: () => applyRegion(ids, regionId) })
    } else void applyRegion(ids, regionId)
  }

  const undo = async (batch: string) => {
    setBusy(true)
    const res = await undoLocationChange(batch)
    setBusy(false)
    setToast(res.error ? { message: res.error, error: true } : { message: t('admin.locations.undone') })
    router.refresh()
  }

  // ── Cards ──────────────────────────────────────────────────────────────
  const current = activeCard(filters)
  const cards: { key: CardKey; label: string; value: number }[] = [
    { key: 'total', label: t('admin.locations.cards.total'), value: summary.total_localities },
    { key: 'open', label: t('admin.locations.cards.open'), value: summary.open_localities },
    { key: 'customers', label: t('admin.locations.cards.customers'), value: summary.customers },
    { key: 'cleaners', label: t('admin.locations.cards.cleaners'), value: summary.cleaners },
    { key: 'waiting_customers', label: t('admin.locations.cards.waitingCustomers'), value: summary.waiting_customers },
    { key: 'waiting_cleaners', label: t('admin.locations.cards.waitingCleaners'), value: summary.waiting_cleaners },
  ]
  const pickCard = (key: CardKey) => {
    const f = CARD_FILTER[key === current ? 'total' : key]
    go({ status: f.status, users: f.users, q: null, district: null, region: null, sort: null, dir: null })
  }

  const pages = Math.max(1, Math.ceil(total / pageSize))
  const backParam = encodeURIComponent(`${pathname}?${params.toString()}`)
  const settingLabel = (r: LocationRow) =>
    r.status_source === 'override' ? t('admin.locations.panel.own') : r.status_source === 'region' ? t('admin.locations.panel.viaRegion') : t('admin.locations.panel.byDefault')
  const statusValue = (r: LocationRow): SetStatus =>
    r.status_source === 'override' ? (r.is_open ? 'open' : 'closed') : r.region_id ? 'inherit' : 'closed'

  return (
    <div>
      {/* Summary cards — each one filters the table */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => pickCard(c.key)}
            aria-pressed={current === c.key}
            className={`text-start bg-white rounded-2xl shadow-sm p-4 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#75C9C8] ${
              current === c.key ? 'ring-2 ring-[#75C9C8]' : ''
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{fmt(c.value, lang)}</p>
          </button>
        ))}
      </div>
      {(summary.no_area_customers > 0 || summary.no_area_cleaners > 0) && (
        <p className="text-xs text-gray-500 mb-5">
          {t('admin.locations.noArea', { customers: fmt(summary.no_area_customers, lang), cleaners: fmt(summary.no_area_cleaners, lang) })}
        </p>
      )}

      <Toast toast={toast} busy={busy} onUndo={undo} onDismiss={() => setToast(null)} />

      {selected.size > 0 && (
        <div className="mb-4 rounded-xl bg-white shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{t('admin.locations.bulk.selected', { count: selected.size })}</span>
          <button type="button" disabled={busy} className={btnPrimary} onClick={() => changeStatus(Array.from(selected), 'open')}>{t('admin.locations.bulk.open')}</button>
          <button type="button" disabled={busy} className={btnGhost} onClick={() => changeStatus(Array.from(selected), 'closed')}>{t('admin.locations.bulk.close')}</button>
          <button type="button" disabled={busy} className={btnGhost} onClick={() => changeStatus(Array.from(selected), 'inherit')}>{t('admin.locations.bulk.inherit')}</button>
          {regions.length > 0 && (
            <select
              value=""
              disabled={busy}
              onChange={(e) => e.target.value && changeRegion(Array.from(selected), e.target.value)}
              aria-label={t('admin.locations.bulk.addToRegion')}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
            >
              <option value="">{t('admin.locations.bulk.addToRegion')}</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <button type="button" disabled={busy} className={btnGhost} onClick={() => changeRegion(Array.from(selected), null)}>{t('admin.locations.bulk.removeFromRegion')}</button>
          <button type="button" className="text-sm text-gray-500 underline ms-auto" onClick={() => setSelected(new Set())}>{t('admin.locations.bulk.clear')}</button>
        </div>
      )}

      <AdminTable
        count={total}
        isEmpty={rows.length === 0}
        empty={t('admin.locations.empty')}
        template={TEMPLATE}
        minWidth="min-w-[760px]"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} />
            <select value={filters.region} onChange={(e) => go({ region: e.target.value })} aria-label={t('admin.locations.panel.region')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">
              <option value="">{t('admin.locations.allRegions')}</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={filters.district} onChange={(e) => go({ district: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">
              <option value="">{t('admin.locations.allDistricts')}</option>
              {districts.map((d) => <option key={d} value={d}>{districtLabel(d, lang)}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => go({ status: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">
              <option value="">{t('admin.locations.allStatuses')}</option>
              <option value="open">{t('admin.locations.status.open')}</option>
              <option value="closed">{t('admin.locations.status.closed')}</option>
            </select>
            <select value={filters.users} onChange={(e) => go({ users: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">
              <option value="">{t('admin.locations.users.all')}</option>
              <option value="customers">{t('admin.locations.users.customers')}</option>
              <option value="cleaners">{t('admin.locations.users.cleaners')}</option>
              <option value="waiting">{t('admin.locations.users.waiting')}</option>
            </select>
            {hasActiveFilters(filters) && (
              <button type="button" onClick={clearAll} className="text-sm font-semibold text-blue-600 hover:underline">
                {t('admin.locations.clearFilters')}
              </button>
            )}
          </div>
        }
        columns={[
          { key: 'sel', label: '' },
          ...SORTABLE.map((key) => ({
            key,
            label: t(`admin.locations.col.${key === 'name' ? 'location' : key}`) + (filters.sort === key ? (filters.dir === 'asc' ? ' ↑' : ' ↓') : ''),
            className: 'cursor-pointer select-none hover:text-gray-800',
          })),
          { key: 'action', label: t('admin.locations.col.action') },
        ]}
        onSort={(key) => {
          const same = filters.sort === key
          go({ sort: key, dir: same && filters.dir === 'desc' ? 'asc' : same ? 'desc' : key === 'name' ? 'asc' : 'desc' })
        }}
      >
        {rows.map((r) => {
          const waiting = !r.is_open && r.customers + r.cleaners > 0
          return (
            <AdminRow
              key={r.locality_id}
              template={TEMPLATE}
              cells={[
                <input key="c" type="checkbox" checked={selected.has(r.locality_id)} onChange={() => toggle(r.locality_id)} aria-label={localityName(r, lang)} />,
                <div key="n">
                  <p className="font-semibold text-gray-900 truncate">{localityName(r, lang)}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {districtLabel(r.district, lang)}{r.region_name ? ` · ${r.region_name}` : ''}
                  </p>
                </div>,
                <span key="s" className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ring-1 whitespace-nowrap ${
                  r.is_open ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-gray-100 text-gray-500 ring-gray-200'
                }`}>
                  {r.is_open ? t('admin.locations.status.open') : t('admin.locations.status.closed')}
                </span>,
                <span key="cu" title={waiting ? t('admin.locations.waitingHint') : undefined} className={waiting && r.customers > 0 ? 'text-amber-700 font-semibold' : ''}>
                  <TextCell>{fmt(r.customers, lang)}</TextCell>
                </span>,
                <span key="cl" title={waiting ? t('admin.locations.waitingHint') : undefined} className={waiting && r.cleaners > 0 ? 'text-amber-700 font-semibold' : ''}>
                  <TextCell>{fmt(r.cleaners, lang)}</TextCell>
                </span>,
              ]}
              actions={
                <select
                  value={statusValue(r)}
                  disabled={busy}
                  onChange={(e) => changeStatus([r.locality_id], e.target.value as SetStatus)}
                  aria-label={t('admin.locations.col.action')}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
                >
                  <option value="open">{t('admin.locations.set.open')}</option>
                  <option value="closed">{t('admin.locations.set.closed')}</option>
                  {r.region_id && <option value="inherit">{t('admin.locations.set.inherit')}</option>}
                </select>
              }
              expanded={
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  <p><span className="text-gray-500">{t('admin.locations.panel.setting')}: </span>{settingLabel(r)}</p>
                  <p><span className="text-gray-500">{t('admin.locations.panel.region')}: </span>{r.region_name ?? t('admin.locations.panel.noRegion')}</p>
                  <p><span className="text-gray-500">{t('admin.locations.panel.customers')}: </span>{fmt(r.customers, lang)}</p>
                  <p><span className="text-gray-500">{t('admin.locations.panel.cleaners')}: </span>{fmt(r.cleaners, lang)}</p>
                  {waiting && <p className="text-amber-700 sm:col-span-2">{t('admin.locations.waitingHint')}</p>}
                  <p className="text-xs text-gray-400 sm:col-span-2">{t('admin.locations.panel.code')}: {r.cbs_code}</p>
                  <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
                    <Link className="font-semibold text-blue-600 hover:underline" href={`/admin/customers?locality=${r.locality_id}&back=${backParam}`}>
                      {t('admin.locations.panel.viewCustomers')}
                    </Link>
                    <Link className="font-semibold text-blue-600 hover:underline" href={`/admin/cleaners?locality=${r.locality_id}&back=${backParam}`}>
                      {t('admin.locations.panel.viewCleaners')}
                    </Link>
                  </div>
                </div>
              }
            />
          )
        })}
      </AdminTable>

      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => go({ page: String(page - 1) }, true)}>{t('admin.locations.prev')}</button>
          <span className="text-gray-600 tabular-nums">{t('admin.locations.pageOf', { page, pages })}</span>
          <button type="button" className={btnGhost} disabled={page >= pages} onClick={() => go({ page: String(page + 1) }, true)}>{t('admin.locations.next')}</button>
        </div>
      )}

      {confirm && (
        <ConfirmDialog title={confirm.title} body={confirm.body} busy={busy} onConfirm={confirm.run} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}
