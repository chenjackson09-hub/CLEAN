"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { LanguageToggle } from "@/lib/i18n/LanguageToggle"
import LegalDocument from "./LegalDocument"

type Kind = "terms" | "privacy"

// "I agree to the Terms of Use and the Privacy Policy". The two names open the document in a
// reader ON TOP of the page (not a new tab or a new page), so a person who is partway through
// signing up reads it and closes it with everything they typed still in place. Controlled by
// the page; the page decides what ticking unlocks.
export default function TermsConsent({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { t } = useLanguage()
  const [reading, setReading] = useState<Kind | null>(null)

  useEffect(() => {
    if (!reading) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setReading(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [reading])

  const open = (k: Kind) => (e: React.MouseEvent) => { e.preventDefault(); setReading(k) }
  const linkClass = "text-blue-600 underline"

  return (
    <>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
        <span>
          {t("legal.consentIntro")}
          <button type="button" onClick={open("terms")} className={linkClass}>{t("legal.termsLink")}</button>
          {t("legal.consentAnd")}
          <button type="button" onClick={open("privacy")} className={linkClass}>{t("legal.privacyLink")}</button>
        </span>
      </label>
      {reading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setReading(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={reading === "terms" ? t("legal.termsTitle") : t("legal.privacyTitle")}
            className="bg-white w-full sm:max-w-2xl max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
              <button type="button" onClick={() => setReading(null)} className="text-sm font-medium text-blue-600 hover:underline">{t("legal.close")}</button>
              <LanguageToggle />
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-8">
              <LegalDocument kind={reading} onOther={setReading} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
