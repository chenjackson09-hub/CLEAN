// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from '../Nav'
import { CustomerListCard } from './CustomerListCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_CUSTOMERS } from '@/lib/mockData/customers'
import { applyOverrides, setNotes, removePerson } from '@/lib/mockAdminOverridesStore'
import type { CustomerResult } from '@/lib/types/customer'

type CustomerWithNotes = CustomerResult & { adminNotes: string }

export default function AdminCustomersPage() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<CustomerWithNotes[]>(() => applyOverrides('customers', MOCK_CUSTOMERS))

  useEffect(() => {
    setCustomers(applyOverrides('customers', MOCK_CUSTOMERS))
  }, [])

  function handleSaveNotes(id: string, notes: string) {
    setNotes('customers', id, notes)
    setCustomers(applyOverrides('customers', MOCK_CUSTOMERS))
  }

  function handleDelete(id: string) {
    removePerson('customers', id)
    setCustomers(applyOverrides('customers', MOCK_CUSTOMERS))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />
      <div className="px-6 py-6">
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
      </div>
    </div>
  )
}
