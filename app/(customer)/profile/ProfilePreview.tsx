'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StarRatingDisplay } from '@/components/StarRating'
import { languageShort } from '@/lib/languages'

// The subset of customer data a cleaner actually sees when they open this
// person's profile (mirrors /cleaner/customers/[id]), minus the per-cleaner
// booking history which doesn't apply to a self-preview.
type PreviewData = {
  full_name: string
  avatar_url: string | null
  bio: string
  languages: string[]
  rating_avg: number | null
  rating_count: number
  cleans_completed: number
  num_rooms: number | null
  pet_types: ('dog' | 'cat' | 'other')[]
  num_pets: number | null
  num_kids_under_15: number | null
  num_people: number | null
  house_size_sqm: number | null
  dwelling_type: 'apartment' | 'house' | null
  floor: number | null
}

// Read-only "how cleaners see you" view. The customer lands here from the
// nav's Profile button; the Edit button jumps to the editable form at
// /profile/edit. Kept a client component so labels follow the language toggle.
export function ProfilePreview({ data }: { data: PreviewData }) {
  const { t } = useLanguage()

  // Pets summary, e.g. "Dog & Cat (2)" — same shape the cleaner-facing page builds.
  const petLabel = data.pet_types.length
    ? data.pet_types.map((p) => t(`profile.${p}`)).join(' & ') +
      (data.num_pets ? ` (${data.num_pets})` : '')
    : null

  // Household rows, dropping anything the customer left blank so the preview
  // shows exactly what a cleaner would see (nothing more, nothing less).
  const household: { label: string; value: string }[] = [
    {
      label: t('profile.propertyType'),
      value:
        data.dwelling_type === 'apartment'
          ? `${t('profile.apartment')}${data.floor != null ? `, ${t('profile.floor')} ${data.floor}` : ''}`
          : data.dwelling_type === 'house'
          ? t('profile.house')
          : '',
    },
    { label: t('profile.rooms'), value: data.num_rooms != null ? String(data.num_rooms) : '' },
    { label: t('profile.houseSize'), value: data.house_size_sqm != null ? `${data.house_size_sqm} m²` : '' },
    { label: t('profile.peopleLivingHere'), value: data.num_people != null ? String(data.num_people) : '' },
    { label: t('profile.kidsUnder15'), value: data.num_kids_under_15 != null ? String(data.num_kids_under_15) : '' },
    { label: t('profile.totalPets'), value: petLabel ?? '' },
  ].filter((f) => f.value !== '')

  const initial = data.full_name?.charAt(0)?.toUpperCase() || '?'
  const cleans = data.cleans_completed

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Title row — Edit sits inline with the title (mirrors the edit page's
          Save-on-title-row layout) and navigates to the editable form. */}
      <div className="flex items-center justify-between py-3 gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('profile.previewSubtitle')}</p>
        </div>
        <Link
          href="/profile/edit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors shrink-0 shadow-sm"
        >
          {t('profile.editProfile')}
        </Link>
      </div>

      {/* Profile header card — the read-only version of the edit page's header. */}
      <div className="bg-white rounded-2xl shadow-xl p-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center font-bold text-2xl text-blue-700 overflow-hidden shrink-0">
            {data.avatar_url ? (
              <img src={data.avatar_url} alt={data.full_name} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">{data.full_name || t('profile.yourName')}</p>
            <StarRatingDisplay
              value={data.rating_avg}
              count={data.rating_count}
              size="sm"
              emptyLabel={t('profile.noRatings')}
              className="mt-1"
            />
            {cleans > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {t(cleans === 1 ? 'profile.cleanCompletedOne' : 'profile.cleansCompletedMany', { count: cleans })}
              </p>
            )}
          </div>
        </div>
        {data.bio && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">{t('profile.aboutMe')}</p>
            <p className="text-base text-gray-700 whitespace-pre-line">{data.bio}</p>
          </div>
        )}
        {/* Languages — short codes, normalizing any legacy value. */}
        {data.languages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">{t('profile.languages')}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.languages.map((l) => (
                <span key={l} className="inline-flex items-center bg-gray-100 text-gray-700 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {languageShort(l)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Household details — same grid the cleaner-facing profile renders. */}
      {household.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('profile.householdTitle')}
          </h2>
          <div className="bg-white rounded-2xl shadow-xl p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {household.map((f) => (
              <div key={f.label}>
                <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">{f.label}</p>
                {/* break-words so a long value wraps inside its cell instead of
                    overflowing and pushing the grid out of alignment. */}
                <p className="text-base font-semibold text-gray-900 break-words">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nothing filled in yet — nudge the customer toward the edit form. */}
      {!data.bio && data.languages.length === 0 && household.length === 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center text-gray-400 text-sm">
          {t('profile.previewEmpty')}
        </div>
      )}
    </div>
  )
}
