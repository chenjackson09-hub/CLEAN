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
  btnGhost,
  btnDanger,
} from '@/app/admin/adminTable'
import type { CleanerResult } from '@/lib/types/cleaner'
import type { UserStatus } from '@/lib/adminUserStatus'

type CleanerWithNotes = CleanerResult & { adminNotes: string; userStatus: UserStatus; joinedAt: string | null }

// Name / Status / Contact / Location / Rate / Rating / (Message, Delete) — see
// app/admin/adminTable.tsx for the shared "table of rows" this feeds.
const TEMPLATE = 'minmax(180px,1.3fr) 96px minmax(150px,1fr) minmax(120px,1fr) 84px 132px minmax(190px,auto)'

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
  const [messageNote, setMessageNote] = useState(false)

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) onDelete(cleaner.id)
  }

  const statusLabel = {
    active: t('admin.shared.filterActive'),
    inactive: t('admin.shared.filterInactive'),
    blocked: t('admin.shared.filterBlocked'),
  }[cleaner.userStatus]

  const cells = [
    <Link key="n" href={`/admin/cleaners/${cleaner.id}`} className="min-w-0 block hover:opacity-80 transition-opacity">
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
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setMessageNote((o) => !o)} className={btnGhost}>
          {t('admin.shared.message')}
        </button>
        <button type="button" onClick={handleDelete} className={btnDanger}>
          {t('admin.shared.delete')}
        </button>
      </div>
      {messageNote && <p className="text-xs text-gray-400 whitespace-nowrap">{t('admin.shared.messageComingSoon')}</p>}
    </div>
  )

  const expanded = <NotesPanel id={cleaner.id} value={notes} onChange={setNotes} onSave={() => onSaveNotes(cleaner.id, notes)} />

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
      minWidth="min-w-[980px]"
      isEmpty={filtered.length === 0}
      empty={t('admin.cleaners.empty')}
    >
      {filtered.map(cleaner => (
        <CleanerRow key={cleaner.id} cleaner={cleaner} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
      ))}
    </AdminTable>
  )
}
