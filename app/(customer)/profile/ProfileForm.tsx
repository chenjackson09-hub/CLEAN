'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { normalizeImageToJpeg } from '@/lib/image/normalizeImage'
import { LanguageMultiSelect } from '@/components/LanguageMultiSelect'

type ActionResult = { error?: string; success?: boolean; avatarUrl?: string } | null

type DefaultValues = {
  full_name: string
  phone: string
  bio: string
  preferred_service_type: 'residential' | 'commercial'
  languages: string[]
  max_hours: string
  address: string
  avatar_url: string | null
  num_rooms: string
  pet_types: ('dog' | 'cat' | 'other')[]
  num_pets: string
  num_kids_under_15: string
  num_people: string
  house_size_sqm: string
  dwelling_type: 'apartment' | 'house' | null
  floor: string
}

type Props = {
  defaultValues: DefaultValues
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const { t } = useLanguage()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors shrink-0 shadow-sm disabled:opacity-60"
    >
      {pending ? t('profile.saving') : t('profile.save')}
    </button>
  )
}

export function ProfileForm({ defaultValues, action }: Props) {
  const { t } = useLanguage()
  const [state, formAction] = useFormState(action, null)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(defaultValues.avatar_url)
  // Pets toggle drives whether the dog/cat + count fields show; dwelling type
  // drives whether the floor field shows (only meaningful for apartments).
  const [hasPets, setHasPets] = useState(defaultValues.pet_types.length > 0)
  const [pets, setPets] = useState({
    dog: defaultValues.pet_types.includes('dog'),
    cat: defaultValues.pet_types.includes('cat'),
    other: defaultValues.pet_types.includes('other'),
  })
  const [dwellingType, setDwellingType] = useState<'apartment' | 'house' | ''>(
    defaultValues.dwelling_type ?? ''
  )
  // num_pets has a dynamic minimum: at least the number of selected pet kinds
  // (each kind implies one), and never below 1 when there are pets.
  const minPets = Math.max(1, Object.values(pets).filter(Boolean).length)

  // On a successful save, adopt the freshly-saved (cache-busted) avatar URL and
  // re-fetch server data so the photo no longer shows the previous one.
  useEffect(() => {
    if (state?.success) {
      if (state.avatarUrl) setPreview(state.avatarUrl)
      router.refresh()
    }
  }, [state, router])

  const fieldClass = 'border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'
  const labelClass = 'text-xs font-semibold text-gray-600 uppercase tracking-wide'

  const initial = defaultValues.full_name?.charAt(0)?.toUpperCase() || '?'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    // Convert HEIC/large phone photos to a small JPEG, then write it back into
    // the input so the form submits the converted file (not the raw HEIC).
    const normalized = await normalizeImageToJpeg(file)
    if (normalized !== file) {
      const dt = new DataTransfer()
      dt.items.add(normalized)
      input.files = dt.files
    }
    setPreview(URL.createObjectURL(normalized))
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-lg">
      {/* Hidden file input wired to avatar button */}
      <input
        ref={fileInputRef}
        type="file"
        name="avatar"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Title row — Save sits inline with the page title */}
      <div className="flex items-center justify-between py-3 gap-4">
        <h1 className="text-xl font-bold text-gray-900">{t('profile.title')}</h1>
        <SubmitButton />
      </div>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl shadow-xl p-6 shadow-sm flex items-center gap-5">
        {/* Clickable avatar */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-16 h-16 rounded-full shrink-0 group focus:outline-none"
          title={t('profile.changePhoto')}
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center font-bold text-2xl text-blue-700 overflow-hidden">
            {preview ? (
              <img src={preview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </button>

        <div>
          <p className="text-lg font-bold text-gray-900">{defaultValues.full_name || t('profile.yourName')}</p>
          <p className="text-sm text-gray-500">{defaultValues.address || t('profile.addAddress')}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {defaultValues.preferred_service_type === 'commercial' ? t('profile.commercial') : t('profile.residential')}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="full_name" className={labelClass}>{t('profile.fullName')}</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            defaultValue={defaultValues.full_name}
            required
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className={labelClass}>{t('profile.phone')}</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={defaultValues.phone}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className={labelClass}>{t('profile.aboutMe')}</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={defaultValues.bio}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="preferred_service_type" className={labelClass}>{t('profile.preferredServiceType')}</label>
          <select
            id="preferred_service_type"
            name="preferred_service_type"
            defaultValue={defaultValues.preferred_service_type}
            className={fieldClass}
          >
            <option value="residential">{t('profile.residential')}</option>
            <option value="commercial">{t('profile.commercial')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          {/* Composite widget → labelled with a <span>, not <label htmlFor>. */}
          <span className={labelClass}>{t('profile.languages')}</span>
          <LanguageMultiSelect
            name="languages"
            defaultValue={defaultValues.languages}
            placeholder={t('profile.languagesSelect')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="max_hours" className={labelClass}>{t('profile.maxHours')}</label>
          <input
            id="max_hours"
            name="max_hours"
            type="number"
            inputMode="numeric"
            min={1}
            max={24}
            defaultValue={defaultValues.max_hours}
            className={fieldClass}
          />
          <p className="text-xs text-gray-500">{t('profile.maxHoursHelp')}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="address" className={labelClass}>{t('profile.address')}</label>
          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            defaultValue={defaultValues.address}
            required
            className={fieldClass}
          />
          <p className="text-xs text-gray-500">{t('profile.addressHelp')}</p>
        </div>

        {/* ── Household details ── help cleaners size up the job ── */}
        <div className="border-t border-gray-100 pt-4 mt-1">
          <h2 className="text-sm font-bold text-gray-900">{t('profile.householdTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('profile.householdSub')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="dwelling_type" className={labelClass}>{t('profile.propertyType')}</label>
            <select
              id="dwelling_type"
              name="dwelling_type"
              value={dwellingType}
              onChange={(e) => setDwellingType(e.target.value as 'apartment' | 'house' | '')}
              className={fieldClass}
            >
              <option value="">{t('profile.selectPlaceholder')}</option>
              <option value="apartment">{t('profile.apartment')}</option>
              <option value="house">{t('profile.house')}</option>
            </select>
          </div>

          {dwellingType === 'apartment' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="floor" className={labelClass}>{t('profile.floor')}</label>
              <input id="floor" name="floor" type="number" step={1}
                defaultValue={defaultValues.floor} className={fieldClass} />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="num_rooms" className={labelClass}>{t('profile.rooms')}</label>
            <input id="num_rooms" name="num_rooms" type="number" inputMode="numeric" min={0}
              defaultValue={defaultValues.num_rooms} className={fieldClass} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="house_size_sqm" className={labelClass}>{t('profile.houseSize')}</label>
            <input id="house_size_sqm" name="house_size_sqm" type="number" inputMode="numeric" min={0}
              defaultValue={defaultValues.house_size_sqm} className={fieldClass} />
          </div>

        </div>

        {/* Pets */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t('profile.anyPets')}</span>
          <div className="flex gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="has_pets" value="yes" checked={hasPets}
                onChange={() => setHasPets(true)} /> {t('profile.yes')}
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="has_pets" value="no" checked={!hasPets}
                onChange={() => setHasPets(false)} /> {t('profile.no')}
            </label>
          </div>

          {hasPets && (
            <div className="flex flex-col gap-3 pl-1">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" name="pet_dog" checked={pets.dog}
                    onChange={(e) => setPets((p) => ({ ...p, dog: e.target.checked }))} /> {t('profile.dog')}
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" name="pet_cat" checked={pets.cat}
                    onChange={(e) => setPets((p) => ({ ...p, cat: e.target.checked }))} /> {t('profile.cat')}
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" name="pet_other" checked={pets.other}
                    onChange={(e) => setPets((p) => ({ ...p, other: e.target.checked }))} /> {t('profile.other')}
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="num_pets" className={labelClass}>{t('profile.totalPets')}</label>
                <input id="num_pets" name="num_pets" type="number" inputMode="numeric"
                  min={minPets} required defaultValue={defaultValues.num_pets} className={`${fieldClass} w-28`} />
              </div>
            </div>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error.startsWith('profile.') ? t(state.error) : state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{t('profile.saved')}</p>
        )}
      </div>
    </form>
  )
}
