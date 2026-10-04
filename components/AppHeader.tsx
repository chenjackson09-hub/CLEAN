"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type HeaderItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

// Two-row header shared by the host and cleaner layouts: brand + menu +
// profile picture on top, the main tabs underneath. Uses logical (start/end)
// utilities only, so Hebrew mirrors it right-to-left with no extra code. The
// callers own their own i18n and sign-out flow and pass the menu body in.
export default function AppHeader({
  items,
  profileHref,
  profileMatch,
  profileLabel,
  avatarUrl,
  userName,
  menuLabel,
  children,
}: {
  items: HeaderItem[];
  profileHref: string;
  profileMatch: string[];
  profileLabel: string;
  avatarUrl: string | null;
  userName: string;
  menuLabel: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const onProfile = profileMatch.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const initial = (userName.trim().charAt(0) || "?").toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="relative flex items-center justify-between px-4 h-12">
        <span className="text-lg font-bold text-blue-600">Clean</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuLabel}
            aria-expanded={menuOpen}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
              menuOpen ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Link
            href={profileHref}
            aria-label={profileLabel}
            className={`w-9 h-9 rounded-lg overflow-hidden bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0 ${
              onProfile ? "ring-2 ring-blue-500 ring-offset-1" : ""
            }`}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              initial
            )}
          </Link>
        </div>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute end-3 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4 flex flex-col gap-3">
              {children(() => setMenuOpen(false))}
            </div>
          </>
        )}
      </div>

      <nav className="flex items-stretch justify-around lg:justify-center lg:gap-4 px-2 pb-1.5 border-t border-gray-100">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:gap-2 mt-1.5 px-2 lg:px-5 py-1.5 rounded-lg transition-colors ${
                active ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="relative w-5 h-5 shrink-0">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] lg:text-sm mt-0.5 lg:mt-0">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
