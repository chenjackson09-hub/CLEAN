"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translations } from "@/lib/lang";
import type { Lang, TranslationKey } from "@/lib/lang";
import type { ReactNode } from "react";

// Adapter: delegates to the shared LanguageProvider in app/layout.tsx.
// Also sets a cookie so server-rendered cleaner pages can read the language.
export function useLang() {
  const { lang, toggleLanguage } = useLanguage();
  const router = useRouter();

  const setLang = useCallback(
    (newLang: Lang) => {
      if (newLang === (lang as Lang)) return;
      // Persist in cookie for server components that read cookies().get("lang")
      document.cookie = `lang=${newLang};path=/;max-age=31536000`;
      toggleLanguage();
      // Re-render server components so they pick up the new cookie
      router.refresh();
    },
    [lang, toggleLanguage, router]
  );

  const t = useCallback(
    (key: TranslationKey): string =>
      (translations[lang as Lang] ?? translations.en)[key] ?? translations.en[key],
    [lang]
  );

  return { lang: lang as Lang, setLang, t };
}

// No-op: LanguageProvider in app/layout.tsx already wraps the whole tree.
// Kept only so existing `<LangProvider>` imports keep working.
export function LangProvider({ children }: { initialLang?: Lang; children: ReactNode }) {
  return <>{children}</>;
}
