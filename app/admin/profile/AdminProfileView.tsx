'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { updateAdminName } from './actions'
import { InlineEditableText } from './InlineEditableText'

export function AdminProfileView({
  initialFirstName,
  initialLastName,
  email,
}: {
  initialFirstName: string
  initialLastName: string
  email: string
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)

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

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">{t('adminProfile.title')}</h1>

      <div className="flex flex-col items-center gap-2">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <p className="text-xs text-gray-400">{t('adminProfile.avatarComingSoon')}</p>
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
