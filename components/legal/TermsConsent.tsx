"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"

// "I agree to the Terms of Use and the Privacy Policy". The links open in a new tab so nobody
// loses what they have typed. Controlled by the page; the page decides what ticking unlocks.
export default function TermsConsent({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { t } = useLanguage()
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        {t("legal.consentIntro")}
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t("legal.termsLink")}</Link>
        {t("legal.consentAnd")}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t("legal.privacyLink")}</Link>
      </span>
    </label>
  )
}
