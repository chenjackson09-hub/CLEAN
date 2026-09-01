'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/lib/i18n/LanguageToggle'
import { redeemAdminInvite } from './actions'

export function RegisterAdminForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError(t('auth.register.passwordMismatch'))
      return
    }
    setLoading(true)
    const result = await redeemAdminInvite({ token, email, password, full_name: fullName })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-gray-700">{t('auth.registerAdmin.missingToken')}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center flex flex-col gap-4">
          <p className="text-gray-700">{t('auth.registerAdmin.success')}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t('auth.login.title')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.registerAdmin.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">{t('auth.registerAdmin.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.registerAdmin.fullName')}
            </label>
            <input
              id="fullName"
              type="text"
              required
              disabled={loading}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('auth.register.creatingAccount') : t('auth.registerAdmin.createAccount')}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-600">
          {t('auth.register.haveAccount')}{' '}
          <Link href="/login" className="text-blue-600 hover:underline">{t('auth.register.signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
