'use client'
import { useState } from 'react'
import { createBooking } from '@/app/(customer)/actions'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

type WeeklySlot = { day_of_week: number; start_time: string; end_time: string }
type DateSlot = { date: string; start_time: string; end_time: string }

const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const minToTime = (n: number) =>
  `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`

export function BookingRequestForm({
  cleaner,
  weeklyAvailability = [],
  dateAvailability = [],
  presetDate,
  presetAddress,
  presetDuration,
  presetAvailFrom,
  presetAvailTo,
  defaultOpen = false,
  onCancel,
  disabled = false,
}: {
  cleaner: CleanerResult
  weeklyAvailability?: WeeklySlot[]
  dateAvailability?: DateSlot[]
  presetDate?: string
  presetAddress?: string
  // The availability window the customer chose in browse search — pre-fills the
  // "When are you available?" slider so the cleaner learns the wider window.
  presetAvailFrom?: string
  presetAvailTo?: string
  // When the customer arrived from a browse search that specified a duration, the
  // booking form's (still editable) duration field is pre-selected to it. A search
  // with no/"Not sure" duration leaves this undefined and the field defaults to
  // "Not sure".
  presetDuration?: number
  // When embedded (e.g. in the browse "Schedule a clean" modal) the form starts
  // expanded and Cancel is delegated to the host (closes the modal) instead of
  // collapsing back to the inline price + button state.
  defaultOpen?: boolean
  onCancel?: () => void
  // Non-interactive mode for the cleaner's own profile preview: shows the same
  // collapsed price + button, but the button can't expand the form.
  disabled?: boolean
}) {
  const { t, lang } = useLanguage()
  // The cleaner's accepted duration ceiling. max defaults to 8 when unset, and
  // the duration options are capped to it so the customer can't request more
  // hours than the cleaner will take. min_hours is informational only (shown
  // on the cleaner's profile as their stated standard) and no longer bounds
  // what can be requested here. See migration 0013.
  const maxHours = Math.min(8, cleaner.max_hours ?? 8)
  // The flexible ("Not sure") default, kept inside the cleaner's ceiling.
  const flexibleHours = Math.min(2, maxHours)
  const [open, setOpen] = useState(defaultOpen)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState(cleaner.service_types[0] ?? 'residential')
  // When the customer arrived from a date-grouped search result, the date is
  // fixed to the day the cleaner was matched under — they don't pick it again.
  const [date, setDate] = useState(presetDate ?? '')
  // Duration and the availability window are carried over read-only from the
  // browse filter — the customer doesn't re-pick them here. 'any' = "Not sure":
  // sent as the flexible default (kept inside the cleaner's ceiling) so the
  // request still has a concrete duration the cleaner can adjust. A preset
  // duration above the cleaner's ceiling falls back to "Not sure".
  const duration: number | 'any' =
    presetDuration != null && presetDuration >= 1 && presetDuration <= maxHours
      ? presetDuration
      : 'any'
  // When the customer came from a location search, the area is fixed (read-only)
  // and they add their street + house number alongside it. Otherwise they type
  // the full address themselves.
  const [address, setAddress] = useState('')
  const [street, setStreet] = useState('')
  const [notes, setNotes] = useState('')
  // The window the customer is free in (broader than the clean itself), carried
  // over from the browse filter and shown read-only. Defaults to the full
  // working day when there was no search.
  const availFrom = presetAvailFrom ?? '06:00'
  const availTo = presetAvailTo ?? '22:00'

  // Final address sent to the booking: street + searched area, or the manually
  // typed address when there was no search.
  const fullAddress = presetAddress
    ? [street.trim(), presetAddress.trim()].filter(Boolean).join(', ')
    : address.trim()

  const hasAvailability = weeklyAvailability.length > 0 || dateAvailability.length > 0

  // Compute available slots for the selected date — union of the recurring
  // weekly slots for that weekday and any specific-date slots for that date.
  const daySlots = date
    ? [
        ...weeklyAvailability.filter(s => s.day_of_week === new Date(date + 'T12:00:00').getDay()),
        ...dateAvailability.filter(s => s.date === date),
      ]
    : []
  const noAvailabilityOnDay = date && hasAvailability && daySlots.length === 0

  // The customer no longer picks a start time — they give the day, a duration,
  // and the window they're free in. Derive a concrete start that fits within
  // their window and one of the cleaner's slots (earliest such), so the booking
  // still carries a valid scheduled_start; the cleaner can adjust on response.
  function computeStart(durationHours: number): string {
    const winStart = timeToMin(availFrom)
    const winEnd = timeToMin(availTo)
    const durationMin = durationHours * 60
    let best: number | null = null
    for (const s of daySlots) {
      const overlapStart = Math.max(timeToMin(s.start_time), winStart)
      const overlapEnd = Math.min(timeToMin(s.end_time), winEnd)
      if (overlapEnd - overlapStart >= durationMin && (best === null || overlapStart < best)) {
        best = overlapStart
      }
    }
    return minToTime(best ?? winStart)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // "Not sure" carries no concrete duration, so request a 2-hour default and
    // flag the customer's flexibility on the booking (duration_flexible) — the
    // cleaner sees a "Not sure" marker next to the duration, not a note.
    const isFlexible = duration === 'any'
    const durationHours = isFlexible ? flexibleHours : duration
    const result = await createBooking({
      cleaner_id: cleaner.id,
      service_type: serviceType,
      scheduled_date: date,
      scheduled_start: computeStart(durationHours),
      duration_hours: durationHours,
      duration_flexible: isFlexible,
      avail_window_start: availFrom,
      avail_window_end: availTo,
      address: fullAddress,
      notes: notes.trim() || undefined,
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
      <div className="flex justify-end items-center pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
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
          {presetDate ? (
            <div
              id="date"
              className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-900 font-medium"
            >
              {new Date(presetDate + 'T00:00:00').toLocaleDateString(
                lang === 'he' ? 'he-IL' : 'en-US',
                { weekday: 'long', month: 'short', day: 'numeric' }
              )}
            </div>
          ) : (
            <input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="duration" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.duration')}</label>
          {/* Carried over read-only from the browse filter — the customer doesn't
              re-pick the duration here. */}
          <div id="duration" className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-900 font-medium">
            {duration === 'any'
              ? t('bookingRequestForm.durationNotSure')
              : t('bookingRequestForm.durationValue', { n: String(duration) })}
          </div>
        </div>
      </div>

      {noAvailabilityOnDay && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          This cleaner is not available on the selected day. Please choose a different date.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.availability')}</label>
        {/* Carried over read-only from the browse filter — the customer doesn't
            re-pick when they're free here. */}
        <div className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-900 font-medium">
          {availFrom} – {availTo}
        </div>
        <span className="text-xs text-gray-500">{t('bookingRequestForm.availabilityHelp')}</span>
      </div>

      {presetAddress ? (
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="street" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.street')}</label>
            <input id="street" type="text" value={street} onChange={e => setStreet(e.target.value)} required
              placeholder={t('bookingRequestForm.streetPlaceholder')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="area" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.area')}</label>
            <div id="area" className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-900 font-medium">
              {presetAddress}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="address" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.address')}</label>
          <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} required
            placeholder={t('bookingRequestForm.addressPlaceholder')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

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
        <button type="button" onClick={() => (onCancel ? onCancel() : setOpen(false))} disabled={loading}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-5 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50">
          {t('bookingRequestForm.cancel')}
        </button>
        <button type="submit" disabled={loading || noAvailabilityOnDay === true}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? '...' : t('bookingRequestForm.sendRequest')}
        </button>
      </div>
    </form>
  )
}
