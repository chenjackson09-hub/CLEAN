'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateApplicationStatus, updateApplicationNotes } from '@/app/admin/actions'
import { ApplicationCard } from './ApplicationCard'
import type { ApplicationStatus, CleanerApplicationResult } from '@/lib/types/application'

type App = CleanerApplicationResult & { cleaner_id: string }

const TABS: ('all' | ApplicationStatus)[] = ['all', 'pending', 'needs_info', 'approved', 'rejected']

export function ApplicationsList({ applications: initial }: { applications: App[] }) {
  const { t } = useLanguage()
  const [applications, setApplications] = useState(initial)
  const [tab, setTab] = useState<'all' | ApplicationStatus>('all')

  async function handleUpdateStatus(id: string, status: ApplicationStatus, notes?: string) {
    const app = applications.find(a => a.id === id)
    if (!app) return
    await updateApplicationStatus(id, app.cleaner_id, status as 'approved' | 'rejected' | 'needs_info', notes)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status, admin_notes: notes ?? a.admin_notes } : a))
  }

  async function handleSaveNotes(id: string, notes: string) {
    await updateApplicationNotes(id, notes)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, admin_notes: notes } : a))
  }

  const filtered = tab === 'all' ? applications : applications.filter(a => a.status === tab)

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.applications.title')}</h1>

      <div className="flex gap-2 flex-wrap mb-4">
        {TABS.map(tabKey => {
          const count = tabKey === 'all' ? applications.length : applications.filter(a => a.status === tabKey).length
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className={`text-sm px-3 py-1.5 rounded-full font-semibold transition-colors ${
                tab === tabKey ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-md'
              }`}
            >
              {t(`admin.applications.tabs.${tabKey}`)} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm">{t('admin.applications.empty')}</p>
      )}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 rounded-3xl bg-white">
          {filtered.map(app => (
            
            <ApplicationCard key={app.id} application={app} onUpdateStatus={handleUpdateStatus} onSaveNotes={handleSaveNotes} />
          ))}
        </div>
      )}
    </>
  )
}
