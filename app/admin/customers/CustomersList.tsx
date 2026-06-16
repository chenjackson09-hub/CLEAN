'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { deleteCustomerAdmin } from '@/app/admin/actions'
import { CustomerListCard } from './CustomerListCard'
import type { CustomerResult } from '@/lib/types/customer'

type CustomerWithNotes = CustomerResult & { adminNotes: string }

export function CustomersList({ customers: initial }: { customers: CustomerWithNotes[] }) {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState(initial)

  async function handleDelete(id: string) {
    await deleteCustomerAdmin(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  function handleSaveNotes(id: string, notes: string) {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, adminNotes: notes } : c))
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.customers.title')}</h1>
      {customers.length === 0 && (
        <p className="text-gray-500 text-sm">{t('admin.customers.empty')}</p>
      )}
      {customers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map(customer => (
            <CustomerListCard key={customer.id} customer={customer} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  )
}
