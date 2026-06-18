'use client'
import { useRouter } from 'next/navigation'
import { BookingRequestForm } from './BookingRequestForm'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

type WeeklySlot = { day_of_week: number; start_time: string; end_time: string }
type DateSlot = { date: string; start_time: string; end_time: string }

export function CleanerProfile({ cleaner, gallery = [], weeklyAvailability = [], dateAvailability = [], presetDate, presetAddress }: {
  cleaner: CleanerResult
  gallery?: string[]
  weeklyAvailability?: WeeklySlot[]
  dateAvailability?: DateSlot[]
  presetDate?: string
  presetAddress?: string
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const initial = cleaner.full_name.charAt(0).toUpperCase()

  return (
    <div className="-mx-8 -mt-2 min-h-screen">
      {/* Back button — uses browser history so filters are preserved */}
      <div className="px-6 lg:px-10 pt-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('cleanerProfile.backToSearch')}
        </button>
      </div>

      {/* Avatar + name row */}
      <div className="px-6 lg:px-10 py-6">
        <div className="flex flex-col items-center text-center gap-4 lg:flex-row lg:items-center lg:text-start lg:gap-6">
          {cleaner.avatar_url ? (
            <img
              src={cleaner.avatar_url}
              alt={cleaner.full_name}
              className="w-32 h-32 lg:w-48 lg:h-48 rounded-full object-cover shadow"
            />
          ) : (
            <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-full bg-blue-100 border-4 border-white shadow flex items-center justify-center text-blue-600 font-bold text-5xl shrink-0">
              {initial}
            </div>
          )}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{cleaner.full_name}</h1>
            {cleaner.area && (
              <p className="inline-flex items-center gap-1.5 text-gray-500 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {cleaner.area}
              </p>
            )}
            {cleaner.languages.length > 0 && (
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-2">
                {cleaner.languages.map(lang => (
                  <span key={lang} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                    </svg>
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-10 pb-10 space-y-4">
                {/* Booking form */}
        <div className="bg-white shadow-md rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {t('cleanerProfile.book').replace('{name}', cleaner.full_name)}
          </h2>
          <BookingRequestForm cleaner={cleaner} weeklyAvailability={weeklyAvailability} dateAvailability={dateAvailability} presetDate={presetDate} presetAddress={presetAddress} />
        </div>
        {/* Stats */}
        <div className="bg-white shadow-md rounded-2xl p-6">
          <div className="flex items-center justify-around text-center">
            {cleaner.years_experience != null && (
              <div>
                <p className="text-sm text-gray-500">{t('cleanerProfile.experience')}</p>
                <p className="text-base font-semibold text-gray-900">
                  {cleaner.years_experience} {cleaner.years_experience !== 1 ? t('cleanerProfile.years') : t('cleanerProfile.year')}
                </p>
              </div>
            )}
            {cleaner.distance_km > 0 && (
              <div>
                <p className="text-sm text-gray-500">{t('cleanerProfile.distance')}</p>
                <p className="text-base font-semibold text-gray-900">{cleaner.distance_km.toFixed(1)} {t('cleanerProfile.km')}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">{t('cleanerProfile.rate')}</p>
              <p className="text-base font-semibold text-gray-900">₪{cleaner.hourly_rate}{t('common.perHour')}</p>
            </div>
          </div>
        </div>

        {/* About */}
        {cleaner.bio && (
          <div className="bg-white shadow-md rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{t('cleanerProfile.about')}</h2>
            <p className="text-base text-gray-700 leading-relaxed">{cleaner.bio}</p>
          </div>
        )}

        {/* Service types */}
        {cleaner.service_types.length > 0 && (
          <div className="bg-white shadow-sm rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{t('cleanerProfile.serviceTypes')}</h2>
            <div className="flex flex-wrap gap-2">
              {cleaner.service_types.map(type => (
                <span key={type} className="bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full">
                  {t(`common.${type}`)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div className="bg-white shadow-md rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{t('cleanerProfile.gallery')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gallery.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${cleaner.full_name} ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-xl"
                />
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
  )
}
