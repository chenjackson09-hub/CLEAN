import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { ApplicationStatus, CleanerApplicationResult } from '@/lib/types/application'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
  both: 'bg-yellow-100 text-yellow-800',
}

const SERVICE_ACCENT: Record<string, string> = {
  residential: 'border-t-indigo-400',
  commercial: 'border-t-green-400',
  both: 'border-t-yellow-400',
}

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  needs_info: 'bg-blue-100 text-blue-700',
}

type Props = {
  application: CleanerApplicationResult
  onUpdateStatus: (id: string, status: ApplicationStatus, notes?: string) => void
  onSaveNotes: (id: string, notes: string) => void
}

export function ApplicationCard({ application, onUpdateStatus, onSaveNotes }: Props) {
  const { t } = useLanguage()
  const initial = application.full_name.charAt(0).toUpperCase()
  const [notes, setNotes] = useState(application.admin_notes ?? '')
  const [saved, setSaved] = useState(false)

  function handleSaveNotes() {
    onSaveNotes(application.id, notes)
    setSaved(true)
  }
  const serviceLabel =
    application.service_types.includes('residential') && application.service_types.includes('commercial')
      ? 'both'
      : application.service_types[0] ?? 'residential'

  return (

   <div className={`p-4 shadow-sm grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 hover:bg-gray-100`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <div>
            
            <p className="font-bold text-gray-900">{application.full_name}</p>
            <p className="text-sm text-gray-500">
              {t('common.yearsExp', { years: application.years_experience })}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_BADGE[application.status]}`}>
          {t(`admin.applications.status.${application.status}`)}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-3 leading-relaxed">&quot;{application.bio}&quot;</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
        {application.languages.length > 0 && (
<span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 flex items-center gap-1">


  {application.languages.join(', ')}
</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">


  <span>{application.address}</span>
</p>
      {application.id_document_url && (
        <a
          href={application.id_document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:underline mb-1 inline-block"
        >
          {t('admin.applications.idDocument')}
        </a>
      )}
      <p className="text-sm text-gray-400 mb-3">{t('admin.applications.submitted')}: {application.submitted_at}</p>

      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-900">₪{application.hourly_rate}{t('common.perHour')}</span>
        {(application.status === 'pending' || application.status === 'needs_info') && (
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => onUpdateStatus(application.id, 'rejected', notes)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('admin.applications.reject')}
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(application.id, 'needs_info', notes)}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('admin.applications.needsInfo')}
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(application.id, 'approved', notes)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('admin.applications.approve')}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 mt-3 pt-3">
        <label htmlFor={`app-notes-${application.id}`} className="block text-xs font-semibold text-gray-500 mb-1">
          {t('admin.shared.notes')}
        </label>
        <textarea
          id={`app-notes-${application.id}`}
          value={notes}
          onChange={e => { setNotes(e.target.value); setSaved(false) }}
          placeholder={t('admin.shared.notesPlaceholder')}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 text-start"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSaveNotes}
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
