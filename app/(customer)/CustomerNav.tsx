"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const NAV_ITEMS = [
  {
    href: "/browse",
    label: "Browse",
    labelHe: "חיפוש",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: "/bookings",
    label: "Bookings",
    labelHe: "הזמנות",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    labelHe: "פרופיל",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

interface Props {
  signOut: () => Promise<void>;
  userName: string;
}

export default function CustomerNav({ signOut, userName }: Props) {
  const { lang, toggleLanguage } = useLanguage();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const pathname = usePathname();

  const LangButtons = (
    <div className="flex gap-1">
      <button
        onClick={() => lang !== "en" && toggleLanguage()}
        className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
          lang === "en" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => lang !== "he" && toggleLanguage()}
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
          {/* Logo + lang */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-blue-600">Clean</span>
            {LangButtons}
          </div>

          {/* Nav items — Link-based for instant prefetched navigation */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const label = lang === "he" ? item.labelHe : item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col lg:flex-row items-center lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="w-5 h-5 shrink-0">{item.icon}</span>
                  <span className="text-[10px] lg:text-sm mt-0.5 lg:mt-0">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User + sign out */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <span className="hidden lg:inline text-sm text-gray-700 font-medium truncate max-w-[140px]">
              {userName}
            </span>
            <button
              onClick={() => setConfirmSignOut(true)}
              className="text-xs lg:text-sm text-white bg-[#dc2626] hover:bg-red-700 transition-colors rounded-lg px-2.5 lg:px-3 py-1.5 font-medium shrink-0"
            >
              {lang === "he" ? "התנתק" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {confirmSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmSignOut(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-72 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold text-gray-900 text-center">
              {lang === "he" ? "האם אתה בטוח?" : "Sign out?"}
            </p>
            <form action={signOut} className="flex flex-col gap-2">
              <button type="submit" className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-semibold rounded-xl py-2.5 transition-colors">
                {lang === "he" ? "כן, התנתק" : "Yes, sign out"}
              </button>
              <button type="button" onClick={() => setConfirmSignOut(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-2.5 transition-colors">
                {lang === "he" ? "ביטול" : "Cancel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
