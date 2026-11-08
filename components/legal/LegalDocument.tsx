"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { LEGAL_DRAFT, legalDoc } from "@/lib/legal/content"

type Kind = "terms" | "privacy"

// The text of a legal document (title, draft note, sections) and the link to the other one.
// Shared by the public /terms and /privacy pages and by the in-page reader opened from the
// sign-up checkbox. With `onOther` the "other document" control is a button (stays in the
// reader); without it, a normal link to the other page.
export default function LegalDocument({ kind, onOther }: { kind: Kind; onOther?: (kind: Kind) => void }) {
  const { t, lang } = useLanguage()
  const doc = legalDoc(kind, lang === "he" ? "he" : "en")
  const otherKind: Kind = kind === "terms" ? "privacy" : "terms"
  const other = { href: `/${otherKind}`, label: kind === "terms" ? t("legal.privacyTitle") : t("legal.termsTitle") }

  return (
    <>
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
      <p className="mt-8 text-sm">
        {onOther ? (
          <button type="button" onClick={() => onOther(otherKind)} className="text-blue-600 hover:underline">{other.label}</button>
        ) : (
          <Link href={other.href} className="text-blue-600 hover:underline">{other.label}</Link>
        )}
      </p>
    </>
  )
}
