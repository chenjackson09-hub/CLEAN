'use client'
import { useMemo, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { deleteCustomerAdmin } from '@/app/admin/actions'
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
  btnDanger,
} from '@/app/admin/adminTable'
import type { CustomerResult } from '@/lib/types/customer'
import type { UserStatus } from '@/lib/adminUserStatus'

type CustomerWithNotes = CustomerResult & { adminNotes: string; userStatus: UserStatus; isPhantomBlocked: boolean }

// Customers rendered as the shared admin "table of rows" (see app/admin/adminTable.tsx).
// TEMPLATE must have the same track count as the `columns` header; last track = actions.
const TEMPLATE = 'minmax(180px,1.3fr) 90px minmax(160px,1.2fr) minmax(150px,1.2fr) 140px minmax(150px,auto)'

function CustomerRow({
  customer,
  onSaveNotes,
  onDelete,
}: {
  customer: CustomerWithNotes
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useLanguage()
  const [notes, setNotes] = useState(customer.adminNotes)

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) onDelete(customer.id)
  }

  const statusLabel = {
    active: t('admin.shared.filterActive'),
    inactive: t('admin.shared.filterInactive'),
    blocked: t('admin.shared.filterBlocked'),
  }[customer.userStatus]

  const cells = [
    <NameCell key="n" name={customer.full_name} />,
    <StatusPill key="st" status={customer.userStatus} label={statusLabel} />,
    <ContactCell key="c" email={customer.email} phone={customer.phone} />,
    <TextCell key="l">{customer.address || t('admin.shared.none')}</TextCell>,
    <StarRatingDisplay
      key="rt"
      value={customer.rating_avg}
      count={customer.rating_count}
      size="sm"
      emptyLabel={t('admin.shared.noRating')}
    />,
  ]

  // A blocked customer is a snapshot only — the real account is already
  // deleted, so there's nothing left here to delete or annotate.
  const actions = customer.isPhantomBlocked ? null : (
    <button type="button" onClick={handleDelete} className={btnDanger}>
      {t('admin.shared.delete')}
    </button>
  )

  const expanded = customer.isPhantomBlocked
    ? undefined
    : <NotesPanel id={customer.id} value={notes} onChange={setNotes} onSave={() => onSaveNotes(customer.id, notes)} />

  return <AdminRow template={TEMPLATE} cells={cells} actions={actions} expanded={expanded} />
}

export function CustomersList({ customers: initial }: { customers: CustomerWithNotes[] }) {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState(initial)
  const [filter, setFilter] = useState<'active' | 'inactive' | 'blocked' | 'all'>('active')

  async function handleDelete(id: string) {
    await deleteCustomerAdmin(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  function handleSaveNotes(id: string, notes: string) {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, adminNotes: notes } : c)))
  }

  const filtered = useMemo(
    () => (filter === 'all' ? customers : customers.filter(c => c.userStatus === filter)),
    [customers, filter],
  )

  const columns = [
    { key: 'name', label: t('admin.shared.name') },
    { key: 'status', label: t('admin.shared.status') },
    { key: 'contact', label: t('admin.shared.contact') },
    { key: 'location', label: t('admin.shared.location') },
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
      title={t('admin.customers.title')}
      count={filtered.length}
      toolbar={<StatusFilterDropdown value={filter} onChange={(v) => setFilter(v as typeof filter)} options={filterOptions} />}
      columns={columns}
      template={TEMPLATE}
      minWidth="min-w-[860px]"
      isEmpty={filtered.length === 0}
      empty={t('admin.customers.empty')}
    >
      {filtered.map(customer => (
        <CustomerRow key={customer.id} customer={customer} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
      ))}
    </AdminTable>
  )
}
