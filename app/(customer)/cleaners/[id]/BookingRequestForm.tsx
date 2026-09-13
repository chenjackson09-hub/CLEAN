'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createBooking, updateHomeQuickFields } from '@/app/(customer)/actions'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import BookingRequestSummary, { type BookingSummaryData } from '@/components/BookingRequestSummary'
import type { CleanerResult } from '@/lib/types/cleaner'

type WeeklySlot = { day_of_week: number; start_time: string; end_time: string }
type DateSlot = { date: string; start_time: string; end_time: string }

type HostDefaults = {
  dwelling_type: 'apartment' | 'house' | 'guesthouse' | 'office' | 'villa' | 'other' | null
  bedrooms: number | null
  num_rooms: number | null
  bathrooms: number | null
  pet_types: ('dog' | 'cat' | 'other')[]
  num_pets: number | null
  usual_cleaning_type: 'regular' | 'deep' | null
  address: string | null
}

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const START_HOUR = 6
const END_HOUR = 22
const TIME_OPTIONS = Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }, (_, i) => {
  const total = START_HOUR * 60 + i * 30
  const h = Math.floor(total / 60)
  const m = total % 60 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

const EXTRA_KEYS = ['oven', 'linens', 'windows', 'fridge', 'laundry', 'outdoor'] as const

export function BookingRequestForm({
  cleaner,
  weeklyAvailability = [],
  dateAvailability = [],
  presetDate,
  presetAddress,
  presetDuration,
  cleanGroupId,
  cleanGroupColor,
  defaultOpen = false,
  onCancel,
  disabled = false,
}: {
  cleaner: CleanerResult
  weeklyAvailability?: WeeklySlot[]
  dateAvailability?: DateSlot[]
  presetDate?: string
  presetAddress?: string
  // When the customer arrived from a browse search that specified a duration,
  // the duration field starts pre-selected to it — still fully editable.
  presetDuration?: number
  // "Add a clean" (migration 0031) — set when this request is one of several
  // candidate days the host marked for one need. Threaded straight through to
  // createBooking; nothing here needs to know more than "tag it."
  cleanGroupId?: string
  cleanGroupColor?: string
  // When embedded (e.g. in the browse "Schedule a clean" modal) the form
  // starts expanded and Cancel is delegated to the host (closes the modal)
  // instead of collapsing back to the inline button state.
  defaultOpen?: boolean
  onCancel?: () => void
  // Non-interactive mode for the cleaner's own profile preview: shows the
  // same collapsed button, but it can't expand the card.
  disabled?: boolean
}) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [phase, setPhase] = useState<'closed' | 'draft' | 'sent'>(defaultOpen ? 'draft' : 'closed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(presetDate ?? '')
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState(
    presetDuration != null && presetDuration >= 1 && presetDuration <= 8 ? presetDuration : 3
  )
  const [address, setAddress] = useState('')
  const [street, setStreet] = useState('')
  const [notes, setNotes] = useState('')
  const [cleaningType, setCleaningType] = useState<'regular' | 'deep'>('regular')
  const [extras, setExtras] = useState<string[]>([])
  const [addingExtra, setAddingExtra] = useState(false)
  const [customExtra, setCustomExtra] = useState('')
  const [petsPresent, setPetsPresent] = useState(true)
  const [hostPresent, setHostPresent] = useState(true)

  // Home/pet/cleaning-preference defaults, fetched from the host's own profile
  // once the card is opened (a plain session-scoped read of their own row —
  // "customer manages own profile" RLS already allows it).
  const [hostDefaults, setHostDefaults] = useState<HostDefaults | null>(null)
  const [homeEditing, setHomeEditing] = useState(false)
  const [homeDwelling, setHomeDwelling] = useState<'apartment' | 'house' | 'guesthouse' | 'office' | 'villa' | 'other'>('house')
  const [homeBedrooms, setHomeBedrooms] = useState('')
  const [homeBathrooms, setHomeBathrooms] = useState('')
  const [homeSaving, setHomeSaving] = useState(false)

  useEffect(() => {
    if (phase !== 'draft' || hostDefaults) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('customers')
        .select('dwelling_type, bedrooms, num_rooms, bathrooms, pet_types, num_pets, usual_cleaning_type, address')
        .eq('id', user.id)
        .single<HostDefaults>()
      if (!data) return
      setHostDefaults(data)
      setCleaningType(data.usual_cleaning_type === 'deep' ? 'deep' : 'regular')
      setHomeDwelling(data.dwelling_type ?? 'house')
      const bedrooms = data.bedrooms ?? data.num_rooms
      setHomeBedrooms(bedrooms != null ? String(bedrooms) : '')
      setHomeBathrooms(data.bathrooms != null ? String(data.bathrooms) : '')
    })
  }, [phase, hostDefaults])

  const hasPets = (hostDefaults?.pet_types.length ?? 0) > 0
  const petsLabel = hostDefaults
    ? (() => {
        const kind = hostDefaults.pet_types[0]
        const noun = kind === 'dog' ? 'dog' : kind === 'cat' ? 'cat' : 'pet'
        const n = hostDefaults.num_pets ?? hostDefaults.pet_types.length
        return `${n} ${noun}${n === 1 ? '' : 's'}`
      })()
    : null

  const homeArea = presetAddress ?? hostDefaults?.address ?? null

  // Final address sent to the booking: street + searched/profile area, or the
  // manually typed address when neither is available.
  const fullAddress = homeArea
    ? [street.trim(), homeArea.trim()].filter(Boolean).join(', ')
    : address.trim()

  const hasAvailability = weeklyAvailability.length > 0 || dateAvailability.length > 0
  const daySlots = date
    ? [
        ...weeklyAvailability.filter(s => s.day_of_week === new Date(date + 'T12:00:00').getDay()),
        ...dateAvailability.filter(s => s.date === date),
      ]
    : []
  const noAvailabilityOnDay = date && hasAvailability && daySlots.length === 0

  const canSend = date.length > 0 && startTime.length > 0 && duration > 0 && fullAddress.length > 0

  function toggleExtra(key: string) {
    setExtras(prev => (prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]))
  }

  function addCustomExtra() {
    const value = customExtra.trim()
    if (value && !extras.includes(value)) setExtras(prev => [...prev, value])
    setCustomExtra('')
    setAddingExtra(false)
  }

  async function saveHome() {
    setHomeSaving(true)
    const bedrooms = homeBedrooms ? parseInt(homeBedrooms, 10) : null
    const bathrooms = homeBathrooms ? parseInt(homeBathrooms, 10) : null
    await updateHomeQuickFields({ dwelling_type: homeDwelling, bedrooms, bathrooms })
    setHostDefaults(prev => (prev ? { ...prev, dwelling_type: homeDwelling, bedrooms, bathrooms } : prev))
    setHomeSaving(false)
    setHomeEditing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend) return
    setLoading(true)
    setError(null)
    const result = await createBooking({
      cleaner_id: cleaner.id,
      service_type: cleaner.service_types[0] ?? 'residential',
      scheduled_date: date,
      scheduled_start: startTime,
      duration_hours: duration,
      address: fullAddress,
      notes: notes.trim() || undefined,
      cleaning_type: cleaningType,
      extras,
      pets_present: hasPets ? petsPresent : undefined,
      host_present: hostPresent,
      clean_group_id: cleanGroupId,
      clean_group_color: cleanGroupColor,
    })
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setPhase('sent')
    // Keeps the browse page's "add a clean" progress banner (days requested
    // so far, fetched server-side by clean_group_id) in sync immediately,
    // without waiting for the host to run another search.
    if (cleanGroupId) router.refresh()
  }

  const summaryData: BookingSummaryData = {
    scheduledDate: date,
    scheduledStart: startTime,
    durationHours: duration,
    homeDwellingType: hostDefaults?.dwelling_type ?? null,
    homeArea,
    homeBedrooms: hostDefaults?.bedrooms ?? hostDefaults?.num_rooms ?? null,
    homeBathrooms: hostDefaults?.bathrooms ?? null,
    cleaningType,
    extras,
    petsLabel: hasPets ? petsLabel : null,
    petsPresent: hasPets ? petsPresent : null,
    hostPresent,
    notes: notes.trim() || null,
    hourlyRate: cleaner.hourly_rate,
  }

  if (phase === 'sent') {
    return (
      <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-lg text-gray-900">{t('bookingRequestForm.headingSent')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('bookingRequestForm.headingSentSub', { name: cleaner.full_name })}
          </p>
        </div>
        <BookingRequestSummary data={summaryData} cleanerName={cleaner.full_name} lang={lang} />
      </div>
    )
  }

  if (phase === 'closed') {
    return (
      <div className="flex justify-end items-center pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setPhase('draft')}
          disabled={disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          {t('bookingRequestForm.requestBooking')}
        </button>
      </div>
    )
  }

  // The draft form waits for the host-defaults fetch before rendering any
  // interactive fields — several fields (address vs. street+area, cleaning
  // type, pets) only know their correct initial value once it resolves.
  // Rendering them earlier and letting the effect's setState calls land after
  // the user has already interacted would either swap the address field out
  // from under them mid-typing or silently revert a choice they'd already
  // made. The fetch is a single indexed row read, so this is normally
  // imperceptible.
  if (!hostDefaults) {
    return (
      <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
        <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
        <div className="h-24 rounded-md bg-gray-50 animate-pulse" />
        <div className="h-10 rounded-md bg-gray-50 animate-pulse" />
      </div>
    )
  }

  const fieldClass = 'border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-100 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          {cleanGroupColor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cleanGroupColor }} />}
          <h2 className="font-bold text-lg text-gray-900">{t('bookingRequestForm.headingDraft')}</h2>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('bookingRequestForm.headingDraftSub', { name: cleaner.full_name })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.date')}</label>
          <input
            id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="startTime" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.startTime')}</label>
          <select id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldClass}>
            {!TIME_OPTIONS.includes(startTime) && <option value={startTime}>{startTime}</option>}
            {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
          </select>
        </div>
      </div>

      {noAvailabilityOnDay && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          This cleaner is not available on the selected day. Please choose a different date.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="duration" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.duration')}</label>
        <select id="duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className={`${fieldClass} w-32`}>
          {DURATIONS.map(n => <option key={n} value={n}>{t('bookingRequestForm.durationValue', { n: String(n) })}</option>)}
        </select>
        <p className="text-xs text-gray-500">{t('bookingRequestForm.durationHelp')}</p>
      </div>

      {/* Your home */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.yourHome')}</label>
          {!homeEditing && (
            <button type="button" onClick={() => setHomeEditing(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              {t('bookingRequestForm.editHome')}
            </button>
          )}
        </div>
        {homeEditing ? (
          <div className="border border-gray-300 rounded-md p-3 flex flex-col gap-2 bg-white">
            <select value={homeDwelling} onChange={e => setHomeDwelling(e.target.value as typeof homeDwelling)} className={fieldClass}>
              <option value="apartment">{t('bookingRequestForm.dwellingApartment')}</option>
              <option value="house">{t('bookingRequestForm.dwellingHouse')}</option>
              <option value="guesthouse">{t('bookingRequestForm.dwellingGuesthouse')}</option>
              <option value="office">{t('bookingRequestForm.dwellingOffice')}</option>
              <option value="villa">{t('bookingRequestForm.dwellingVilla')}</option>
            </select>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="homeBedrooms" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.bedroomsLabel')}</label>
                <input id="homeBedrooms" type="number" min={0} value={homeBedrooms} onChange={e => setHomeBedrooms(e.target.value)}
                  className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="homeBathrooms" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.bathroomsLabel')}</label>
                <input id="homeBathrooms" type="number" min={0} value={homeBathrooms} onChange={e => setHomeBathrooms(e.target.value)}
                  className={fieldClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setHomeEditing(false)} className="text-xs font-semibold text-gray-500 px-2 py-1">
                {t('bookingRequestForm.cancel')}
              </button>
              <button type="button" onClick={saveHome} disabled={homeSaving}
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md px-3 py-1.5 disabled:opacity-60">
                {t('bookingRequestForm.saveHome')}
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 bg-gray-50 rounded-md px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">
              {[t(`bookingRequestForm.dwelling${homeDwelling.charAt(0).toUpperCase()}${homeDwelling.slice(1)}`), homeArea].filter(Boolean).join(' · ')}
            </p>
            {(homeBedrooms || homeBathrooms) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {[homeBedrooms && t('bookingRequestForm.bedroomsShort', { n: homeBedrooms }), homeBathrooms && t('bookingRequestForm.bathroomsShort', { n: homeBathrooms })].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cleaning type */}
      <div className="flex flex-col gap-1">
        <label htmlFor="cleaningType" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.cleaningType')}</label>
        <select id="cleaningType" value={cleaningType} onChange={e => setCleaningType(e.target.value as 'regular' | 'deep')} className={fieldClass}>
          <option value="regular">{t('bookingRequestForm.cleaningTypeRegular')}</option>
          <option value="deep">{t('bookingRequestForm.cleaningTypeDeep')}</option>
        </select>
        <p className="text-xs text-gray-500">
          {cleaningType === 'deep' ? t('bookingRequestForm.cleaningTypeDeepIncludes') : t('bookingRequestForm.cleaningTypeRegularIncludes')}
        </p>
      </div>

      {/* Extras */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.extras')}</span>
        <div className="flex flex-wrap gap-2">
          {EXTRA_KEYS.map(key => (
            <button
              key={key} type="button" onClick={() => toggleExtra(key)}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                extras.includes(key) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {t(`bookingRequestForm.extra${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
            </button>
          ))}
          {extras.filter(e => !(EXTRA_KEYS as readonly string[]).includes(e)).map(custom => (
            <button
              key={custom} type="button" onClick={() => toggleExtra(custom)}
              className="px-3 py-1.5 rounded-full border border-blue-500 bg-blue-50 text-blue-700 text-sm font-medium"
            >
              {custom}
            </button>
          ))}
        </div>
        {addingExtra ? (
          <div className="flex gap-2">
            <input
              type="text" value={customExtra} onChange={e => setCustomExtra(e.target.value)}
              placeholder={t('bookingRequestForm.addExtraPlaceholder')} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomExtra() } }}
              className={`${fieldClass} flex-1`}
            />
            <button type="button" onClick={addCustomExtra} className="text-sm font-semibold text-blue-600 px-2">
              {t('bookingRequestForm.confirmAdd')}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAddingExtra(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700 text-start">
            {t('bookingRequestForm.addExtra')}
          </button>
        )}
      </div>

      {/* Pets + will you be home */}
      <div className="grid grid-cols-2 gap-3">
        {hasPets && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.pets')}</span>
            <p className="text-sm font-semibold text-gray-900">{petsLabel}</p>
            <label className="flex items-center gap-1.5 text-sm text-gray-700 mt-1">
              <input type="checkbox" checked={petsPresent} onChange={e => setPetsPresent(e.target.checked)} />
              {t('bookingRequestForm.petsPresentCheckbox')}
            </label>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.willYouBeHome')}</label>
          <div className="flex gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="hostPresent" checked={hostPresent} onChange={() => setHostPresent(true)} /> {t('bookingRequestForm.yes')}
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="hostPresent" checked={!hostPresent} onChange={() => setHostPresent(false)} /> {t('bookingRequestForm.no')}
            </label>
          </div>
        </div>
      </div>

      {!homeArea && (
        <div className="flex flex-col gap-1">
          <label htmlFor="address" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.address')}</label>
          <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} required
            placeholder={t('bookingRequestForm.addressPlaceholder')} className={fieldClass} />
        </div>
      )}
      {homeArea && (
        <div className="flex flex-col gap-1">
          <label htmlFor="street" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.street')}</label>
          <input id="street" type="text" value={street} onChange={e => setStreet(e.target.value)}
            placeholder={t('bookingRequestForm.streetPlaceholder')} className={fieldClass} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('bookingRequestForm.noteForLabel', { name: cleaner.full_name })}
        </label>
        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder={t('bookingRequestForm.notesPlaceholder')} className={fieldClass} />
      </div>

      {/* Price */}
      <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('bookingRequestForm.estimatedTotal')}</span>
        <div className="text-end">
          <p className="text-xs text-gray-500">{t('bookingRequestForm.priceBreakdown', { hours: t('bookingRequestForm.durationValue', { n: String(duration) }), rate: String(cleaner.hourly_rate) })}</p>
          <p className="text-xl font-bold text-gray-900">₪{duration * cleaner.hourly_rate}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => (onCancel ? onCancel() : setPhase('closed'))} disabled={loading}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-5 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50">
          {t('bookingRequestForm.cancel')}
        </button>
        <button type="submit" disabled={loading || !canSend || noAvailabilityOnDay === true}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? t('bookingRequestForm.sending') : t('bookingRequestForm.sendRequestTo', { name: cleaner.full_name })}
        </button>
      </div>
    </form>
  )
}
