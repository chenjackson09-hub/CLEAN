"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDocLang } from "./useDocLang";
import { sendMessage, loadOlderMessages } from "@/lib/actions/chat";
import {
  buildTimeline,
  firstName,
  formatBookingDate,
  formatDividerLabel,
  mergeMessages,
  type ChatBookingCard,
  type ChatMessage,
} from "@/lib/chatFormat";

// Own EN/HE strings (the chat spans both i18n systems; see useDocLang).
const STRINGS = {
  en: {
    matchedCleaner: "Matched cleaner",
    matchedHost: "Matched host",
    placeholder: "Message {name}…",
    send: "Send message",
    back: "Back to messages",
    upcoming: "Upcoming Clean",
    completed: "Clean Completed",
    cancelled: "Clean Cancelled",
    start: "Start",
    rate: "Rate",
    location: "Location",
    perHour: "/hr",
    loadEarlier: "Load earlier messages",
    loading: "Loading…",
    empty: "You're matched! Say hello.",
    failed: "Not sent. Tap to retry.",
    sending: "Sending…",
    expand: "Show details",
    collapse: "Hide details",
  },
  he: {
    matchedCleaner: "מנקה מותאמת",
    matchedHost: "מארח מותאם",
    placeholder: "הודעה ל{name}…",
    send: "שליחת הודעה",
    back: "חזרה להודעות",
    upcoming: "ניקיון קרוב",
    completed: "הניקיון הושלם",
    cancelled: "הניקיון בוטל",
    start: "התחלה",
    rate: "תעריף",
    location: "מיקום",
    perHour: "/שעה",
    loadEarlier: "טעינת הודעות קודמות",
    loading: "טוען…",
    empty: "יש התאמה! אפשר להגיד שלום.",
    failed: "לא נשלחה. הקישו לניסיון חוזר.",
    sending: "שולח…",
    expand: "הצגת פרטים",
    collapse: "הסתרת פרטים",
  },
} as const;

type Lang = keyof typeof STRINGS;

