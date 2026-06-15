'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CustomerProfile } from '@/lib/types/profile'

type Props = {
  defaultValues: CustomerProfile
  onSave?: (profile: CustomerProfile) => void
}

const SERVICE_TYPE_BADGE: Record<CustomerProfile['preferred_service_type'], string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
  both: 'bg-yellow-100 text-yellow-800',
}

export function ProfileForm({ defaultValues, onSave }: Props) {
  const { t } = useLanguage()
  const [fullName, setFullName] = useState(defaultValues.full_name)
  const [phone, setPhone] = useState(defaultValues.phone)
  const [bio, setBio] = useState(defaultValues.bio)
  const [preferredServiceType, setPreferredServiceType] = useState(defaultValues.preferred_service_type)
  const [address, setAddress] = useState(defaultValues.address)
  const [avatarUrl, setAvatarUrl] = useState(defaultValues.avatar_url)
  const [saved, setSaved] = useState(false)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave?.({
      full_name: fullName,
      phone,
      bio,
      preferred_service_type: preferredServiceType,
      address,
      avatar_url: avatarUrl,
    })
    setSaved(true)
  }

  const fieldClass = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'
  const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wide'

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 shadow-md text-white flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-2xl overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
            ) : (
              fullName.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <label
            htmlFor="avatar"
            className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-white text-indigo-600 flex items-center justify-center text-xs cursor-pointer shadow-sm"
          >
            📷
            <span className="sr-only">{t('profileForm.changePhoto')}</span>
          </label>
          <input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="text-lg font-bold">{fullName || t('profileForm.yourName')}</p>
          <p className="text-sm text-white/80">📍 {address || t('profileForm.addAddress')}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${SERVICE_TYPE_BADGE[preferredServiceType]}`}>
            {t(`common.${preferredServiceType}`)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 border-t-4 border-t-indigo-400 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="full_name" className={labelClass}>👤 {t('profileForm.fullName')}</label>
          <input id="full_name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={fieldClass} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className={labelClass}>📞 {t('profileForm.phone')}</label>
          <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={fieldClass} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className={labelClass}>📝 {t('profileForm.bio')}</label>
          <textarea id="bio" rows={3} value={bio} onChange={e => setBio(e.target.value)} className={`${fieldClass} resize-none`} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="preferred_service_type" className={labelClass}>🧹 {t('profileForm.preferredServiceType')}</label>
          <select
            id="preferred_service_type"
            value={preferredServiceType}
            onChange={e => setPreferredServiceType(e.target.value as CustomerProfile['preferred_service_type'])}
            className={fieldClass}
          >
            <option value="residential">{t('common.residential')}</option>
            <option value="commercial">{t('common.commercial')}</option>
            <option value="both">{t('common.both')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="address" className={labelClass}>📍 {t('profileForm.address')}</label>
          <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} required className={fieldClass} />
          <p className="text-xs text-gray-400">{t('profileForm.addressHint')}</p>
        </div>

        {saved && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{t('profileForm.saved')}</p>
        )}

        <button type="submit"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2 rounded-md font-semibold text-sm transition-colors self-start shadow-sm">
          {t('profileForm.save')}
        </button>
      </form>
    </div>
  )
}
