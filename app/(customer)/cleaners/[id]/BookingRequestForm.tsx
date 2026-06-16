'use client'
import { useState } from 'react'
import { createBooking } from '@/app/(customer)/actions'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8]

export function BookingRequestForm({ cleaner }: { cleaner: CleanerResult }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState(cleaner.service_types[0] ?? 'residential')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(2)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createBooking({
      cleaner_id: cleaner.id,
      service_type: serviceType,
      scheduled_date: date,
      scheduled_start: startTime,
      duration_hours: duration,
      address,
      notes: notes || undefined,
    })
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="pt-4 border-t border-gray-100 text-center">
        <p className="text-green-700 font-semibold">{t('bookingRequestForm.confirmation', { name: cleaner.full_name })}</p>
        <p className="text-sm text-gray-500 mt-1">{t('bookingRequestForm.confirmationSub')}</p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <span className="text-lg font-bold text-gray-900">₪{cleaner.hourly_rate}{t('common.perHour')}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {t('bookingRequestForm.requestBooking')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-100 flex flex-col gap-3">
      <h2 className="font-bold text-gray-900">{t('bookingRequestForm.requestABooking')}</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="serviceType" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.serviceType')}</label>
        <select id="serviceType" value={serviceType} onChange={e => setServiceType(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {cleaner.service_types.map(serviceTypeOption => (
            <option key={serviceTypeOption} value={serviceTypeOption}>{t(`common.${serviceTypeOption}`)}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="date" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.date')}</label>
          <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="startTime" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.startTime')}</label>
          <input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="duration" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.duration')}</label>
          <select id="duration" value={duration} onChange={e => setDuration(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.address')}</label>
        <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} required
          placeholder={t('bookingRequestForm.addressPlaceholder')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.notes')}</label>
        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder={t('bookingRequestForm.notesPlaceholder')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} disabled={loading}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-5 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50">
          {t('bookingRequestForm.cancel')}
        </button>
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? '...' : t('bookingRequestForm.sendRequest')}
        </button>
      </div>
    </form>
  )
}
