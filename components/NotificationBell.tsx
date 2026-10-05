"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { describeNotification, relativeTime, type NotificationData } from "@/lib/notificationText";
import { useDocLang } from "@/components/chat/useDocLang";

type Item = {
  id: string;
  kind: string;
  data: NotificationData;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const PAGE = 30;
const COLUMNS = "id, kind, data, href, read_at, created_at";

const STRINGS = {
  en: { title: "Notifications", markAll: "Mark all as read", empty: "You're all caught up.", bell: "Notifications" },
  he: { title: "התראות", markAll: "סימון הכל כנקרא", empty: "אין התראות חדשות.", bell: "התראות" },
} as const;

// Facebook-style bell for the header: an unread count on the icon and a
// dropdown with the latest updates, newest first. Reads the signed-in user's own
// rows (RLS) and listens for new ones live. The parent owns open/closed so the
// bell and the account menu can't both be open.
export default function NotificationBell({
  userId,
  open,
  onToggle,
  onClose,
}: {
  userId: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const lang = useDocLang();
  const s = STRINGS[lang];
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select(COLUMNS).order("created_at", { ascending: false }).limit(PAGE),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    setItems((data ?? []) as Item[]);
    setUnread(count ?? 0);
  }, []);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Item;
          setItems((prev) => (prev.some((i) => i.id === n.id) ? prev : [n, ...prev].slice(0, PAGE)));
          if (!n.read_at) setUnread((u) => u + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: now })));
    setUnread(0);
    await createClient().from("notifications").update({ read_at: now }).is("read_at", null);
  }

  async function openItem(item: Item) {
    onClose();
    if (!item.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read_at: now } : i)));
      setUnread((u) => Math.max(0, u - 1));
      await createClient().from("notifications").update({ read_at: now }).eq("id", item.id);
    }
    if (item.href) router.push(item.href);
  }

  const now = new Date();

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={unread > 0 ? `${s.bell} (${unread})` : s.bell}
        aria-expanded={open}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
          open ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-100"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-600 rounded-full">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            role="dialog"
            aria-label={s.title}
            className="absolute end-3 top-full mt-1 w-[22rem] max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900">{s.title}</p>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-300"
              >
                {s.markAll}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">{s.empty}</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {items.map((item) => {
                    const text = describeNotification(item.kind, item.data ?? {}, lang);
                    if (!text) return null;
                    const unreadItem = !item.read_at;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openItem(item)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-gray-50 ${unreadItem ? "bg-blue-50/60" : ""}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${unreadItem ? "font-semibold text-gray-900" : "text-gray-700"}`}>{text}</span>
                            <span className={`block text-xs mt-0.5 ${unreadItem ? "text-blue-600" : "text-gray-400"}`}>
                              {relativeTime(item.created_at, now, lang)}
                            </span>
                          </span>
                          {unreadItem && <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
