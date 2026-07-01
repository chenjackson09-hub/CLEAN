'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AdminTable, AdminRow, NameCell, ServiceBadge, StatusPill, TextCell } from '@/app/admin/adminTable'
import type { BookingResult } from '@/lib/types/booking'

// Read-only bookings list on the shared admin "table of rows" (app/admin/adminTable.tsx).
// No row actions — rows with notes get the expand chevron (last grid track) instead.
// TEMPLATE track count must match the `columns` header.
const TEMPLATE =
  'minmax(170px,1.2fr) minmax(120px,1fr) 104px minmax(150px,1.1fr) minmax(150px,1.2fr) 116px minmax(48px,auto)'

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function BookingRow({ booking }: { booking: BookingResult }) {
  const { t } = useLanguage()

  const cells = [
    <NameCell key="cl" name={booking.cleaner_name} url={booking.cleaner_avatar_url} />,
    <TextCell key="cu">{booking.customer_name || '—'}</TextCell>,
    <ServiceBadge key="s" types={[booking.service_type]} />,
    <div key="dt" className="text-sm leading-tight">
      <p className="text-gray-700 whitespace-nowrap">{formatDate(booking.scheduled_date)}</p>
      <p className="text-gray-400 whitespace-nowrap">
        {booking.scheduled_start} · {booking.duration_hours}{' '}
        {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
      </p>
    </div>,
    <TextCell key="l">{booking.address}</TextCell>,
    <StatusPill key="st" status={booking.status} label={t(`bookingCard.status.${booking.status}`)} />,
  ]

  const expanded = booking.notes ? (
    <p className="text-sm text-gray-600 italic max-w-2xl">&quot;{booking.notes}&quot;</p>
  ) : undefined

  return <AdminRow template={TEMPLATE} cells={cells} expanded={expanded} />
}

export function BookingsList({ bookings }: { bookings: BookingResult[] }) {
  const { t } = useLanguage()

  const columns = [
    { key: 'cleaner', label: t('admin.bookings.cleaner') },
    { key: 'customer', label: t('admin.bookings.customer') },
    { key: 'service', label: t('admin.shared.service') },
    { key: 'dateTime', label: t('admin.bookings.dateTime') },
    { key: 'location', label: t('admin.shared.location') },
    { key: 'status', label: t('admin.shared.status') },
    { key: 'exp', label: '' },
  ]

  return (
    <AdminTable
      title={t('admin.bookings.title')}
      count={bookings.length}
      columns={columns}
      template={TEMPLATE}
      minWidth="min-w-[1040px]"
      isEmpty={bookings.length === 0}
      empty={t('admin.bookings.empty')}
    >
      {bookings.map(booking => (
        <BookingRow key={booking.id} booking={booking} />
      ))}
    </AdminTable>
  )
}
