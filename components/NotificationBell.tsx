"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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

const PAGE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const COLUMNS = "id, kind, data, href, read_at, created_at";

const STRINGS = {
  en: {
    title: "Notifications", markAll: "Mark all as read", empty: "You're all caught up.", emptyUnread: "No unread notifications.",
    bell: "Notifications", all: "All", unread: "Unread", fresh: "New", earlier: "Earlier", loading: "Loading…",
  },
  he: {
    title: "התראות", markAll: "סימון הכל כנקרא", empty: "אין התראות חדשות.", emptyUnread: "אין התראות שלא נקראו.",
    bell: "התראות", all: "הכל", unread: "שלא נקראו", fresh: "חדשות", earlier: "קודמות", loading: "טוען…",
  },
} as const;

// Who a notification is about: their profile picture (stored with the notification),
// or their initial when they have none. System messages (account approved/rejected)
// get a plain bell badge instead.
function NotificationAvatar({ item }: { item: Item }) {
  const avatar = typeof item.data?.avatar === "string" ? item.data.avatar : null;
  const name = typeof item.data?.name === "string" ? item.data.name.trim() : "";
  const isSystem = item.kind.startsWith("account_") || !name;
  return (
    <span className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
      {avatar ? (
        <Image src={avatar} alt="" width={44} height={44} className="object-cover w-full h-full" />
      ) : isSystem ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

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
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Guards against a slow earlier fetch landing after the filter changed.
  const requestId = useRef(0);

  const fetchPage = useCallback(async (f: "all" | "unread", before?: string) => {
    let q = createClient().from("notifications").select(COLUMNS).order("created_at", { ascending: false }).limit(PAGE + 1);
    if (f === "unread") q = q.is("read_at", null);
    if (before) q = q.lt("created_at", before);
    const { data } = await q;
    const rows = (data ?? []) as Item[];
    return { rows: rows.slice(0, PAGE), more: rows.length > PAGE };
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const [page, { count }] = await Promise.all([
      fetchPage(filter),
      createClient().from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (id !== requestId.current) return;
    setItems(page.rows);
    setHasMore(page.more);
    setUnread(count ?? 0);
  }, [fetchPage, filter]);

  // Older history loads as the list is scrolled near its end (no page cap — it
  // keeps going back through everything the user ever received).
  async function loadMore() {
    if (loadingMore || !hasMore || items.length === 0) return;
    const id = requestId.current;
    setLoadingMore(true);
    const page = await fetchPage(filter, items[items.length - 1].created_at);
    if (id === requestId.current) {
      setItems((prev) => [...prev, ...page.rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setHasMore(page.more);
    }
    setLoadingMore(false);
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) void loadMore();
  }

  useEffect(() => {
    void load();
  }, [load]);

  const refreshCount = useCallback(async () => {
    const { count } = await createClient().from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    setUnread(count ?? 0);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Item;
          setItems((prev) => {
            if (prev.some((i) => i.id === n.id)) return prev;
            // A grouped chat entry replaces the earlier one for the same conversation.
            const rest =
              n.kind === "chat_message"
                ? prev.filter((i) => !(i.kind === "chat_message" && !i.read_at && i.data?.conversation === n.data?.conversation))
                : prev;
            return [n, ...rest];
          });
          // A grouped chat entry may replace an unread one, so recount; others just add one.
          if (n.kind === "chat_message") void refreshCount();
          else if (!n.read_at) setUnread((u) => u + 1);
        }
      )
      // Rows read elsewhere (e.g. opening a chat marks its message entry read).
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Item;
          setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: n.read_at } : i)));
          void refreshCount();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshCount]);

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
            <div className="flex gap-2 px-4 pt-2 pb-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    filter === f ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {f === "all" ? s.all : s.unread}
                </button>
              ))}
            </div>
            <div onScroll={onScroll} className="max-h-[70vh] overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">{filter === "unread" ? s.emptyUnread : s.empty}</p>
              ) : (
                [
                  { key: "new", title: s.fresh, rows: items.filter((i) => now.getTime() - new Date(i.created_at).getTime() < DAY_MS) },
                  { key: "earlier", title: s.earlier, rows: items.filter((i) => now.getTime() - new Date(i.created_at).getTime() >= DAY_MS) },
                ].map(
                  (section) =>
                    section.rows.length > 0 && (
                      <section key={section.key}>
                        <h3 className="px-4 pt-3 pb-1 text-base font-bold text-gray-900">{section.title}</h3>
                        <ul>
                          {section.rows.map((item) => {
                            const text = describeNotification(item.kind, item.data ?? {}, lang);
                            if (!text) return null;
                            const unreadItem = !item.read_at;
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => openItem(item)}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-gray-50 ${unreadItem ? "bg-blue-50/60" : ""}`}
                                >
                                  <NotificationAvatar item={item} />
                                  <span className="min-w-0 flex-1">
                                    <span className={`block text-sm ${unreadItem ? "font-semibold text-gray-900" : "text-gray-700"}`}>{text}</span>
                                    <span className={`block text-xs mt-0.5 ${unreadItem ? "text-blue-600" : "text-gray-400"}`}>
                                      {relativeTime(item.created_at, now, lang)}
                                    </span>
                                  </span>
                                  {unreadItem && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" aria-hidden />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )
                )
              )}
              {loadingMore && <p className="px-4 py-3 text-center text-xs text-gray-400">{s.loading}</p>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
