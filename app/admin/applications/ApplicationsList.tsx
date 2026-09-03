'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateApplicationStatus, updateApplicationNotes, updateCustomerApprovalStatus, updateCustomerNotes } from '@/app/admin/actions'
import {
  AdminTable,
  AdminRow,
  NameCell,
  ContactCell,
  TextCell,
  StatusPill,
  NotesPanel,
  ContactIconStack,
  btnGhost,
  btnBlue,
  btnPrimary,
} from '@/app/admin/adminTable'
import type { ApplicationStatus, UnifiedApplication } from '@/lib/types/application'

const TABS: ('all' | ApplicationStatus)[] = ['all', 'pending', 'needs_info', 'approved', 'rejected']

const CATEGORY_BADGE: Record<UnifiedApplication['category'], string> = {
  cleaner: 'bg-[#75C9C8]/15 text-[#2f7d7c]',
  customer: 'bg-[#C0B9DD]/30 text-[#655a8a]',
}

// Name / Contact / Rate / Location / Submitted / Approved / Status / (chat, email) —
// category (cleaner/customer) shows as a small pill under the name rather
// than its own column, so the grid stays the same width regardless of which
// categories are mixed in. Approve/reject/needs-info and the admin notes
// live in the row's own expand panel (the chevron AdminRow already renders)
// rather than a separate page.
const TEMPLATE = 'minmax(170px,1.3fr) minmax(140px,1fr) 78px minmax(120px,0.9fr) 88px 88px 96px 84px'

