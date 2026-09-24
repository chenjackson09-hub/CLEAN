"use client";

import Image from "next/image";
import Link from "next/link";
import { shortName } from "@/lib/chatFormat";
import type { ConversationSummary } from "@/lib/chat";
import { useDocLang } from "./useDocLang";

const STRINGS = {
  en: { title: "Messages", empty: "No conversations yet. Once a cleaner accepts a booking, your chat appears here.", noMessages: "Say hello 👋" },
  he: { title: "הודעות", empty: "אין שיחות עדיין. ברגע שמנקה מאשרת הזמנה, הצ'אט יופיע כאן.", noMessages: "אפשר להגיד שלום 👋" },
} as const;

export default function ConversationListView({
  rows,
  role,
  basePath,
}: {
  rows: ConversationSummary[];
  role: "host" | "cleaner";
  basePath: string;
}) {
  const s = STRINGS[useDocLang()];
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{s.title}</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-2xl shadow-sm p-6 text-center">{s.empty}</p>
      ) : (
        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
          {rows.map((r) => {
            const name = role === "host" ? shortName(r.name) : r.name;
            return (
              <li key={r.otherId}>
                <Link href={`${basePath}/${r.otherId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-11 h-11 rounded-full bg-blue-100 overflow-hidden shrink-0 flex items-center justify-center text-blue-600 font-bold">
                    {r.avatarUrl ? (
                      <Image src={r.avatarUrl} alt="" width={44} height={44} className="object-cover w-full h-full" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{name}</p>
                    <p className="text-sm text-gray-500 truncate">{r.lastBody ?? s.noMessages}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
