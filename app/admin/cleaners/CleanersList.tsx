'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { deleteCleanerAdmin } from '@/app/admin/actions'
import { StarRatingDisplay } from '@/components/StarRating'
import {
  AdminTable,
  AdminRow,
  NameCell,
  ContactCell,
  TextCell,
  NotesPanel,
  StatusFilterDropdown,
  StatusPill,
  ContactIconStack,
} from '@/app/admin/adminTable'
import type { CleanerResult } from '@/lib/types/cleaner'
import type { UserStatus } from '@/lib/adminUserStatus'

type CleanerWithNotes = CleanerResult & { adminNotes: string; userStatus: UserStatus; joinedAt: string | null }

// Name / Status / Contact / Location / Rate / Rating / (chat, email, delete) —
// admin notes and the "New" badge live in the row's expand panel (the
// chevron AdminRow already renders), not a separate page.
const TEMPLATE = 'minmax(170px,1.3fr) 90px minmax(140px,1fr) minmax(120px,0.9fr) 76px 120px 120px'

function CleanerRow({
  cleaner,
  onSaveNotes,
  onDelete,
}: {
  cleaner: CleanerWithNotes
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState(cleaner.adminNotes)
  const isNew = (cleaner.cleans_completed ?? 0) < 5

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) onDelete(cleaner.id)
  }

  const statusLabel = {
    active: t('admin.shared.filterActive'),
    inactive: t('admin.shared.filterInactive'),
    blocked: t('admin.shared.filterBlocked'),
  }[cleaner.userStatus]

  const cells = [
    <Link key="n" href={`/cleaners/${cleaner.id}`} className="min-w-0 block hover:opacity-80 transition-opacity">
      <NameCell
        name={cleaner.full_name}
        url={cleaner.avatar_url}
        subtitle={cleaner.joinedAt ? t('admin.cleaners.joined', { date: cleaner.joinedAt }) : null}
      />
    </Link>,
    <StatusPill key="st" status={cleaner.userStatus} label={statusLabel} />,
    <ContactCell key="c" email={cleaner.email} phone={cleaner.phone} />,
    <TextCell key="l">{cleaner.area || t('admin.shared.none')}</TextCell>,
    cleaner.hourly_rate > 0 ? (
      <span key="r" className="text-sm font-semibold text-gray-900 tabular-nums">₪{cleaner.hourly_rate}</span>
    ) : (
      <span key="r" className="text-gray-300">—</span>
    ),
    <StarRatingDisplay
      key="rt"
      value={cleaner.rating_avg}
      count={cleaner.rating_count}
      size="sm"
      emptyLabel={t('admin.shared.noRating')}
    />,
  ]

  const actions = (
    <div className="flex items-center gap-1">
      <ContactIconStack email={cleaner.email} />
      <button
        type="button"
        onClick={handleDelete}
        aria-label={t('admin.shared.delete')}
        title={t('admin.shared.delete')}
        className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  )

  const expanded = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('admin.cleaners.badgeLabel')}</span>
        {isNew ? (
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#80A1D4]/15 text-[#43629e]">
            {t('admin.cleaners.badgeNew')}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>
      <NotesPanel id={cleaner.id} value={notes} onChange={setNotes} onSave={() => onSaveNotes(cleaner.id, notes)} />
    </div>
  )

  return <AdminRow template={TEMPLATE} cells={cells} actions={actions} expanded={expanded} />
}

export function CleanersList({ cleaners: initial }: { cleaners: CleanerWithNotes[] }) {
  const { t } = useLanguage()
  const [cleaners, setCleaners] = useState(initial)
  const [filter, setFilter] = useState<'active' | 'inactive' | 'blocked' | 'all'>('active')

  async function handleDelete(id: string) {
    await deleteCleanerAdmin(id)
    setCleaners(prev => prev.filter(c => c.id !== id))
  }

  function handleSaveNotes(id: string, notes: string) {
    setCleaners(prev => prev.map(c => (c.id === id ? { ...c, adminNotes: notes } : c)))
  }

  const filtered = useMemo(
    () => (filter === 'all' ? cleaners : cleaners.filter(c => c.userStatus === filter)),
    [cleaners, filter],
  )

  const columns = [
    { key: 'name', label: t('admin.shared.name') },
    { key: 'status', label: t('admin.shared.status') },
    { key: 'contact', label: t('admin.shared.contact') },
    { key: 'location', label: t('admin.shared.location') },
    { key: 'rate', label: t('admin.shared.rate') },
    { key: 'rating', label: t('admin.shared.rating') },
    { key: 'actions', label: '', className: 'text-end' },
  ]

  const filterOptions = [
    { value: 'active', label: t('admin.shared.filterActive') },
    { value: 'inactive', label: t('admin.shared.filterInactive') },
    { value: 'blocked', label: t('admin.shared.filterBlocked') },
    { value: 'all', label: t('admin.shared.filterAll') },
  ]

  return (
    <AdminTable
      title={t('admin.cleaners.title')}
      count={filtered.length}
      toolbar={<StatusFilterDropdown value={filter} onChange={(v) => setFilter(v as typeof filter)} options={filterOptions} />}
      columns={columns}
      template={TEMPLATE}
      minWidth="min-w-[940px]"
      isEmpty={filtered.length === 0}
      empty={t('admin.cleaners.empty')}
    >
      {filtered.map(cleaner => (
        <CleanerRow key={cleaner.id} cleaner={cleaner} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
      ))}
    </AdminTable>
  )
}
