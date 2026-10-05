"use client";

import { useState } from "react";
import { useLang } from "@/context/LangContext";
import AppHeader from "@/components/AppHeader";
import type { TranslationKey } from "@/lib/lang";

const NAV_ITEMS: { href: string; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  {
    href: "/cleaner/dashboard",
    labelKey: "nav_home",
    icon: (
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
    href: "/cleaner/chat",
    labelKey: "nav_messages",
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
  statusBadge?: React.ReactNode;
  pendingCount?: number;
}

export default function NavLinks({ signOut, userId, userName, avatarUrl = null, statusBadge, pendingCount = 0 }: Props) {
  const { lang, setLang, t } = useLang();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

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
      <AppHeader
        userId={userId}
        items={NAV_ITEMS.map((item) => ({
          href: item.href,
          label: t(item.labelKey),
          icon: item.icon,
          badge: item.href === "/cleaner/requests" ? pendingCount : undefined,
        }))}
        profileHref="/cleaner/preview"
        profileMatch={["/cleaner/preview", "/cleaner/profile"]}
        profileLabel={t("nav_profile")}
        avatarUrl={avatarUrl}
        userName={userName}
        menuLabel={lang === "he" ? "תפריט" : "Menu"}
      >
        {(close) => (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700 font-medium truncate">{userName}</span>
              {statusBadge}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">{lang === "he" ? "שפה" : "Language"}</p>
              {LangButtons}
            </div>
            <button
              onClick={() => { close(); setConfirmSignOut(true); }}
              className="w-full text-sm text-white bg-[#dc2626] hover:bg-red-700 transition-colors rounded-lg px-3 py-2 font-medium"
            >
              {t("nav_signout")}
            </button>
          </>
        )}
      </AppHeader>

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
