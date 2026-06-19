'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Locale } from './translations'

const STORAGE_KEY = 'clean_lang'

type LanguageContextValue = {
  lang: Locale
  dir: 'ltr' | 'rtl'
  toggleLanguage: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  messages: typeof translations['en']
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function lookup(lang: Locale, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object' && part in value) {
      return (value as Record<string, unknown>)[part]
    }
    return undefined
  }, translations[lang])
}

function translate(lang: Locale, key: string, vars?: Record<string, string | number>): string {
  const value = lookup(lang, key)
  if (typeof value !== 'string') return key

  if (!vars) return value
  return Object.entries(vars).reduce(
    (result, [name, replacement]) => result.replace(`{${name}}`, String(replacement)),
    value
  )
}

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: Locale }) {
  const [lang, setLang] = useState<Locale>(initialLang ?? 'en')

  useEffect(() => {
    // Only fall back to localStorage when the server didn't already supply a
    // language via cookie — otherwise the cookie (used for SSR lang/dir) wins.
    if (!initialLang) {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'he') setLang(stored)
    }
  }, [initialLang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    window.localStorage.setItem(STORAGE_KEY, lang)
    // Persist to a cookie too so the server layout can render the correct
    // lang/dir on the next request (IS 5568 first-paint correctness).
    document.cookie = `lang=${lang};path=/;max-age=31536000`
  }, [lang])

  const dir = lang === 'he' ? 'rtl' : 'ltr'

  function toggleLanguage() {
    setLang(prev => (prev === 'en' ? 'he' : 'en'))
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    return translate(lang, key, vars)
  }

  return (
    <LanguageContext.Provider value={{ lang, dir, toggleLanguage, t, messages: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
