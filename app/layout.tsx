import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CLEAN",
  description: "Clean — book verified cleaners near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // IS 5568: the lang/dir must be correct on the server-rendered HTML, not only
  // applied client-side after hydration. Read the persisted language cookie
  // (written by both i18n providers) so the first paint matches the content.
  const cookieLang = cookies().get("lang")?.value;
  const lang = cookieLang === "he" ? "he" : "en";
  const dir = lang === "he" ? "rtl" : "ltr";
  const skipLabel = lang === "he" ? "דלג לתוכן הראשי" : "Skip to main content";
  const a11yLabel = lang === "he" ? "הצהרת נגישות" : "Accessibility statement";

  return (
    <html lang={lang} dir={dir}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Skip-navigation link (IS 5568). Off-screen until focused; uses the
            logical `start` inset so it positions correctly in RTL and LTR. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow focus:ring-2 focus:ring-blue-600"
        >
          {skipLabel}
        </a>
        <LanguageProvider initialLang={cookieLang === "he" ? "he" : cookieLang === "en" ? "en" : undefined}>
          {children}
        </LanguageProvider>
        <footer className="py-4 text-center text-sm">
          <Link href="/accessibility" className="text-gray-600 underline hover:text-gray-900">
            {a11yLabel}
          </Link>
        </footer>
      </body>
    </html>
  );
}
