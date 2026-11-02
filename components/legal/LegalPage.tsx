"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { LanguageToggle } from "@/lib/i18n/LanguageToggle"
import { LEGAL_DRAFT, legalDoc } from "@/lib/legal/content"

// The public Terms of Use / Privacy Policy page. Readable signed out (people read it before
// they have an account), in English or Hebrew with the usual language toggle.
export default function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const { t, lang } = useLanguage()
  const doc = legalDoc(kind, lang === "he" ? "he" : "en")
  const other = kind === "terms" ? { href: "/privacy", label: t("legal.privacyTitle") } : { href: "/terms", label: t("legal.termsTitle") }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <article className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">{t("legal.back")}</Link>
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
        <p className="text-xs text-gray-400 mt-1">{doc.updated}</p>
        {LEGAL_DRAFT && (
          <p role="note" className="text-sm text-amber-900 bg-amber-50 ring-1 ring-amber-200 rounded-xl px-3 py-2 mt-4">{t("legal.draftNotice")}</p>
        )}
        <p className="text-sm text-gray-700 mt-4">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-6">
            <h2 className="text-base font-semibold text-gray-900">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="text-sm text-gray-700 leading-relaxed mt-2">{p}</p>
            ))}
          </section>
        ))}
        <p className="mt-8 text-sm"><Link href={other.href} className="text-blue-600 hover:underline">{other.label}</Link></p>
      </article>
    </div>
  )
}
