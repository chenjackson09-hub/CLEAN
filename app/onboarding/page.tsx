'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/lib/i18n/LanguageToggle'
import { createClient } from '@/lib/supabase/client'
import { completeOnboarding } from '@/app/(auth)/actions'
import { ROLE_HOME } from '@/lib/roleHome'

type Role = 'customer' | 'cleaner'

export default function OnboardingPage() {
  const { t } = useLanguage()
  const [role, setRole] = useState<Role | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Prefill the name Google gave us.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined
      if (meta?.full_name || meta?.name) setFullName(meta.full_name ?? meta.name ?? '')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!role) {
      setError(t('onboarding.chooseRole'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await completeOnboarding({ role, full_name: fullName, phone })
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      // Full-page load so middleware re-evaluates with the newly-written role
      // (avoids any client-router/session-cache races).
      window.location.href = ROLE_HOME[role]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const roleCard = (value: Role, title: string, desc: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={`flex-1 text-start rounded-2xl border-2 p-4 transition-colors ${
        role === value ? 'border-[#75C9C8] bg-[#75C9C8]/10' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </button>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#75C9C8]/20 via-white to-[#80A1D4]/20">
      <div className="w-full max-w-md bg-white rounded-3xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('onboarding.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">{t('onboarding.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('onboarding.roleLabel')}</span>
            <div className="flex gap-3">
              {roleCard('customer', t('onboarding.customer'), t('onboarding.customerDesc'))}
              {roleCard('cleaner', t('onboarding.cleaner'), t('onboarding.cleanerDesc'))}
            </div>
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('onboarding.fullName')}
            </label>
            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
              className="w-full border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#75C9C8]"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t('onboarding.phone')}
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="w-full border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#75C9C8]"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-full px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#75C9C8] text-white rounded-full py-2.5 text-sm font-semibold hover:brightness-95 disabled:opacity-50 transition"
          >
            {loading ? t('onboarding.finishing') : t('onboarding.finish')}
          </button>
        </form>
      </div>
    </div>
  )
}
