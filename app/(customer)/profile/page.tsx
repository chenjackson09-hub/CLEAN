// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { Nav } from '../Nav'
import { ProfileForm } from './ProfileForm'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CustomerProfile } from '@/lib/types/profile'

const MOCK_PROFILE: CustomerProfile = {
  full_name: 'Maya Cohen',
  phone: '050-1234567',
  bio: 'Looking for a reliable cleaner for my apartment, ideally weekly.',
  preferred_service_type: 'residential',
  address: '12 Rothschild Blvd, Tel Aviv',
  avatar_url: null,
}

export default function ProfilePage() {
  const { t } = useLanguage()
  const profile = MOCK_PROFILE

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <h1 className="text-xl font-bold mb-4">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('profile.title')}</span>
        </h1>
        <ProfileForm defaultValues={profile} />
      </div>
    </div>
  )
}
