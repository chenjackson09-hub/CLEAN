'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateApplicationNotes } from '@/app/admin/actions'
import {
  AdminTable,
  AdminRow,
  NameCell,
  ContactCell,
  TextCell,
  StatusPill,
  NotesPanel,
  btnGhost,
} from '@/app/admin/adminTable'
import type { ApplicationStatus, CleanerApplicationResult } from '@/lib/types/application'

type App = CleanerApplicationResult & { cleaner_id: string }

const TABS: ('all' | ApplicationStatus)[] = ['all', 'pending', 'needs_info', 'approved', 'rejected']

// Name / Contact / Rate / Location / Submitted / Approved / Status / Message —
// approve/reject/needs-info moved to the cleaner's own detail page (reached by
// clicking the row) so they're immediately visible there without needing to
// scroll the table horizontally to reach a trailing actions column.
const TEMPLATE = 'minmax(180px,1.3fr) minmax(150px,1.1fr) 96px minmax(130px,1fr) 100px 100px 112px minmax(120px,auto)'

function ApplicationRow({
  app,
  onSaveNotes,
}: {
  app: App
  onSaveNotes: (id: string, notes: string) => void
}) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState(app.admin_notes ?? '')
  const [messageNote, setMessageNote] = useState(false)

  const cells = [
    <Link key="n" href={`/admin/cleaners/${app.cleaner_id}`} className="min-w-0 block hover:opacity-80 transition-opacity">
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

  const actions = (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={() => setMessageNote((o) => !o)} className={btnGhost}>
        {t('admin.shared.message')}
      </button>
      {messageNote && <p className="text-xs text-gray-400 whitespace-nowrap">{t('admin.shared.messageComingSoon')}</p>}
    </div>
  )

  const expanded = (
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
      minWidth="min-w-[1080px]"
      isEmpty={filtered.length === 0}
      empty={t('admin.applications.empty')}
    >
      {filtered.map(app => (
        <ApplicationRow key={app.id} app={app} onSaveNotes={handleSaveNotes} />
      ))}
    </AdminTable>
  )
}
