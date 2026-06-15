'use client'
import { useEffect, useState } from 'react'
import { Nav } from '../Nav'
import { CleanerListCard } from './CleanerListCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_CLEANERS } from '@/lib/mockData/cleaners'
import { applyOverrides, setNotes, removePerson } from '@/lib/mockAdminOverridesStore'
import type { CleanerResult } from '@/lib/types/cleaner'

type CleanerWithNotes = CleanerResult & { adminNotes: string }

export default function AdminCleanersPage() {
  const { t } = useLanguage()
  const [cleaners, setCleaners] = useState<CleanerWithNotes[]>(() => applyOverrides('cleaners', MOCK_CLEANERS))

  useEffect(() => {
    setCleaners(applyOverrides('cleaners', MOCK_CLEANERS))
  }, [])

  function handleSaveNotes(id: string, notes: string) {
    setNotes('cleaners', id, notes)
    setCleaners(applyOverrides('cleaners', MOCK_CLEANERS))
  }

  function handleDelete(id: string) {
    removePerson('cleaners', id)
    setCleaners(applyOverrides('cleaners', MOCK_CLEANERS))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.cleaners.title')}</h1>
        {cleaners.length === 0 && (
          <p className="text-gray-500 text-sm">{t('admin.cleaners.empty')}</p>
        )}
        {cleaners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cleaners.map(cleaner => (
              <CleanerListCard key={cleaner.id} cleaner={cleaner} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
