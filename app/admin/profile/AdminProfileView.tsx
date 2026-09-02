'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { normalizeImageToJpeg } from '@/lib/image/normalizeImage'
import { updateAdminName, updateAdminAvatar } from './actions'
import { InlineEditableText } from './InlineEditableText'

export function AdminProfileView({
  initialFirstName,
  initialLastName,
  email,
  initialAvatarUrl,
}: {
  initialFirstName: string
  initialLastName: string
  email: string
  initialAvatarUrl: string | null
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function errorText(key: string) {
    return key === 'nameRequired' ? t('adminProfile.nameRequired') : t('adminProfile.saveError')
  }

  async function saveFirst(newFirst: string) {
    const result = await updateAdminName({ first_name: newFirst, last_name: lastName })
    if (!result.error) {
      setFirstName(newFirst)
      router.refresh()
    }
    return result
  }

  async function saveLast(newLast: string) {
    const result = await updateAdminName({ first_name: firstName, last_name: newLast })
    if (!result.error) {
      setLastName(newLast)
      router.refresh()
    }
    return result
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploading(true)

    // Converts HEIC/large phone photos to a small JPEG (never throws — falls
    // back to the original file on failure), matching the customer/cleaner
    // profile forms' upload path.
    const normalized = await normalizeImageToJpeg(file)
    const localPreview = URL.createObjectURL(normalized)
    setAvatarUrl(localPreview)

    const formData = new FormData()
    formData.append('avatar', normalized)
    const result = await updateAdminAvatar(formData)
    setUploading(false)

    if (result.error || !result.avatarUrl) {
      setUploadError(t('adminProfile.uploadError'))
      setAvatarUrl(initialAvatarUrl)
      return
    }
    setAvatarUrl(result.avatarUrl)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">{t('adminProfile.title')}</h1>

      <div className="flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={t('adminProfile.changePhoto')}
          className="relative w-24 h-24 rounded-full shrink-0 group focus:outline-none disabled:opacity-70"
        >
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </button>
        <p className="text-xs text-gray-400">{uploading ? t('adminProfile.uploading') : t('adminProfile.changePhoto')}</p>
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <InlineEditableText label={t('adminProfile.firstName')} value={firstName} onSave={saveFirst} errorText={errorText} />
        <InlineEditableText label={t('adminProfile.lastName')} value={lastName} onSave={saveLast} errorText={errorText} />
        <div>
          <p className="text-xs text-gray-400 mb-1">{t('adminProfile.email')}</p>
          <p className="text-sm text-gray-500 px-3 py-1.5 -mx-3">{email}</p>
        </div>
      </div>
    </div>
  )
}
