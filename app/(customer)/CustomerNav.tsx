"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    labelHe: "בית",
    icon: (
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-5 h-5">
  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
</svg>
    ),
  },
  {
    href: "/browse",
    label: "Schedule",
    labelHe: "לוח זמנים",
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
  acceptedCount?: number;
}

export default function CustomerNav({ signOut, userName, acceptedCount = 0 }: Props) {
  const { lang, toggleLanguage } = useLanguage();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-blue-600">Clean</span>
          </div>

          {/* Nav items — Link-based for instant prefetched navigation */}
          <nav className="flex items-center gap-4 lg:gap-6">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const label = lang === "he" ? item.labelHe : item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col lg:flex-row items-center lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="w-5 h-5 shrink-0">{item.icon}</span>
                  <span className="text-[10px] lg:text-sm mt-0.5 lg:mt-0">{label}</span>
                  {item.href === "/bookings" && acceptedCount > 0 && (
                    <span className="absolute top-0 right-0 lg:-top-1 lg:-right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-600 rounded-full">
                      {acceptedCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Settings dropdown — holds language + sign out */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className={`flex flex-col lg:flex-row items-center lg:gap-2 px-2 lg:px-3 py-1.5 rounded-lg transition-colors ${
                settingsOpen ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="w-5 h-5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span className="text-[10px] lg:text-sm mt-0.5 lg:mt-0">{lang === "he" ? "הגדרות" : "Settings"}</span>
            </button>

            {settingsOpen && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <div className="absolute end-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4 flex flex-col gap-3">
                  <p className="text-sm text-gray-700 font-medium truncate">{userName}</p>
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">{lang === "he" ? "שפה" : "Language"}</p>
                    {LangButtons}
                  </div>
                  <button
                    onClick={() => { setSettingsOpen(false); setConfirmSignOut(true); }}
                    className="w-full text-sm text-white bg-[#dc2626] hover:bg-red-700 transition-colors rounded-lg px-3 py-2 font-medium"
                  >
                    {lang === "he" ? "התנתק" : "Sign out"}
                  </button>
                </div>
              </>
            )}
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
