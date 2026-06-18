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
}

type Props = {
  application: CleanerApplicationResult
  onUpdateStatus: (id: string, status: 'approved' | 'rejected') => void
}

export function ApplicationCard({ application, onUpdateStatus }: Props) {
  const { t } = useLanguage()
  const initial = application.full_name.charAt(0).toUpperCase()
  const serviceLabel =
    application.service_types.includes('residential') && application.service_types.includes('commercial')
      ? 'both'
      : application.service_types[0] ?? 'residential'

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-t-4 ${SERVICE_ACCENT[serviceLabel]} hover:shadow-lg transition-shadow`}>
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
        <span className={`text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap ${STATUS_BADGE[application.status]}`}>
          {t(`admin.applications.status.${application.status}`)}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-3 leading-relaxed">&quot;{application.bio}&quot;</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
        {application.languages.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            🌐 {application.languages.join(', ')}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-1">📍 {application.address}</p>
      <p className="text-xs text-gray-400 mb-3">{t('admin.applications.submitted')}: {application.submitted_at}</p>

      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-900">₪{application.hourly_rate}{t('common.perHour')}</span>
        {application.status === 'pending' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdateStatus(application.id, 'rejected')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('admin.applications.reject')}
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(application.id, 'approved')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {t('admin.applications.approve')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
