import Link from "next/link"

// Two small links for menus and footers. Plain strings (like HelpWidget) so it can sit in both
// the host and the cleaner header, which use different translation systems.
export default function LegalLinks({ lang }: { lang: "en" | "he" }) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <Link href="/terms" className="hover:underline">{lang === "he" ? "תנאי שימוש" : "Terms"}</Link>
      <Link href="/privacy" className="hover:underline">{lang === "he" ? "פרטיות" : "Privacy"}</Link>
    </div>
  )
}
