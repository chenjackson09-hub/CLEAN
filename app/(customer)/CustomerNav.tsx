"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import AppHeader from "@/components/AppHeader";

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    labelHe: "בית",
    icon: (
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
</svg>
    ),
  },
  {
    href: "/browse",
    label: "Schedule",
    labelHe: "תזמון",
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
    href: "/chat",
    label: "Chat",
    labelHe: "צ'אט",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6 3.5-3.5H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
      </svg>
    ),
  },
];

interface Props {
  signOut: () => Promise<void>;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  acceptedCount?: number;
}

export default function CustomerNav({ signOut, userId, userName, avatarUrl = null, acceptedCount = 0 }: Props) {
  const { lang, toggleLanguage } = useLanguage();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

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
      <AppHeader
        userId={userId}
        items={NAV_ITEMS.map((item) => ({
          href: item.href,
          label: lang === "he" ? item.labelHe : item.label,
          icon: item.icon,
          badge: item.href === "/bookings" ? acceptedCount : undefined,
        }))}
        profileHref="/profile"
        profileMatch={["/profile"]}
        profileLabel={lang === "he" ? "פרופיל" : "Profile"}
        avatarUrl={avatarUrl}
        userName={userName}
        menuLabel={lang === "he" ? "תפריט" : "Menu"}
      >
        {(close) => (
          <>
            <p className="text-sm text-gray-700 font-medium truncate">{userName}</p>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">{lang === "he" ? "שפה" : "Language"}</p>
              {LangButtons}
            </div>
            <button
              onClick={() => { close(); setConfirmSignOut(true); }}
              className="w-full text-sm text-white bg-[#dc2626] hover:bg-red-700 transition-colors rounded-lg px-3 py-2 font-medium"
            >
              {lang === "he" ? "התנתק" : "Sign out"}
            </button>
          </>
        )}
      </AppHeader>

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
