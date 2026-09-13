'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// A fixed, small palette — stored as a plain hex string on the booking
// (clean_group_color) rather than a Tailwind class name, since a dynamic
// class name can't be generated at runtime; inline style handles the swatch.
const COLORS = ['#EF4444', '#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']

export type GroupBooking = {
  id: string
  scheduled_date: string
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
}

// Renders above the browse calendar. Two states, driven by the `cleanGroup`/
// `cleanColor` URL params (so the "add a clean" session survives every
// search navigation the same way the rest of browse's state already does):
//   - no active group: a "+ Add clean" button that expands into a color
//     picker + instructions, and starting one stamps a fresh client-generated
//     group id into the URL.
//   - active group: a colored progress banner listing the days requested so
//     far for this need (fetched server-side by page.tsx from
//     clean_group_id) and a "Done" button that clears the group.
export function AddCleanPanel({
  cleanGroupId,
  cleanGroupColor,
  groupBookings,
}: {
  cleanGroupId?: string
  cleanGroupColor?: string
  groupBookings?: GroupBooking[]
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [picking, setPicking] = useState(false)
  const [color, setColor] = useState(COLORS[0])

  function startClean() {
    const id = crypto.randomUUID()
    router.push(`/browse?cleanGroup=${id}&cleanColor=${encodeURIComponent(color)}`)
    setPicking(false)
  }

  function finishClean() {
    router.push('/browse')
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      lang === 'he' ? 'he-IL' : 'en-US',
      { month: 'short', day: 'numeric' }
    )
  }

  const statusLabel: Record<GroupBooking['status'], string> = {
    pending: t('browse.addCleanStatusPending'),
    accepted: t('browse.addCleanStatusAccepted'),
    declined: t('browse.addCleanStatusDeclined'),
    cancelled: t('browse.addCleanStatusCancelled'),
    completed: t('browse.addCleanStatusAccepted'),
  }
  const statusColor: Record<GroupBooking['status'], string> = {
    pending: 'text-amber-600',
    accepted: 'text-green-600',
    declined: 'text-gray-400',
    cancelled: 'text-gray-400',
    completed: 'text-green-600',
  }

  if (cleanGroupId) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border-s-4" style={{ borderColor: cleanGroupColor ?? COLORS[0] }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cleanGroupColor ?? COLORS[0] }} />
            <span className="font-semibold text-gray-900">{t('browse.addCleanInProgress')}</span>
          </div>
          <button type="button" onClick={finishClean} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            {t('browse.addCleanDone')}
          </button>
        </div>
        {groupBookings && groupBookings.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1.5">
              {t('browse.addCleanDaysRequested', { n: String(groupBookings.length) })}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groupBookings.map(b => (
                <span key={b.id} className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-50 ${statusColor[b.status]}`}>
                  {formatDate(b.scheduled_date)} · {statusLabel[b.status]}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">{t('browse.addCleanAddAnother')}</p>
      </div>
    )
  }

  if (!picking) {
    return (
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="w-full mb-4 border border-dashed border-gray-300 rounded-2xl py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
      >
        {t('browse.addClean')}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-col gap-3">
      <h2 className="font-bold text-gray-900">{t('browse.addCleanTitle')}</h2>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('browse.addCleanPickColor')}</p>
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-105' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-600">{t('browse.addCleanInstructions')}</p>
      <p className="text-sm text-gray-600">{t('browse.addCleanInstructions2')}</p>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setPicking(false)} className="text-sm font-semibold text-gray-500 px-3 py-1.5">
          {t('browse.addCleanCancel')}
        </button>
        <button type="button" onClick={startClean} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
          {t('browse.addCleanStart')}
        </button>
      </div>
    </div>
  )
}
