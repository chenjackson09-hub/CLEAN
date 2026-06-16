'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateApplicationStatus } from '@/app/admin/actions'
import { ApplicationCard } from './ApplicationCard'
import type { CleanerApplicationResult } from '@/lib/types/application'

type App = CleanerApplicationResult & { cleaner_id: string }

export function ApplicationsList({ applications: initial }: { applications: App[] }) {
  const { t } = useLanguage()
  const [applications, setApplications] = useState(initial)

  async function handleUpdateStatus(id: string, status: 'approved' | 'rejected') {
    const app = applications.find(a => a.id === id)
    if (!app) return
    await updateApplicationStatus(id, app.cleaner_id, status)
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.applications.title')}</h1>
      {applications.length === 0 && (
        <p className="text-gray-500 text-sm">{t('admin.applications.empty')}</p>
      )}
      {applications.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map(app => (
            <ApplicationCard key={app.id} application={app} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}
    </>
  )
}
