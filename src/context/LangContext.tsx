"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { translations } from "@/lib/lang";
import type { Lang, TranslationKey } from "@/lib/lang";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations.en[key],
});

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = useCallback(
    (newLang: Lang) => {
      document.cookie = `lang=${newLang};path=/;max-age=31536000`;
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === "he" ? "rtl" : "ltr";
      setLangState(newLang);
      router.refresh();
    },
    [router]
  );

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key],
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
