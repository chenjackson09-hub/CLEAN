'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { deleteCleanerAdmin } from '@/app/admin/actions'
import { CleanerListCard } from './CleanerListCard'
import type { CleanerResult } from '@/lib/types/cleaner'

type CleanerWithNotes = CleanerResult & { adminNotes: string }

export function CleanersList({ cleaners: initial }: { cleaners: CleanerWithNotes[] }) {
  const { t } = useLanguage()
  const [cleaners, setCleaners] = useState(initial)

  async function handleDelete(id: string) {
    await deleteCleanerAdmin(id)
    setCleaners(prev => prev.filter(c => c.id !== id))
  }

  function handleSaveNotes(id: string, notes: string) {
    setCleaners(prev => prev.map(c => c.id === id ? { ...c, adminNotes: notes } : c))
  }

  return (
    <>
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
    </>
  )
}
