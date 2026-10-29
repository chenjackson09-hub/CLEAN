"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

// Shown on top of the app to a cleaner/host who made an account but never submitted the
// sign-up wizard. Spans both i18n systems, so (like HelpWidget) it reads the language off
// <html dir> and keeps its own two strings.
const STRINGS = {
  en: { text: "Your profile isn't finished yet.", cta: "Finish your profile" },
  he: { text: "הפרופיל שלך עדיין לא הושלם.", cta: "השלמת הפרופיל" },
}

export default function FinishProfileBanner({ href }: { href: string }) {
  const [lang, setLang] = useState<"en" | "he">("en")

  useEffect(() => {
    const read = () => setLang(document.documentElement.dir === "rtl" ? "he" : "en")
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] })
    return () => observer.disconnect()
  }, [])

  const s = STRINGS[lang]
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
      <span>{s.text}</span>
      <Link href={href} className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-600">
        {s.cta}
      </Link>
    </div>
  )
}
