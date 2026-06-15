'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
  both: 'bg-yellow-100 text-yellow-800',
}

type Props = {
  cleaner: CleanerResult & { adminNotes: string }
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}

export function CleanerListCard({ cleaner, onSaveNotes, onDelete }: Props) {
  const { t } = useLanguage()
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const [notes, setNotesValue] = useState(cleaner.adminNotes)
  const [saved, setSaved] = useState(false)

  const serviceLabel =
    cleaner.service_types.includes('residential') && cleaner.service_types.includes('commercial')
      ? 'both'
      : cleaner.service_types[0] ?? 'residential'

  function handleSave() {
    onSaveNotes(cleaner.id, notes)
    setSaved(true)
  }

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) {
      onDelete(cleaner.id)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <div>
            <p className="font-bold text-gray-900">{cleaner.full_name}</p>
            <p className="text-sm text-gray-500">{t('common.yearsExp', { years: cleaner.years_experience })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
        >
          {t('admin.shared.delete')}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">📍 <span>{cleaner.area}</span></span>
      </div>

      <p className="text-sm text-gray-600 mb-1">✉️ <span>{cleaner.email}</span></p>
      <p className="text-sm text-gray-600 mb-3">📞 <span>{cleaner.phone}</span></p>

      <p className="font-bold text-gray-900 mb-3">₪{cleaner.hourly_rate}{t('common.perHour')}</p>

      <div className="border-t border-gray-100 pt-3">
        <label htmlFor={`cleaner-notes-${cleaner.id}`} className="block text-xs font-semibold text-gray-500 mb-1">
          {t('admin.shared.notes')}
        </label>
        <textarea
          id={`cleaner-notes-${cleaner.id}`}
          value={notes}
          onChange={e => {
            setNotesValue(e.target.value)
            setSaved(false)
          }}
          placeholder={t('admin.shared.notesPlaceholder')}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 text-start"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('admin.shared.save')}
          </button>
          {saved && <span className="text-sm text-green-600">{t('admin.shared.saved')}</span>}
        </div>
      </div>
    </div>
  )
}