function ApplicationRow({
  app,
  onSaveNotes,
  onUpdateStatus,
}: {
  app: UnifiedApplication
  onSaveNotes: (app: UnifiedApplication, notes: string) => void
  onUpdateStatus: (app: UnifiedApplication, next: 'approved' | 'rejected' | 'needs_info') => void
}) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState(app.admin_notes ?? '')
  const [busy, setBusy] = useState(false)

  const canAct = app.status === 'pending' || app.status === 'needs_info'
  const isCleaner = app.category === 'cleaner'
  const isNew = app.cleans_completed < 5

  async function handleStatus(next: 'approved' | 'rejected' | 'needs_info') {
    setBusy(true)
    await onUpdateStatus(app, next)
    setBusy(false)
  }

  const nameCell = (
    <NameCell
      name={app.full_name}
      url={app.avatar_url}
      subtitle={
        <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${CATEGORY_BADGE[app.category]}`}>
          {t(`admin.applications.category.${app.category}`)}
        </span>
      }
    />
  )

  const cells = [
    isCleaner ? (
      <Link key="n" href={`/cleaners/${app.personId}`} className="min-w-0 block hover:opacity-80 transition-opacity">
        {nameCell}
      </Link>
    ) : (
      <div key="n" className="min-w-0">{nameCell}</div>
    ),
    <ContactCell key="c" email={app.email} phone={app.phone} />,
    app.hourly_rate != null ? (
      <span key="r" className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
        ₪{app.hourly_rate}
        {t('common.perHour')}
      </span>
    ) : (
      <span key="r" className="text-gray-300">—</span>
    ),
    <TextCell key="l">{app.address || t('admin.shared.none')}</TextCell>,
    <span key="d" className="text-sm text-gray-500 whitespace-nowrap">{app.submitted_at}</span>,
    <span key="ap" className="text-sm text-gray-500 whitespace-nowrap">{app.reviewed_at ?? t('admin.shared.none')}</span>,
    <StatusPill key="st" status={app.status} label={t(`admin.applications.status.${app.status}`)} />,
  ]

  const actions = <ContactIconStack email={app.email} />

  const expanded = (
    <div className="flex flex-col gap-4">
      {isCleaner && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('admin.cleaners.badgeLabel')}</span>
          {isNew ? (
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#80A1D4]/15 text-[#43629e]">
              {t('admin.cleaners.badgeNew')}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>
      )}

      {canAct && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => handleStatus('approved')} className={btnPrimary}>
            {t('admin.applications.approve')}
          </button>
          {isCleaner && (
            <button type="button" disabled={busy} onClick={() => handleStatus('needs_info')} className={btnBlue}>
              {t('admin.applications.needsInfo')}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => handleStatus('rejected')} className={btnGhost}>
            {t('admin.applications.reject')}
          </button>
        </div>
      )}

      <NotesPanel id={app.id} value={notes} onChange={setNotes} onSave={() => onSaveNotes(app, notes)}>
        {app.id_document_url && (
          <a
            href={app.id_document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#43629e] hover:underline"
          >
            {t('admin.applications.idDocument')}
          </a>
        )}
      </NotesPanel>
    </div>
  )

  return <AdminRow template={TEMPLATE} cells={cells} actions={actions} expanded={expanded} />
}

export function ApplicationsList({ applications: initial }: { applications: UnifiedApplication[] }) {
  const { t } = useLanguage()
  const [applications, setApplications] = useState(initial)
  const [tab, setTab] = useState<'all' | ApplicationStatus>('all')

  async function handleSaveNotes(app: UnifiedApplication, notes: string) {
    if (app.category === 'cleaner') {
      await updateApplicationNotes(app.id, notes)
    } else {
      await updateCustomerNotes(app.personId, notes)
    }
    setApplications(prev => prev.map(a => (a.id === app.id && a.category === app.category ? { ...a, admin_notes: notes } : a)))
  }

  async function handleUpdateStatus(app: UnifiedApplication, next: 'approved' | 'rejected' | 'needs_info') {
    if (app.category === 'cleaner') {
      await updateApplicationStatus(app.id, app.personId, next, app.admin_notes ?? '')
    } else if (next !== 'needs_info') {
      await updateCustomerApprovalStatus(app.personId, next, app.admin_notes ?? '')
    }
    setApplications(prev =>
      prev.map(a =>
        a.id === app.id && a.category === app.category
          ? { ...a, status: next, reviewed_at: next === 'approved' ? new Date().toLocaleDateString() : a.reviewed_at }
          : a,
      ),
    )
  }

  const filtered = tab === 'all' ? applications : applications.filter(a => a.status === tab)

  const columns = [
    { key: 'name', label: t('admin.shared.name') },
    { key: 'contact', label: t('admin.shared.contact') },
    { key: 'rate', label: t('admin.shared.rate') },
    { key: 'location', label: t('admin.shared.location') },
    { key: 'submitted', label: t('admin.applications.submitted') },
    { key: 'approved', label: t('admin.applications.approvedCol') },
    { key: 'status', label: t('admin.shared.status') },
    { key: 'actions', label: '', className: 'text-end' },
  ]

  const toolbar = (
    <div className="flex gap-2 flex-wrap">
      {TABS.map(tabKey => {
        const count = tabKey === 'all' ? applications.length : applications.filter(a => a.status === tabKey).length
        return (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`text-sm px-3 py-1.5 rounded-full font-semibold transition-colors ${
              tab === tabKey
                ? 'bg-[#75C9C8] text-white shadow-sm'
                : 'bg-white text-gray-600 ring-1 ring-[#DED9E2] hover:bg-[#F7F4EA]'
            }`}
          >
            {t(`admin.applications.tabs.${tabKey}`)} ({count})
          </button>
        )
      })}
    </div>
  )

  return (
    <AdminTable
      title={t('admin.applications.title')}
      toolbar={toolbar}
      columns={columns}
      template={TEMPLATE}
      minWidth="min-w-[960px]"
      isEmpty={filtered.length === 0}
      empty={t('admin.applications.empty')}
    >
      {filtered.map(app => (
        <ApplicationRow key={`${app.category}-${app.id}`} app={app} onSaveNotes={handleSaveNotes} onUpdateStatus={handleUpdateStatus} />
      ))}
    </AdminTable>
  )
}
