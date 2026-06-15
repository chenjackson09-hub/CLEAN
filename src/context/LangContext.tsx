"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translations } from "@/lib/lang";
import type { Lang, TranslationKey } from "@/lib/lang";
import type { ReactNode } from "react";

// Adapter: delegates to the shared LanguageProvider in app/layout.tsx.
// All cleaner components that call useLang() / t() continue to work unchanged.
export function useLang() {
  const { lang, toggleLanguage } = useLanguage();

  function setLang(newLang: Lang) {
    if (newLang !== (lang as Lang)) toggleLanguage();
  }

  function t(key: TranslationKey): string {
    return (translations[lang as Lang] ?? translations.en)[key] ?? translations.en[key];
  }

  return { lang: lang as Lang, setLang, t };
}

// No longer needed — LanguageProvider in app/layout.tsx covers everything.
// Kept so src/app/layout.tsx doesn't break.
export function LangProvider({ children }: { initialLang?: Lang; children: ReactNode }) {
  return <>{children}</>;
}
