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
  // Which card+action is mid-flight, so its button can switch color immediately
  // on press (the hard-delete on reject can take a moment to resolve).
  const [pendingAction, setPendingAction] = useState<{ id: string; status: 'approved' | 'rejected' } | null>(null)

  async function handleUpdateStatus(id: string, status: 'approved' | 'rejected') {
    const app = applications.find(a => a.id === id)
    if (!app || pendingAction) return
    setPendingAction({ id, status })
    try {
      await updateApplicationStatus(id, app.cleaner_id, status)
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    } finally {
      setPendingAction(null)
    }
  }

  // Only show cleaners still awaiting a decision; once approved/rejected the
  // card drops out of the list.
  const pending = applications.filter(a => a.status === 'pending')

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.applications.title')}</h1>
      {pending.length === 0 && (
        <p className="text-gray-500 text-sm">{t('admin.applications.empty')}</p>
      )}
      {pending.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pending.map(app => (
            <ApplicationCard
              key={app.id}
              application={app}
              onUpdateStatus={handleUpdateStatus}
              pendingStatus={pendingAction?.id === app.id ? pendingAction.status : null}
              disabled={pendingAction !== null}
            />
          ))}
        </div>
      )}
    </>
  )
}
