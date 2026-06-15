'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CustomerResult } from '@/lib/types/customer'

type Props = {
  customer: CustomerResult & { adminNotes: string }
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}

export function CustomerListCard({ customer, onSaveNotes, onDelete }: Props) {
  const { t } = useLanguage()
  const initial = customer.full_name.charAt(0).toUpperCase()
  const [notes, setNotesValue] = useState(customer.adminNotes)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    onSaveNotes(customer.id, notes)
    setSaved(true)
  }

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) {
      onDelete(customer.id)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <p className="font-bold text-gray-900">{customer.full_name}</p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
        >
          {t('admin.shared.delete')}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-1">✉️ <span>{customer.email}</span></p>
      <p className="text-sm text-gray-600 mb-1">📞 <span>{customer.phone}</span></p>
      <p className="text-sm text-gray-600 mb-3">📍 <span>{customer.address}</span></p>

      <div className="border-t border-gray-100 pt-3">
        <label htmlFor={`customer-notes-${customer.id}`} className="block text-xs font-semibold text-gray-500 mb-1">
          {t('admin.shared.notes')}
        </label>
        <textarea
          id={`customer-notes-${customer.id}`}
          value={notes}
          onChange={e => {
            setNotesValue(e.target.value)
            setSaved(false)
          }}
          placeholder={t('admin.shared.notesPlaceholder')}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 text-start"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('admin.shared.save')}
          </button>
          {saved && <span className="text-sm text-green-600">{t('admin.shared.saved')}</span>}
        </div>
      </div>
    </div>
  )
}
