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
    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow">
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
          className="text-xs px-2 py-1 rounded-2xl bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
        >
          {t('admin.shared.delete')}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 inline-flex items-center gap-1">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3.5 h-3.5 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
    />
  </svg>

  <span>{cleaner.area}</span>
</span>
      </div>
{/**envelope emoji */}
      <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
    />
  </svg>

  <span>{cleaner.email}</span>
</p>
{/*phone emoji*/}
      <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
    />
  </svg>

  <span>{cleaner.phone}</span>
</p>


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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-2xl text-sm font-semibold transition-colors"
          >
            {t('admin.shared.save')}
          </button>
          {saved && <span className="text-sm text-green-600">{t('admin.shared.saved')}</span>}
        </div>
      </div>
    </div>
  )
}
