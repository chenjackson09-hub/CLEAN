// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from '../Nav'
import { ApplicationCard } from './ApplicationCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_APPLICATIONS } from '@/lib/mockData/applications'
import { getAllApplications, updateApplicationStatus } from '@/lib/mockApplicationsStore'
import type { CleanerApplicationResult } from '@/lib/types/application'

export default function ApplicationsPage() {
  const { t } = useLanguage()
  const [applications, setApplications] = useState<CleanerApplicationResult[]>(MOCK_APPLICATIONS)

  useEffect(() => {
    setApplications(getAllApplications())
  }, [])

  function handleUpdateStatus(id: string, status: 'approved' | 'rejected') {
    updateApplicationStatus(id, status)
    setApplications(getAllApplications())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.applications.title')}</h1>

        {applications.length === 0 && (
          <p className="text-gray-500 text-sm">{t('admin.applications.empty')}</p>
        )}

        {applications.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map(application => (
              <ApplicationCard key={application.id} application={application} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
