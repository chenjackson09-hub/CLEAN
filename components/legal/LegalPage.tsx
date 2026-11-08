"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { LanguageToggle } from "@/lib/i18n/LanguageToggle"
import LegalDocument from "./LegalDocument"

// The public Terms of Use / Privacy Policy page. Readable signed out (people read it before
// they have an account), in English or Hebrew with the usual language toggle.
export default function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const { t } = useLanguage()
  const router = useRouter()

  // "Back" returns to wherever the reader came from (e.g. the half-filled sign-up form) when
  // they arrived from inside the app; only a direct visit falls back to the home page.
  function goBack(e: React.MouseEvent) {
    try {
      const fromApp = !!document.referrer && new URL(document.referrer).origin === window.location.origin
      if (fromApp && window.history.length > 1) {
        e.preventDefault()
        router.back()
      }
    } catch {
      /* fall through to the plain link */
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <article className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/" onClick={goBack} className="text-sm text-blue-600 hover:underline">{t("legal.back")}</Link>
          <LanguageToggle />
        </div>
        <LegalDocument kind={kind} />
      </article>
    </div>
  )
}