function BookingCard({ card, lang }: { card: ChatBookingCard; lang: Lang }) {
  const s = STRINGS[lang];
  const isCompleted = card.status === "completed";
  const isCancelled = card.status === "cancelled";
  // Upcoming (accepted) cards open by default; past ones start collapsed.
  const [open, setOpen] = useState(!isCompleted && !isCancelled);
  const panelId = `chat-card-${card.booking_id}`;
  const title = `${isCompleted ? s.completed : isCancelled ? s.cancelled : s.upcoming} — ${formatBookingDate(card.scheduled_date, lang)}`;

  const rows: [string, string][] = [
    [s.start, card.scheduled_start.slice(0, 5)],
  ];
  if (card.hourly_rate != null) rows.push([s.rate, `₪${card.hourly_rate}${s.perHour}`]);
  if (card.address) rows.push([s.location, card.address]);

  return (
    <div className="rounded-xl bg-[#DDE9F8] border border-[#C9DBF2] text-[#2F5DA8] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${title}. ${open ? s.collapse : s.expand}`}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-start text-sm ${
          isCompleted || isCancelled ? "font-normal" : "font-semibold"
        }`}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span aria-hidden className="text-[10px] shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div id={panelId} className="border-t border-[#C9DBF2] mx-3 py-2.5 text-sm flex flex-col gap-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-[#2F5DA8]/80 shrink-0">{label}</span>
              <span className="font-medium text-end break-words min-w-0">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatView({
  conversationId,
  currentUserId,
  currentUserRole,
  other,
  initialMessages,
  initialHasMore,
  cards,
  backHref,
}: {
  conversationId: string;
  currentUserId: string;
  currentUserRole: "host" | "cleaner";
  other: { id: string; name: string; displayName: string; avatarUrl: string | null };
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  cards: ChatBookingCard[];
  backHref: string;
}) {
  const lang = useDocLang();
  const s = STRINGS[lang];
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draft, setDraft] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loadingOlder, startLoadingOlder] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => setMounted(true), []);

  // Server re-renders (router.refresh after a booking change / reconnect)
  // hand us fresh rows; merge them in rather than replacing local state.
  useEffect(() => {
    setMessages((prev) => mergeMessages(prev, initialMessages));
  }, [initialMessages]);

  // Live updates: new messages, new booking cards, and booking status changes
  // (the cards read `bookings`, so a refresh re-renders them from the source
  // of truth). Realtime honours the tables' RLS, so only participants get rows.
  useEffect(() => {
    const supabase = createClient();
    const bookingFilter =
      currentUserRole === "host" ? `customer_id=eq.${currentUserId}` : `cleaner_id=eq.${currentUserId}`;
    let hasConnected = false;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => mergeMessages(prev, [m]));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_bookings", filter: `conversation_id=eq.${conversationId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: bookingFilter },
        () => router.refresh()
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // After a reconnect, pull anything we missed while offline.
        if (hasConnected) router.refresh();
        hasConnected = true;
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, currentUserRole, router]);

  const timeline = useMemo(() => buildTimeline(messages, cards, mounted), [messages, cards, mounted]);

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [timeline]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const deliver = useCallback(
    async (clientId: string, body: string) => {
      const res = await sendMessage(conversationId, body, clientId);
      if ("error" in res) {
        setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...m, status: "failed" } : m)));
        return;
      }
      setMessages((prev) => mergeMessages(prev, [res.message]));
    },
    [conversationId]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const clientId = crypto.randomUUID();
    stickToBottom.current = true;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${clientId}`,
        client_id: clientId,
        sender_id: currentUserId,
        body,
        created_at: new Date().toISOString(),
        status: "sending",
      },
    ]);
    setDraft("");
    void deliver(clientId, body);
  };

  const retry = (m: ChatMessage) => {
    if (!m.client_id) return;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "sending" } : x)));
    void deliver(m.client_id, m.body);
  };

  const loadEarlier = () => {
    const oldest = messages.find((m) => !m.status);
    if (!oldest) return;
    startLoadingOlder(async () => {
      const res = await loadOlderMessages(conversationId, oldest.created_at);
      if ("error" in res) return;
      stickToBottom.current = false;
      setMessages((prev) => mergeMessages(prev, res.messages));
      setHasMore(res.hasMore);
    });
  };

  const now = new Date();
  const subtitle = currentUserRole === "host" ? s.matchedCleaner : s.matchedHost;

  return (
    <div className="flex flex-col h-[calc(100dvh-5.25rem)] -mx-3 sm:mx-auto sm:max-w-xl bg-[#F5F3EE] sm:rounded-2xl sm:border sm:border-gray-200 overflow-hidden">
      <header className="flex items-center gap-3 bg-white px-4 py-3 border-b border-gray-200 shrink-0">
        <Link href={backHref} aria-label={s.back} className="text-gray-400 hover:text-gray-700 text-lg leading-none rtl:rotate-180">
          ‹
        </Link>
        <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden shrink-0 flex items-center justify-center text-blue-600 font-bold">
          {other.avatarUrl ? (
            <Image src={other.avatarUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
          ) : (
            other.displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{other.displayName}</p>
          <p className="text-sm text-green-700">{subtitle}</p>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {hasMore && (
          <button
            type="button"
            onClick={loadEarlier}
            disabled={loadingOlder}
            className="self-center text-xs text-gray-500 hover:text-gray-800 disabled:opacity-60"
          >
            {loadingOlder ? s.loading : s.loadEarlier}
          </button>
        )}
        {timeline.length === 0 && <p className="text-center text-sm text-gray-400 my-auto">{s.empty}</p>}
        {timeline.map((item) => {
          if (item.kind === "divider") {
            return (
              <p key={item.key} className="text-center text-xs text-gray-400 my-1">
                — {formatDividerLabel(item.date, now, lang)} —
              </p>
            );
          }
          if (item.kind === "card") return <BookingCard key={item.key} card={item.card} lang={lang} />;

          const m = item.message;
          const mine = m.sender_id === currentUserId;
          // Host messages are always right-aligned #E8E4DC, cleaner messages
          // always left-aligned white — regardless of who is viewing.
          const fromHost = currentUserRole === "host" ? mine : !mine;
          return (
            <div key={item.key} className={`flex flex-col ${fromHost ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm text-gray-900 whitespace-pre-wrap break-words ${
                  fromHost ? "bg-[#E8E4DC]" : "bg-white border border-gray-200 shadow-sm"
                } ${m.status ? "opacity-70" : ""}`}
              >
                {m.body}
              </div>
              {m.status === "failed" && (
                <button type="button" onClick={() => retry(m)} className="mt-1 text-xs text-red-600">
                  {s.failed}
                </button>
              )}
              {m.status === "sending" && <span className="mt-1 text-[11px] text-gray-400">{s.sending}</span>}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-2 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 shrink-0"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder={s.placeholder.replace("{name}", firstName(other.name))}
          aria-label={s.placeholder.replace("{name}", firstName(other.name))}
          className="flex-1 min-w-0 rounded-full bg-[#F5F3EE] px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={s.send}
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 disabled:opacity-40 rtl:rotate-180"
        >
          →
        </button>
      </form>
    </div>
  );
}
