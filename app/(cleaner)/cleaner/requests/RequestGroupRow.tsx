"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { respondToBooking } from "../../actions";
import { useLang } from "@/context/LangContext";
import BookingRequestSummary from "@/components/BookingRequestSummary";
import { buildBookingSummaryData, type CustomerHomeInfo } from "@/lib/bookingSummary";
import type { BookingWithCustomer } from "@/types/database";
import { shortDateLabel } from "@/lib/dateLabels";

// One host's still-pending requests for this cleaner. A host who opened up
// several candidate days for one clean sends one request per day; the cleaner
// sees them as one entry and picks the day that works.
export type RequestGroup = {
  key: string;
  customerId: string;
  name: string;
  avatarUrl: string | null;
  bookings: BookingWithCustomer[];
};

function Countdown({ deadline }: { deadline: string }) {
  const { t } = useLang();
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(t("req_expired"));
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}${t("req_h")} ${m}${t("req_m_left")}`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline, t]);

  return <span className="text-xs font-medium text-orange-500 whitespace-nowrap">{remaining}</span>;
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  return (
    <div
      className="shrink-0 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-blue-600 font-bold"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt={name} width={size} height={size} className="object-cover w-full h-full" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function RequestGroupRow({
  group,
  homeInfo,
  hourlyRate,
}: {
  group: RequestGroup;
  homeInfo?: CustomerHomeInfo | null;
  hourlyRate?: number | null;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Days already answered in this session drop out of the list.
  const [answered, setAnswered] = useState<Record<string, "accepted" | "declined">>({});
  const remaining = group.bookings.filter((b) => !answered[b.id]);
  const [selectedId, setSelectedId] = useState(group.bookings[0].id);
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  const accepted = group.bookings.find((b) => answered[b.id] === "accepted") ?? null;
  const selected = remaining.find((b) => b.id === selectedId) ?? remaining[0] ?? null;
  const dayLabel = (b: BookingWithCustomer) => shortDateLabel(b.scheduled_date, lang === "he" ? "he" : "en");

  // Rows in the list read "Thu 15 Oct · 09:00 · 4h", or the dates when there are several.
  const first = group.bookings[0];
  const subtitle =
    group.bookings.length === 1
      ? `${dayLabel(first)} · ${first.scheduled_start.slice(0, 5)} · ${first.duration_hours}${t("req_h")}`
      : group.bookings.map(dayLabel).join(" · ");
  const earliestDeadline = group.bookings.map((b) => b.response_deadline).sort()[0];

  async function respond(response: "accepted" | "declined") {
    if (!selected) return;
    setLoading(response);
    setError(null);
    const result = await respondToBooking(selected.id, response);
    setLoading(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setConfirmingDecline(false);
    setAnswered((prev) => ({ ...prev, [selected.id]: response }));
    if (response === "declined") {
      const left = remaining.filter((b) => b.id !== selected.id);
      if (left.length > 0) setSelectedId(left[0].id);
      else {
        setOpen(false);
        router.refresh();
      }
    }
  }

  // Closing after an answer refreshes the list so answered requests drop off. We
  // deliberately don't refresh while the "accepted" panel is showing, so the chat
  // button stays put until the cleaner dismisses it.
  function close() {
    setOpen(false);
    setConfirmingDecline(false);
    if (Object.keys(answered).length > 0) router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-3 text-start hover:bg-gray-50 transition-colors"
      >
        <Avatar url={group.avatarUrl} name={group.name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-gray-900 truncate">{group.name}</span>
          <span className="block text-sm text-gray-500 truncate">{subtitle}</span>
        </span>
        <span className="shrink-0 text-end">
          {group.bookings.length > 1 && (
            <span className="block mb-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 whitespace-nowrap">
              {t("req_days_n").replace("{n}", String(group.bookings.length))}
            </span>
          )}
          <Countdown deadline={earliestDeadline} />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={close}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar url={group.avatarUrl} name={group.name} size={48} />
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{group.name}</h2>
                  <Link
                    href={`/cleaner/customers/${group.customerId}`}
                    className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {t("req_view_profile")}
                  </Link>
                </div>
              </div>
              <button onClick={close} aria-label={t("nav_cancel")} className="text-2xl leading-none text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>

            {accepted ? (
              <div className="px-5 pb-5 pt-2 space-y-4 text-center">
                <p className="text-lg font-bold text-green-700">{t("req_accepted_title")}</p>
                <p className="text-gray-600">{t("req_accepted_body").replace("{name}", group.name)}</p>
                <Link
                  href={`/cleaner/chat/${group.customerId}`}
                  className="block w-full rounded-full bg-blue-600 py-3 text-lg font-semibold text-white hover:bg-blue-700"
                >
                  {t("req_open_chat")}
                </Link>
                <button onClick={close} className="w-full rounded-full bg-gray-100 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-200">
                  {t("req_done")}
                </button>
              </div>
            ) : selected ? (
              <div className="px-5 pb-5 space-y-4">
                {remaining.length > 1 && (
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1.5">{t("req_days_title")}</p>
                    <div className="flex flex-wrap gap-2">
                      {remaining.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(b.id);
                            setConfirmingDecline(false);
                            setError(null);
                          }}
                          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                            b.id === selected.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {dayLabel(b)} · {b.scheduled_start.slice(0, 5)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">{t("req_days_hint")}</p>
                  </div>
                )}

                <BookingRequestSummary
                  data={buildBookingSummaryData(selected, homeInfo, hourlyRate)}
                  cleanerName={group.name}
                  lang={lang}
                />

                {selected.duration_flexible && <p className="text-sm font-semibold text-red-600">{t("req_duration_not_sure")}</p>}

                <div>
                  <p className="text-sm font-bold text-gray-900 mb-0.5">{t("req_address")}</p>
                  <p className="text-base text-gray-700">{selected.address}</p>
                </div>

                {error && <p className="text-base text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                {/* Pinned to the bottom of the modal so Accept/Decline never scroll out of reach. */}
                <div className="sticky bottom-0 -mx-5 border-t border-gray-100 bg-white px-5 pt-3 pb-1">
                {confirmingDecline ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 text-center">{t("req_decline_confirm")}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setConfirmingDecline(false)}
                          disabled={!!loading}
                          className="flex-1 rounded-full bg-gray-100 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          {t("req_decline_no")}
                        </button>
                        <button
                          onClick={() => respond("declined")}
                          disabled={!!loading}
                          className="flex-1 rounded-full bg-red-500 py-3 text-lg font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          {loading === "declined" ? t("req_declining") : t("req_decline_yes")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => respond("accepted")}
                        disabled={!!loading}
                        className="flex-1 rounded-full bg-green-600 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading === "accepted" ? t("req_accepting") : t("req_accept")}
                      </button>
                      <button
                        onClick={() => setConfirmingDecline(true)}
                        disabled={!!loading}
                        className="flex-1 rounded-full bg-red-500 py-3 text-lg font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {t("req_decline")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
