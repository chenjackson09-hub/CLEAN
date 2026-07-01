'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { deleteCleanerAdmin } from '@/app/admin/actions'
import { StarRatingDisplay } from '@/components/StarRating'
import {
  AdminTable,
  AdminRow,
  NameCell,
  ContactCell,
  ServiceBadge,
  TextCell,
  NotesPanel,
  btnDanger,
} from '@/app/admin/adminTable'
import type { CleanerResult } from '@/lib/types/cleaner'

type CleanerWithNotes = CleanerResult & { adminNotes: string }

const TEMPLATE = 'minmax(180px,1.3fr) 96px minmax(150px,1fr) minmax(120px,1fr) 84px 132px minmax(150px,auto)'

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

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) onDelete(cleaner.id)
  }

  const cells = [
    <NameCell
      key="n"
      name={cleaner.full_name}
      url={cleaner.avatar_url}
      subtitle={t('common.yearsExp', { years: cleaner.years_experience })}
    />,
    <ServiceBadge key="s" types={cleaner.service_types} />,
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
    <button type="button" onClick={handleDelete} className={btnDanger}>
      {t('admin.shared.delete')}
    </button>
  )

  const expanded = <NotesPanel id={cleaner.id} value={notes} onChange={setNotes} onSave={() => onSaveNotes(cleaner.id, notes)} />

  return <AdminRow template={TEMPLATE} cells={cells} actions={actions} expanded={expanded} />
}

export function CleanersList({ cleaners: initial }: { cleaners: CleanerWithNotes[] }) {
  const { t } = useLanguage()
  const [cleaners, setCleaners] = useState(initial)

  async function handleDelete(id: string) {
    await deleteCleanerAdmin(id)
    setCleaners(prev => prev.filter(c => c.id !== id))
  }

  function handleSaveNotes(id: string, notes: string) {
    setCleaners(prev => prev.map(c => (c.id === id ? { ...c, adminNotes: notes } : c)))
  }

  const columns = [
    { key: 'name', label: t('admin.shared.name') },
    { key: 'service', label: t('admin.shared.service') },
    { key: 'contact', label: t('admin.shared.contact') },
    { key: 'location', label: t('admin.shared.location') },
    { key: 'rate', label: t('admin.shared.rate') },
    { key: 'rating', label: t('admin.shared.rating') },
    { key: 'actions', label: '', className: 'text-end' },
  ]

  return (
    <AdminTable
      title={t('admin.cleaners.title')}
      count={cleaners.length}
      columns={columns}
      template={TEMPLATE}
      minWidth="min-w-[940px]"
      isEmpty={cleaners.length === 0}
      empty={t('admin.cleaners.empty')}
    >
      {cleaners.map(cleaner => (
        <CleanerRow key={cleaner.id} cleaner={cleaner} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
      ))}
    </AdminTable>
  )
}
