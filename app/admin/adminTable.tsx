'use client'
import { useState, type ReactNode } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * Shared building blocks for the admin list pages (applications / cleaners /
 * customers) so they all render the same modern "table of rows" layout.
 *
 * Palette: teal #75C9C8 (primary), blue #80A1D4, lilac #C0B9DD, pale #DED9E2,
 * cream #F7F4EA, plus gray/black/white for text.
 */

/* ---------------------------------------------------------------- buttons */

export const btnPrimary =
  'bg-[#75C9C8] hover:brightness-95 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60'
export const btnBlue =
  'bg-[#80A1D4] hover:brightness-95 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition'
export const btnGhost =
  'bg-white hover:bg-[#F7F4EA] text-gray-700 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition'
export const btnDanger =
  'bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-1.5 rounded-full text-sm font-semibold transition'

/* --------------------------------------------------------------- cells */

export function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initial = name.charAt(0).toUpperCase() || '?'
  return (
    <div className="w-10 h-10 rounded-xl ring-2 ring-white shadow-sm bg-gradient-to-br from-[#75C9C8] to-[#80A1D4] flex items-center justify-center overflow-hidden shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-white">{initial}</span>
      )}
    </div>
  )
}

export function NameCell({ name, url, subtitle }: { name: string; url?: string | null; subtitle?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={name} url={url} />
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name || '—'}</p>
        {subtitle != null && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
      </div>
    </div>
  )
}

export function ContactCell({ email, phone }: { email?: string; phone?: string }) {
  return (
    <div className="min-w-0 text-sm leading-tight">
      {email ? <p className="text-gray-700 truncate">{email}</p> : null}
      {phone ? <p className="text-gray-400 text-start" dir="ltr">{phone}</p> : null}
      {!email && !phone ? <span className="text-gray-300">—</span> : null}
    </div>
  )
}

export function TextCell({ children }: { children: ReactNode }) {
  return <span className="text-sm text-gray-600 break-words">{children}</span>
}

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-[#75C9C8]/15 text-[#2f7d7c] ring-[#75C9C8]/15 shadow-sm',
  commercial: 'bg-[#80A1D4]/15 text-[#43629e] ring-[#80A1D4]/15 shadow-sm',
  both: 'bg-[#C0B9DD]/30 text-[#655a8a] ring-[#C0B9DD]/30 shadow-sm',
}

export function serviceLabelOf(types: string[]): 'residential' | 'commercial' | 'both' {
  return types.includes('residential') && types.includes('commercial')
    ? 'both'
    : ((types[0] as 'residential' | 'commercial') ?? 'residential')
}

export function ServiceBadge({ types }: { types: string[] }) {
  const { t } = useLanguage()
  const label = serviceLabelOf(types)
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ring-1 ${SERVICE_BADGE[label]}`}>
      {t(`common.${label}`)}
    </span>
  )
}

const STATUS_PILL: Record<string, string> = {
  // Application statuses
  pending: 'bg-[#DED9E2] text-gray-700 ring-[#DED9E2]',
  needs_info: 'bg-[#80A1D4]/15 text-[#43629e] ring-[#80A1D4]/15',
  approved: 'bg-[#75C9C8]/20 text-[#2f7d7c] ring-[#75C9C8]/20',
  rejected: 'bg-red-50 text-red-600 ring-red-50',
  // Booking statuses
  accepted: 'bg-[#75C9C8]/20 text-[#2f7d7c] ring-[#75C9C8]/20',
  completed: 'bg-[#80A1D4]/15 text-[#43629e] ring-[#80A1D4]/15',
  declined: 'bg-red-100 text-red-600 ring-red-100',
  cancelled: 'bg-gray-200 text-gray-500 ring-gray-200',
  // Active/Inactive/Blocked (Cleaners/Customers/Admins filter — lib/adminUserStatus.ts)
  active: 'bg-[#75C9C8]/20 text-[#2f7d7c] ring-[#75C9C8]/20',
  inactive: 'bg-[#DED9E2] text-gray-700 ring-[#DED9E2]',
  blocked: 'bg-red-50 text-red-600 ring-red-50',
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ring-1 whitespace-nowrap ${
        STATUS_PILL[status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'
      }`}
    >
      {label}
    </span>
  )
}

/* -------------------------------------------------------- status filter */

// Shared "Active / Inactive / Blocked / All" filter dropdown used by the
// Cleaners/Customers/Admins list pages (see lib/adminUserStatus.ts for the
// classification these options filter on).
export function StatusFilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#75C9C8]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

/* --------------------------------------------------------- notes panel */

export function NotesPanel({
  id,
  value,
  onChange,
  onSave,
  children,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  children?: ReactNode
}) {
  const { t } = useLanguage()
  const [saved, setSaved] = useState(false)
  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {children}
      <label htmlFor={`notes-${id}`} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t('admin.shared.notes')}
      </label>
      <textarea
        id={`notes-${id}`}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setSaved(false)
        }}
        placeholder={t('admin.shared.notesPlaceholder')}
        rows={2}
        className="w-full text-sm rounded-lg p-2.5 text-start resize-none bg-white ring-1 ring-[#DED9E2] focus:outline-none focus:ring-2 focus:ring-[#75C9C8] transition-shadow"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onSave()
            setSaved(true)
          }}
          className={btnPrimary}
        >
          {t('admin.shared.save')}
        </button>
        {saved && <span className="text-sm text-[#2f7d7c] font-medium">{t('admin.shared.saved')}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- table */

export type AdminColumn = { key: string; label: string; className?: string }

export function AdminTable({
  title,
  count,
  toolbar,
  columns,
  template,
  minWidth = 'min-w-[820px]',
  isEmpty,
  empty,
  children,
}: {
  title: string
  count?: number
  toolbar?: ReactNode
  columns: AdminColumn[]
  template: string
  minWidth?: string
  isEmpty: boolean
  empty: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {count != null && count > 0 && (
          <span className="text-sm font-semibold text-[#2f7d7c] rounded-full px-2.5 py-0.5 tabular-nums">
            {count}
          </span>
        )}
        {toolbar && <div className="w-full sm:w-auto sm:ms-auto">{toolbar}</div>}
      </div>

      {isEmpty ? (
        <div className="rounded-2xl bg-white/70 p-12 text-center text-gray-500 text-lg">
          {empty}
        </div>
      ) : (
        <div className="rounded-2xl bg-white overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <div className={minWidth}>
              {/* Header row */}
              <div
                className="grid items-center gap-3 bg-[#F7F4EA] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                style={{ gridTemplateColumns: template }}
              >
                {columns.map(c => (
                  <div key={c.key} className={c.className}>
                    {c.label}
                  </div>
                ))}
              </div>
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminRow({
  template,
  cells,
  actions,
  expanded,
}: {
  template: string
  cells: ReactNode[]
  actions?: ReactNode
  expanded?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="grid items-center gap-3 px-4 py-3 border-b border-[#DED9E2]/60 hover:bg-[#F7F4EA]/60 transition-colors"
        style={{ gridTemplateColumns: template }}
      >
        {cells.map((c, i) => (
          <div key={i} className="min-w-0">
            {c}
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {actions}
          {expanded && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-[#F7F4EA] transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {expanded && open && (
        <div className="border-b border-[#DED9E2] bg-[#F7F4EA]/40 px-4 py-4">{expanded}</div>
      )}
    </>
  )
}
