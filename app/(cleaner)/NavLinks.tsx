"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/LangContext";
import type { TranslationKey } from "@/lib/lang";

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  {
    href: "/cleaner/dashboard",
    labelKey: "nav_home",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4-8h4m6 0v8m0-8h4" />
      </svg>
    ),
  },
  {
    href: "/cleaner/requests",
    labelKey: "nav_requests",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-4v4" />
      </svg>
    ),
  },
  {
    href: "/cleaner/availability",
    labelKey: "nav_availability",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/cleaner/preview",
    labelKey: "nav_profile",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

const STATUS_KEY: Record<string, TranslationKey> = {
  approved: "status_approved",
  pending: "status_pending",
  rejected: "status_rejected",
  suspended: "status_suspended",
};

interface Props {
  signOut: () => Promise<void>;
  userName: string;
  status: string | null;
  statusColor: string;
}

export default function NavLinks({ signOut, userName, status, statusColor }: Props) {
  const { lang, setLang, t } = useLang();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const pathname = usePathname();

  const statusLabel = status ? t(STATUS_KEY[status] ?? ("status_pending" as TranslationKey)) : null;

  const LangButtons = (
    <div className="flex gap-1">
      <button
        onClick={() => setLang("en")}
        className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
          lang === "en" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("he")}
        className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
          lang === "he" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        HE
      </button>
    </div>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 gap-2">
          {/* Logo + lang buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-blue-600">Clean</span>
            {LangButtons}
          </div>

          {/* Nav items — Link-based for instant prefetched navigation */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col lg:flex-row items-center lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="w-5 h-5 shrink-0">{item.icon}</span>
                <span className="text-[10px] lg:text-sm mt-0.5 lg:mt-0">{t(item.labelKey)}</span>
              </Link>
            ))}
          </nav>

          {/* Right side: user info + sign out */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <span className="hidden lg:inline text-sm text-gray-700 font-medium truncate max-w-[140px]">{userName}</span>
            {statusLabel && (
              <span className={`hidden lg:inline text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            )}
            <button
              onClick={() => setConfirmSignOut(true)}
              className="text-xs lg:text-sm text-white bg-[#dc2626] hover:bg-red-700 transition-colors rounded-lg px-2.5 lg:px-3 py-1.5 font-medium shrink-0"
            >
              {t("nav_signout")}
            </button>
          </div>
        </div>
      </header>

      {confirmSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmSignOut(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold text-gray-900 text-center">{t("nav_areyousure")}</p>
            <form action={signOut} className="flex flex-col gap-2">
              <button type="submit" className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-semibold rounded-xl py-2.5 transition-colors">
                {t("nav_yes_signout")}
              </button>
              <button type="button" onClick={() => setConfirmSignOut(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-2.5 transition-colors">
                {t("nav_cancel")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
