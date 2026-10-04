"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { sendSupportMessage } from "@/lib/actions/support";

// Self-contained floating "Need help?" widget rendered on every cleaner and
// customer page. It sits across both i18n systems (cleaner uses LangContext,
// customer uses LanguageContext), so instead of consuming either context it
// reads the current language off `document.documentElement.dir` — which both
// systems keep in sync (rtl ⇒ Hebrew) — and picks its own strings.
const STRINGS = {
  en: {
    open: "Need help?",
    title: "Need help? Contact us!",
    subtitle: "Send us a message and our team will get back to you.",
    placeholder: "How can we help?",
    send: "Send",
    sending: "Sending…",
    sent: "Thanks! We got your message and will be in touch.",
    close: "Close",
    empty: "Please enter a message.",
  },
  he: {
    open: "צריכים עזרה?",
    title: "צריכים עזרה? דברו איתנו!",
    subtitle: "שלחו לנו הודעה והצוות שלנו יחזור אליכם.",
    placeholder: "איך נוכל לעזור?",
    send: "שליחה",
    sending: "שולח…",
    sent: "תודה! קיבלנו את ההודעה וניצור קשר.",
    close: "סגירה",
    empty: "נא להזין הודעה.",
  },
} as const;

export default function HelpWidget() {
  const pathname = usePathname();
  const [lang, setLang] = useState<"en" | "he">("en");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The bubble can be dragged anywhere so it never sits on top of page
  // controls (e.g. the calendar's "+"). `pos` is the button's top-left in
  // viewport px; null = the default bottom-end corner. Remembered per device.
  const BUBBLE = 56;
  const MIN_TOP = 112; // keep clear of the fixed two-row header
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.min(Math.max(8, x), window.innerWidth - BUBBLE - 8),
    y: Math.min(Math.max(MIN_TOP, y), window.innerHeight - BUBBLE - 8),
  }), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("helpWidgetPos");
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        if (typeof p.x === "number" && typeof p.y === "number") setPos(clamp(p.x, p.y));
      }
    } catch {}
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
    const next = clamp(e.clientX - d.dx, e.clientY - d.dy);
    setPos(next);
    if (open) setAnchor(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d?.moved) {
      setPos((p) => {
        if (p) {
          try { window.localStorage.setItem("helpWidgetPos", JSON.stringify(p)); } catch {}
        }
        return p;
      });
      // swallow the click that follows a drag
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
    }
  }
  const suppressClick = useRef(false);

  function toggle() {
    if (suppressClick.current) return;
    if (open) return reset();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ x: r.left, y: r.top });
    setOpen(true);
  }

  // Track the document direction so the widget matches the active language.
  useEffect(() => {
    const sync = () =>
      setLang(document.documentElement.dir === "rtl" ? "he" : "en");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open && status === "idle") textareaRef.current?.focus();
  }, [open, status]);

  const t = STRINGS[lang];

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) {
      setError(t.empty);
      return;
    }
    setStatus("sending");
    setError(null);
    const result = await sendSupportMessage(trimmed);
    if ("error" in result) {
      setError(result.error);
      setStatus("idle");
      return;
    }
    setStatus("sent");
    setMessage("");
  }

  function reset() {
    setOpen(false);
    // Let the close animation finish before clearing the sent state.
    setTimeout(() => {
      setStatus("idle");
      setError(null);
    }, 200);
  }

  // The floating bubble would sit on top of a chat thread's send button.
  if (/^\/(cleaner\/)?chat\/[^/]+/.test(pathname ?? "")) return null;

  // Open the panel on the roomier side of the screen, anchored to the bubble.
  let panelStyle: React.CSSProperties | undefined;
  if (open && anchor && typeof window !== "undefined") {
    const up = anchor.y > window.innerHeight / 2;
    const toEnd = anchor.x > window.innerWidth / 2;
    panelStyle = {
      ...(up ? { bottom: window.innerHeight - anchor.y + 12 } : { top: anchor.y + BUBBLE + 12 }),
      ...(toEnd ? { right: 16 } : { left: 16 }),
    };
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          style={panelStyle}
          className="fixed z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl print:hidden"
        >
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
            <div>
              <p className="text-base font-semibold text-gray-900">{t.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label={t.close}
              className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4">
            {status === "sent" ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-sm text-gray-700">{t.sent}</p>
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={4}
                  maxLength={2000}
                  placeholder={t.placeholder}
                  className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={status === "sending"}
                  className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {status === "sending" ? t.sending : t.send}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={pos ? { left: pos.x, top: pos.y, touchAction: "none" } : { touchAction: "none" }}
        aria-label={t.open}
        aria-expanded={open}
        className={`fixed z-30 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 active:cursor-grabbing print:hidden ${pos ? "" : "bottom-4 end-4"}`}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
    </>
  );
}
