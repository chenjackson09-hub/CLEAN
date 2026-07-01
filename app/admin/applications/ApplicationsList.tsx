'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateApplicationStatus, updateApplicationNotes } from '@/app/admin/actions'
import {
  AdminTable,
  AdminRow,
  NameCell,
  ContactCell,
  ServiceBadge,
  StatusPill,
  NotesPanel,
  btnGhost,
  btnBlue,
  btnPrimary,
} from '@/app/admin/adminTable'
import type { ApplicationStatus, CleanerApplicationResult } from '@/lib/types/application'

type App = CleanerApplicationResult & { cleaner_id: string }

const TABS: ('all' | ApplicationStatus)[] = ['all', 'pending', 'needs_info', 'approved', 'rejected']

const TEMPLATE = 'minmax(180px,1.4fr) 96px minmax(150px,1.1fr) 96px 110px 112px minmax(250px,auto)'

function ApplicationRow({
  app,
  onUpdateStatus,
  onSaveNotes,
}: {
  app: App
  onUpdateStatus: (id: string, status: ApplicationStatus, notes?: string) => void
  onSaveNotes: (id: string, notes: string) => void
}) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState(app.admin_notes ?? '')
  const canAct = app.status === 'pending' || app.status === 'needs_info'

  const cells = [
    <NameCell key="n" name={app.full_name} subtitle={t('common.yearsExp', { years: app.years_experience })} />,
    <ServiceBadge key="s" types={app.service_types} />,
    <ContactCell key="c" email={app.email} phone={app.phone} />,
    <span key="r" className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
      ₪{app.hourly_rate}
      {t('common.perHour')}
    </span>,
    <span key="d" className="text-sm text-gray-500 whitespace-nowrap">{app.submitted_at}</span>,
    <StatusPill key="st" status={app.status} label={t(`admin.applications.status.${app.status}`)} />,
  ]

  const actions = canAct ? (
    <>
      <button type="button" onClick={() => onUpdateStatus(app.id, 'rejected', notes)} className={btnGhost}>
        {t('admin.applications.reject')}
      </button>
      <button type="button" onClick={() => onUpdateStatus(app.id, 'needs_info', notes)} className={btnBlue}>
        {t('admin.applications.needsInfo')}
      </button>
      <button type="button" onClick={() => onUpdateStatus(app.id, 'approved', notes)} className={btnPrimary}>
        {t('admin.applications.approve')}
      </button>
    </>
  ) : null

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

  async function handleUpdateStatus(id: string, status: ApplicationStatus, notes?: string) {
    const app = applications.find(a => a.id === id)
    if (!app) return
    await updateApplicationStatus(id, app.cleaner_id, status as 'approved' | 'rejected' | 'needs_info', notes)
    setApplications(prev => prev.map(a => (a.id === id ? { ...a, status, admin_notes: notes ?? a.admin_notes } : a)))
  }

  async function handleSaveNotes(id: string, notes: string) {
    await updateApplicationNotes(id, notes)
    setApplications(prev => prev.map(a => (a.id === id ? { ...a, admin_notes: notes } : a)))
  }

  const filtered = tab === 'all' ? applications : applications.filter(a => a.status === tab)

  const columns = [
    { key: 'name', label: t('admin.shared.name') },
    { key: 'service', label: t('admin.shared.service') },
    { key: 'contact', label: t('admin.shared.contact') },
    { key: 'rate', label: t('admin.shared.rate') },
    { key: 'submitted', label: t('admin.applications.submitted') },
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
      minWidth="min-w-[1000px]"
      isEmpty={filtered.length === 0}
      empty={t('admin.applications.empty')}
    >
      {filtered.map(app => (
        <ApplicationRow key={app.id} app={app} onUpdateStatus={handleUpdateStatus} onSaveNotes={handleSaveNotes} />
      ))}
    </AdminTable>
  )
}
