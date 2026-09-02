'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateApplicationStatus, updateApplicationNotes } from '@/app/admin/actions'
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
import type { ApplicationStatus, CleanerApplicationResult } from '@/lib/types/application'

type App = CleanerApplicationResult & { cleaner_id: string }

const TABS: ('all' | ApplicationStatus)[] = ['all', 'pending', 'needs_info', 'approved', 'rejected']

// Name / Contact / Rate / Location / Submitted / Approved / Status / (chat, email) —
// approve/reject/needs-info and the admin notes live in the row's own
// expand panel (the chevron AdminRow already renders) rather than a
// separate page, so they're reachable without leaving the row or scrolling.
const TEMPLATE = 'minmax(170px,1.3fr) minmax(140px,1fr) 78px minmax(120px,0.9fr) 88px 88px 96px 84px'

function ApplicationRow({
  app,
  onSaveNotes,
  onUpdateStatus,
}: {
  app: App
  onSaveNotes: (id: string, notes: string) => void
  onUpdateStatus: (id: string, cleanerId: string, next: 'approved' | 'rejected' | 'needs_info') => void
}) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState(app.admin_notes ?? '')
  const [busy, setBusy] = useState(false)

  const canAct = app.status === 'pending' || app.status === 'needs_info'
  const isNew = app.cleans_completed < 5

  async function handleStatus(next: 'approved' | 'rejected' | 'needs_info') {
    setBusy(true)
    await onUpdateStatus(app.id, app.cleaner_id, next)
    setBusy(false)
  }

  const cells = [
    <Link key="n" href={`/cleaners/${app.cleaner_id}`} className="min-w-0 block hover:opacity-80 transition-opacity">
      <NameCell name={app.full_name} url={app.avatar_url} />
    </Link>,
    <ContactCell key="c" email={app.email} phone={app.phone} />,
    <span key="r" className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
      ₪{app.hourly_rate}
      {t('common.perHour')}
    </span>,
    <TextCell key="l">{app.address || t('admin.shared.none')}</TextCell>,
    <span key="d" className="text-sm text-gray-500 whitespace-nowrap">{app.submitted_at}</span>,
    <span key="ap" className="text-sm text-gray-500 whitespace-nowrap">{app.reviewed_at ?? t('admin.shared.none')}</span>,
    <StatusPill key="st" status={app.status} label={t(`admin.applications.status.${app.status}`)} />,
  ]

  const actions = <ContactIconStack email={app.email} />

  const expanded = (
    <div className="flex flex-col gap-4">
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

      {canAct && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => handleStatus('approved')} className={btnPrimary}>
            {t('admin.applications.approve')}
          </button>
          <button type="button" disabled={busy} onClick={() => handleStatus('needs_info')} className={btnBlue}>
            {t('admin.applications.needsInfo')}
          </button>
          <button type="button" disabled={busy} onClick={() => handleStatus('rejected')} className={btnGhost}>
            {t('admin.applications.reject')}
          </button>
        </div>
      )}

      <NotesPanel id={app.id} value={notes} onChange={setNotes} onSave={() => onSaveNotes(app.id, notes)}>
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

export function ApplicationsList({ applications: initial }: { applications: App[] }) {
  const { t } = useLanguage()
  const [applications, setApplications] = useState(initial)
  const [tab, setTab] = useState<'all' | ApplicationStatus>('all')

  async function handleSaveNotes(id: string, notes: string) {
    await updateApplicationNotes(id, notes)
    setApplications(prev => prev.map(a => (a.id === id ? { ...a, admin_notes: notes } : a)))
  }

  async function handleUpdateStatus(id: string, cleanerId: string, next: 'approved' | 'rejected' | 'needs_info') {
    const app = applications.find(a => a.id === id)
    await updateApplicationStatus(id, cleanerId, next, app?.admin_notes ?? '')
    setApplications(prev =>
      prev.map(a =>
        a.id === id
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
        <ApplicationRow key={app.id} app={app} onSaveNotes={handleSaveNotes} onUpdateStatus={handleUpdateStatus} />
      ))}
    </AdminTable>
  )
}
