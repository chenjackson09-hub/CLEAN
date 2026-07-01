'use client'
import { Fragment, useState, type ReactNode } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StarRatingDisplay } from '@/components/StarRating'
import type { CleanerResult } from '@/lib/types/cleaner'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  commercial: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  both: 'bg-amber-50 text-amber-800 ring-amber-200',
}

type Props = {
  cleaner: CleanerResult & { adminNotes: string }
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}

export function CleanerListCard({ cleaner, onSaveNotes, onDelete }: Props) {
  const { t } = useLanguage()
  const initial = cleaner.full_name.charAt(0).toUpperCase() || '?'
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

  const dash = t('admin.shared.none')

  // The "variables" rendered as aligned label/value rows so they read like a table.
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: t('admin.shared.service'),
      value: (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ring-1 ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
      ),
    },
    {
      label: t('admin.shared.rate'),
      value: cleaner.hourly_rate > 0 ? <span className="tabular-nums">₪{cleaner.hourly_rate}</span> : dash,
    },
    { label: t('admin.shared.experience'), value: t('common.yearsExp', { years: cleaner.years_experience }) },
    { label: t('admin.shared.location'), value: cleaner.area ? <span className="break-words">{cleaner.area}</span> : dash },
    { label: t('admin.shared.email'), value: cleaner.email ? <span className="break-all">{cleaner.email}</span> : dash },
    { label: t('admin.shared.phone'), value: cleaner.phone ? <span dir="ltr" className="text-start">{cleaner.phone}</span> : dash },
  ]

  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      {/* Gradient header banner */}
      <div className="h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      {/* Delete floats on the banner */}
      <button
        type="button"
        onClick={handleDelete}
        className="absolute top-3 end-3 text-xs px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-red-600 hover:bg-white hover:text-red-700 font-semibold shadow-sm transition-colors"
      >
        {t('admin.shared.delete')}
      </button>

      <div className="px-5 pb-5 -mt-8">
        {/* Avatar overlapping the banner */}
        <div className="w-16 h-16 rounded-2xl ring-4 ring-white bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center overflow-hidden shadow-md">
          {cleaner.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cleaner.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-white text-2xl">{initial}</span>
          )}
        </div>

        {/* Name + rating */}
        <div className="mt-3">
          <p className="font-bold text-gray-900 text-lg leading-tight">{cleaner.full_name}</p>
          <StarRatingDisplay
            value={cleaner.rating_avg}
            count={cleaner.rating_count}
            size="sm"
            emptyLabel={t('admin.shared.noRating')}
            className="mt-1"
          />
        </div>

        {/* Table-like variable rows: label column + value column, aligned */}
        <dl className="mt-4 grid grid-cols-[6rem_1fr] rounded-xl ring-1 ring-gray-100 overflow-hidden text-sm">
          {rows.map((row, i) => (
            <Fragment key={row.label}>
              <dt className={`px-3 py-2 font-medium text-gray-500 text-start border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50/70' : 'bg-white'}`}>
                {row.label}
              </dt>
              <dd className={`px-3 py-2 text-gray-800 text-start border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50/70' : 'bg-white'}`}>
                {row.value}
              </dd>
            </Fragment>
          ))}
        </dl>

        {/* Admin notes */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label htmlFor={`cleaner-notes-${cleaner.id}`} className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
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
            className="w-full text-sm border border-gray-200 rounded-lg p-2.5 text-start resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              {t('admin.shared.save')}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">{t('admin.shared.saved')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
