'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useRouter } from 'next/navigation'
import { updateApplicationStatus, updateApplicationNotes } from '@/app/admin/actions'
import { Avatar, StatusPill, NotesPanel, btnGhost, btnBlue, btnPrimary } from '@/app/admin/adminTable'
import { StarRatingDisplay } from '@/components/StarRating'
import type { ApplicationStatus } from '@/lib/types/application'

type Application = {
  id: string
  status: ApplicationStatus
  submittedAt: string | null
  reviewedAt: string | null
  idDocumentUrl: string | null
  adminNotes: string | null
}

export function AdminCleanerProfile({
  cleanerId,
  fullName,
  avatarUrl,
  email,
  phone,
  hourlyRate,
  ratingAvg,
  ratingCount,
  cleansCompleted,
  cleanerStatus,
  address,
  application,
}: {
  cleanerId: string
  fullName: string
  avatarUrl: string | null
  email: string
  phone: string
  hourlyRate: number
  ratingAvg: number | null
  ratingCount: number
  cleansCompleted: number
  cleanerStatus: string
  address: string
  application: Application | null
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [status, setStatus] = useState(application?.status ?? null)
  const [notes, setNotes] = useState(application?.adminNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [messageNote, setMessageNote] = useState(false)

  const dateLocale = lang === 'he' ? 'he-IL' : 'en-US'
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(dateLocale)

  const canAct = status === 'pending' || status === 'needs_info'
  const isNew = cleansCompleted < 5

  async function handleUpdateStatus(next: 'approved' | 'rejected' | 'needs_info') {
    if (!application) return
    setBusy(true)
    await updateApplicationStatus(application.id, cleanerId, next, notes)
    setStatus(next)
    setBusy(false)
    router.refresh()
  }

  async function handleSaveNotes() {
    if (!application) return
    await updateApplicationNotes(application.id, notes)
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Link href="/admin/cleaners" className="text-sm text-gray-500 hover:text-gray-800 w-fit">
        ← {t('admin.cleaners.title')}
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={fullName} url={avatarUrl} />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{fullName || '—'}</h1>
              {cleanerStatus === 'approved' && application?.reviewedAt && (
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.cleaners.joined', { date: fmt(application.reviewedAt) })}</p>
              )}
              {cleanerStatus !== 'approved' && application?.submittedAt && (
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.cleaners.applied', { date: fmt(application.submittedAt) })}</p>
              )}
              <div className="mt-1">
                <StarRatingDisplay value={ratingAvg} count={ratingCount} size="sm" emptyLabel={t('admin.shared.noRating')} />
              </div>
            </div>
          </div>
          <StatusPill status={cleanerStatus} label={t(`admin.applications.status.${cleanerStatus}`)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">{t('admin.cleaners.badgeLabel')}</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">
              {isNew ? (
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#80A1D4]/15 text-[#43629e]">
                  {t('admin.cleaners.badgeNew')}
                </span>
              ) : (
                '—'
              )}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">{t('admin.shared.email')}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 break-all">{email || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">{t('admin.shared.phone')}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5" dir="ltr">{phone || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">{t('admin.shared.rate')}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{hourlyRate > 0 ? `₪${hourlyRate}` : '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">{t('admin.shared.location')}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{address || '—'}</p>
          </div>
        </div>

        {application?.idDocumentUrl && (
          <a
            href={application.idDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm text-[#43629e] hover:underline"
          >
            {t('admin.applications.idDocument')}
          </a>
        )}
      </div>

      {application && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <NotesPanel id={application.id} value={notes} onChange={setNotes} onSave={handleSaveNotes} />
        </div>
      )}

      {canAct && (
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => handleUpdateStatus('approved')} className={btnPrimary}>
            {t('admin.applications.approve')}
          </button>
          <button type="button" disabled={busy} onClick={() => handleUpdateStatus('needs_info')} className={btnBlue}>
            {t('admin.applications.needsInfo')}
          </button>
          <button type="button" disabled={busy} onClick={() => handleUpdateStatus('rejected')} className={btnGhost}>
            {t('admin.applications.reject')}
          </button>
        </div>
      )}

      <div>
        <button type="button" onClick={() => setMessageNote(true)} className={btnGhost}>
          {t('admin.shared.message')}
        </button>
        {messageNote && <p className="text-sm text-gray-400 mt-2">{t('admin.shared.messageComingSoon')}</p>}
      </div>
    </div>
  )
}
