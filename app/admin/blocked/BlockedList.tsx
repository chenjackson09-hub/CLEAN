'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { unblockUser } from '@/app/admin/actions'
import { AdminTable, AdminRow, NameCell, btnGhost } from '@/app/admin/adminTable'

export type BlockedUser = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  reason: string
  blocked_at: string
}

const TEMPLATE = 'minmax(150px,1.2fr) minmax(180px,1.4fr) 130px 104px 104px 110px minmax(120px,auto)'

const ROLE_PILL: Record<string, string> = {
  cleaner: 'bg-[#75C9C8]/15 text-[#2f7d7c] ring-[#75C9C8]/40',
  customer: 'bg-[#80A1D4]/15 text-[#43629e] ring-[#80A1D4]/40',
}
const REASON_PILL: Record<string, string> = {
  deleted: 'bg-[#DED9E2] text-gray-700 ring-[#C0B9DD]',
  rejected: 'bg-red-50 text-red-600 ring-red-200',
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ring-1 whitespace-nowrap ${className}`}>
      {children}
    </span>
  )
}

function BlockedRow({ user, onUnblock }: { user: BlockedUser; onUnblock: (id: string) => void }) {
  const { t } = useLanguage()

  function handleUnblock() {
    if (window.confirm(t('admin.blocked.confirmUnblock'))) onUnblock(user.id)
  }

  const cells = [
    <NameCell key="n" name={user.name} />,
    <span key="e" className="text-sm text-gray-700 break-all">{user.email || '—'}</span>,
    <span key="p" className="text-sm text-gray-500 text-start" dir="ltr">{user.phone || '—'}</span>,
    user.role ? (
      <Pill key="ro" className={ROLE_PILL[user.role] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}>
        {t(`admin.blocked.role.${user.role}`)}
      </Pill>
    ) : (
      <span key="ro" className="text-gray-300">—</span>
    ),
    user.reason ? (
      <Pill key="rs" className={REASON_PILL[user.reason] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}>
        {t(`admin.blocked.reason.${user.reason}`)}
      </Pill>
    ) : (
      <span key="rs" className="text-gray-300">—</span>
    ),
    <span key="d" className="text-sm text-gray-500 whitespace-nowrap">{user.blocked_at}</span>,
  ]

  const actions = (
    <button type="button" onClick={handleUnblock} className={btnGhost}>
      {t('admin.blocked.unblock')}
    </button>
  )

  return <AdminRow template={TEMPLATE} cells={cells} actions={actions} />
}

export function BlockedList({ blocked: initial }: { blocked: BlockedUser[] }) {
  const { t } = useLanguage()
  const [blocked, setBlocked] = useState(initial)

  async function handleUnblock(id: string) {
    await unblockUser(id)
    setBlocked(prev => prev.filter(b => b.id !== id))
  }

  const columns = [
    { key: 'name', label: t('admin.shared.name') },
    { key: 'email', label: t('admin.shared.email') },
    { key: 'phone', label: t('admin.shared.phone') },
    { key: 'role', label: t('admin.blocked.roleCol') },
    { key: 'reason', label: t('admin.blocked.reasonCol') },
    { key: 'when', label: t('admin.blocked.when') },
    { key: 'actions', label: '', className: 'text-end' },
  ]

  return (
    <AdminTable
      title={t('admin.blocked.title')}
      count={blocked.length}
      columns={columns}
      template={TEMPLATE}
      minWidth="min-w-[960px]"
      isEmpty={blocked.length === 0}
      empty={t('admin.blocked.empty')}
    >
      {blocked.map(user => (
        <BlockedRow key={user.id} user={user} onUnblock={handleUnblock} />
      ))}
    </AdminTable>
  )
}
