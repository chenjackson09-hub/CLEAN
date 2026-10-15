'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AdminTable, AdminRow, TextCell, btnGhost, btnPrimary, btnDanger } from '../adminTable'
import { SearchInput } from '../SearchInput'
import { districtLabel, growthPct, LOCATION_STATUSES, type LocationStatus } from '@/lib/locations'
import type { LocationRow, LocationTotals, RecentChange } from '@/lib/locationsData'
import { setLocalityStatus, undoLocalityChange } from './actions'

type Query = {
  period: string; from: string; to: string; q: string; district: string; status: string; sort: string; dir: string; users: boolean
}

const TEMPLATE = '28px minmax(180px,1.6fr) 120px 70px 80px 80px 80px 80px 110px 150px'

const STATUS_STYLE: Record<LocationStatus, string> = {
  open: 'bg-green-50 text-green-700 ring-green-100',
  coming_soon: 'bg-orange-50 text-orange-600 ring-orange-100',
  not_open: 'bg-gray-100 text-gray-500 ring-gray-200',
}
const STATUS_DOT: Record<LocationStatus, string> = { open: '🟢', coming_soon: '🟠', not_open: '⚪' }

function fmt(n: number, lang: string) {
  return new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US').format(n)
}

export function LocationsView({
  setupNeeded, rows, total, totals, fastest, districts, recent, page, pageSize, query,
}: {
  setupNeeded: boolean
  rows: LocationRow[]
  total: number
  totals: LocationTotals | null
  fastest: { name_he: string; name_en: string | null; new_users: number } | null
  districts: string[]
  recent: RecentChange[]
  page: number
  pageSize: number
  query: Query
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

  // Debounced search
  const [search, setSearch] = useState(query.q)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const id = setTimeout(() => { if (search !== query.q) go({ q: search }) }, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const [customFrom, setCustomFrom] = useState(query.from)
  const [customTo, setCustomTo] = useState(query.to)

  // ── Selection & status changes ─────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{ ids: string[]; status: LocationStatus; openCount: number } | null>(null)
  const [toast, setToast] = useState<{ message: string; batch?: string; error?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setSelected(new Set()) }, [rows])

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const apply = async (ids: string[], status: LocationStatus) => {
    setBusy(true)
    const res = await setLocalityStatus({ ids, status })
    setBusy(false)
    setConfirm(null)
    if (res.error) {
      setToast({ message: res.error, error: true })
      return
    }
    setToast({ message: t('admin.locations.updated', { count: res.changed ?? ids.length }), batch: res.batch })
    setSelected(new Set())
    router.refresh()
  }

  // Closing a location that is currently open needs an explicit confirmation.
  const request = (ids: string[], status: LocationStatus) => {
    const openCount = rows.filter(r => ids.includes(r.locality_id) && r.status === 'open').length
    if (status !== 'open' && openCount > 0) setConfirm({ ids, status, openCount })
    else void apply(ids, status)
  }

  const undo = async (batch: string) => {
    setBusy(true)
    const res = await undoLocalityChange(batch)
    setBusy(false)
    setToast(res.error ? { message: res.error, error: true } : { message: t('admin.locations.undone') })
    router.refresh()
  }

  const statusLabel = (s: LocationStatus) => t(`admin.locations.status.${s}`)
  const nameOf = (r: LocationRow) => (lang === 'he' ? r.name_he : r.name_en || r.name_he)
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const periods = ['7d', '30d', '90d', 'all', 'custom'] as const

  const card = (label: string, value: string, sub?: string) => (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  )

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">📍 {t('admin.locations.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.locations.subtitle')}</p>
      </div>

      {setupNeeded && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 p-4 mb-5 text-sm">
          {t('admin.locations.setupNeeded')}
        </div>
      )}

      {/* Period */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {periods.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => (p === 'custom' ? go({ period: 'custom' }) : go({ period: p, from: null, to: null }))}
            className={`text-sm font-semibold px-3 py-1.5 rounded-full transition ${
              query.period === p ? 'bg-[#75C9C8] text-white' : 'bg-white text-gray-600 hover:bg-[#F7F4EA]'
            }`}
          >
            {t(`admin.locations.period.${p}`)}
          </button>
        ))}
        {query.period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} aria-label={t('admin.locations.from')}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white" />
            <span className="text-gray-400">–</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} aria-label={t('admin.locations.to')}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white" />
            <button type="button" className={btnPrimary} disabled={!customFrom || !customTo}
              onClick={() => go({ period: 'custom', from: customFrom, to: customTo })}>
              {t('admin.locations.apply')}
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {totals ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {card(t('admin.locations.cards.total'), fmt(totals.total_localities, lang))}
          {card(t('admin.locations.cards.open'), fmt(totals.open_localities, lang))}
          {card(t('admin.locations.cards.hosts'), fmt(totals.hosts, lang), t('admin.locations.cards.hostsSub'))}
          {card(t('admin.locations.cards.activeHosts'), fmt(totals.active_hosts, lang), t('admin.locations.cards.activeSub'))}
          {card(t('admin.locations.cards.cleaners'), fmt(totals.cleaners, lang), t('admin.locations.cards.cleanersSub', { count: fmt(totals.active_cleaners, lang) }))}
          {card(t('admin.locations.cards.requests'), fmt(totals.requests, lang), t('admin.locations.cards.requestsSub'))}
          {card(t('admin.locations.cards.waiting'), fmt(totals.waiting, lang), totals.waiting === 0 ? t('admin.locations.cards.waitingNone') : undefined)}
          {card(
            t('admin.locations.cards.fastest'),
            fastest ? (lang === 'he' ? fastest.name_he : fastest.name_en || fastest.name_he) : t('admin.locations.noData'),
            fastest
              ? t('admin.locations.cards.fastestSub', { count: fastest.new_users })
              : t('admin.locations.cards.fastestHint'),
          )}
        </div>
      ) : null}

      {/* Toast */}
      {toast && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-3 ${
          toast.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
        }`}>
          <span>{toast.message}</span>
          {toast.batch && (
            <button type="button" disabled={busy} onClick={() => undo(toast.batch!)} className="font-semibold underline">
              {t('admin.locations.undo')}
            </button>
          )}
          <button type="button" onClick={() => setToast(null)} className="ms-auto text-xs opacity-70" aria-label={t('admin.locations.dismiss')}>✕</button>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-4 rounded-xl bg-white shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{t('admin.locations.selected', { count: selected.size })}</span>
          {LOCATION_STATUSES.map(s => (
            <button key={s} type="button" disabled={busy} className={s === 'open' ? btnPrimary : btnGhost}
              onClick={() => request(Array.from(selected), s)}>
              {t(`admin.locations.bulk.${s}`)}
            </button>
          ))}
          <button type="button" className="text-sm text-gray-500 underline ms-auto" onClick={() => setSelected(new Set())}>
            {t('admin.locations.clearSelection')}
          </button>
        </div>
      )}

      <AdminTable
        title={t('admin.locations.tableTitle')}
        count={total}
        isEmpty={rows.length === 0}
        empty={setupNeeded ? t('admin.locations.setupNeeded') : t('admin.locations.empty')}
        template={TEMPLATE}
        minWidth="min-w-[980px]"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} />
            <select value={query.district} onChange={e => go({ district: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">
              <option value="">{t('admin.locations.allDistricts')}</option>
              {districts.map(d => <option key={d} value={d}>{districtLabel(d, lang)}</option>)}
            </select>
            <select value={query.status} onChange={e => go({ status: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">
              <option value="">{t('admin.locations.allStatuses')}</option>
              {LOCATION_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input type="checkbox" checked={query.users} onChange={e => go({ users: e.target.checked ? '1' : null })} />
              {t('admin.locations.onlyWithUsers')}
            </label>
          </div>
        }
        columns={[
          { key: 'sel', label: '' },
          { key: 'name', label: t('admin.locations.col.location') },
          { key: 'status', label: t('admin.locations.col.status') },
          ...([
            ['hosts', 'hosts'], ['active', 'activeHosts'], ['cleaners', 'cleaners'], ['requests', 'requests'], ['waiting', 'waiting'], ['growth', 'new'],
          ] as const).map(([key, label]) => ({
            key,
            label: `${t(`admin.locations.col.${label}`)}${query.sort === key ? (query.dir === 'asc' ? ' ↑' : ' ↓') : ''}`,
          })),
          { key: 'action', label: '' },
        ]}
      >
        {rows.map(r => {
          const growth = growthPct(r.new_users, r.prev_new_users)
          return (
            <AdminRow
              key={r.locality_id}
              template={TEMPLATE}
              cells={[
                <input key="c" type="checkbox" checked={selected.has(r.locality_id)} onChange={() => toggle(r.locality_id)}
                  aria-label={nameOf(r)} />,
                <div key="n">
                  <p className="font-semibold text-gray-900 truncate">{nameOf(r)}</p>
                  <p className="text-xs text-gray-500 truncate">{districtLabel(r.district, lang)} · {r.cbs_code}</p>
                </div>,
                <span key="s" className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ring-1 whitespace-nowrap ${STATUS_STYLE[r.status]}`}>
                  {STATUS_DOT[r.status]} {statusLabel(r.status)}
                </span>,
                <TextCell key="h">{fmt(r.hosts, lang)}</TextCell>,
                <TextCell key="a">{fmt(r.active_hosts, lang)}</TextCell>,
                <TextCell key="cl">{fmt(r.cleaners, lang)}</TextCell>,
                <TextCell key="rq">{fmt(r.requests, lang)}</TextCell>,
                <TextCell key="w">{fmt(r.waiting, lang)}</TextCell>,
                <TextCell key="g">
                  {fmt(r.new_users, lang)}
                  {growth !== null && (
                    <span className={`ms-1 text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {growth >= 0 ? '+' : ''}{growth}%
                    </span>
                  )}
                </TextCell>,
              ]}
              actions={
                <select
                  value={r.status}
                  disabled={busy}
                  onChange={e => request([r.locality_id], e.target.value as LocationStatus)}
                  aria-label={t('admin.locations.manage')}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
                >
                  {LOCATION_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              }
            />
          )
        })}
      </AdminTable>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => go({ page: String(page - 1) }, true)}>
            {t('admin.locations.prev')}
          </button>
          <span className="text-gray-600 tabular-nums">{t('admin.locations.pageOf', { page, pages })}</span>
          <button type="button" className={btnGhost} disabled={page >= pages} onClick={() => go({ page: String(page + 1) }, true)}>
            {t('admin.locations.next')}
          </button>
        </div>
      )}

      {/* Sort controls (header labels are sortable) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span>{t('admin.locations.sortBy')}</span>
        <select value={query.sort} onChange={e => go({ sort: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700">
          {([['hosts', 'hosts'], ['active', 'activeHosts'], ['cleaners', 'cleaners'], ['requests', 'requests'], ['waiting', 'waiting'], ['growth', 'new'], ['name', 'location']] as const).map(([k, l]) => (
            <option key={k} value={k}>{t(`admin.locations.col.${l}`)}</option>
          ))}
        </select>
        <button type="button" className="underline" onClick={() => go({ dir: query.dir === 'asc' ? 'desc' : 'asc' })}>
          {query.dir === 'asc' ? t('admin.locations.asc') : t('admin.locations.desc')}
        </button>
      </div>

      {/* Recent changes */}
      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">{t('admin.locations.recent')}</h2>
          <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {recent.map(c => (
              <li key={c.batch} className="px-4 py-3 text-sm flex flex-wrap items-center gap-2">
                <span className="text-gray-800">
                  {t('admin.locations.recentLine', {
                    status: statusLabel(c.status),
                    places: c.names.join(', ') + (c.count > c.names.length ? ` +${c.count - c.names.length}` : ''),
                  })}
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
            ))}
          </ul>
        </div>
      )}

      {/* Confirm closing an open location */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <p className="font-semibold text-gray-900 mb-2">{t('admin.locations.confirmTitle')}</p>
            <p className="text-sm text-gray-600 mb-5">
              {t('admin.locations.confirmBody', { count: confirm.openCount, status: statusLabel(confirm.status) })}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setConfirm(null)}>{t('admin.locations.cancel')}</button>
              <button type="button" className={btnDanger} disabled={busy} onClick={() => apply(confirm.ids, confirm.status)}>
                {t('admin.locations.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
