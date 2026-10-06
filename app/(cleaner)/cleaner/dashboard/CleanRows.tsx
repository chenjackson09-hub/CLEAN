"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeBooking } from "../../actions";
import { useLang } from "@/context/LangContext";
import { extractArea } from "@/lib/bookingArea";
import { countdownLabel } from "@/lib/countdown";
import { ScheduleRow } from "@/components/home/ScheduleParts";
import type { BookingWithCustomer } from "@/types/database";
import CleanDetailModal from "./CleanDetailModal";

function useChipLang(): "en" | "he" {
  return useLang().lang === "he" ? "he" : "en";
}

// "09:00 · 3h · Beit Hillel" — the area, not the full street address, keeps the
// line short enough to fit on a phone.
function detailLine(b: BookingWithCustomer, hoursUnit: string): string {
  const area = extractArea(b.address ?? "") ?? b.address ?? "";
  return [b.scheduled_start?.slice(0, 5), `${b.duration_hours}${hoursUnit}`, area].filter(Boolean).join(" · ");
}

export function UpcomingCleanRow({
  booking,
  todayStr,
  daysUntil,
  hourlyRate,
  inStrip = false,
}: {
  booking: BookingWithCustomer;
  todayStr: string;
  daysUntil: number;
  hourlyRate?: number | null;
  // In the today/tomorrow strip the row says "Today"/"Tomorrow" and is highlighted.
  inStrip?: boolean;
}) {
  const { t } = useLang();
  const lang = useChipLang();
  const [open, setOpen] = useState(false);

  const day = daysUntil <= 0 ? t("dash_in_today") : t("dash_in_tomorrow");
  const detail = detailLine(booking, t("req_h"));

  return (
    <>
      <ScheduleRow
        dateStr={booking.scheduled_date}
        todayStr={todayStr}
        lang={lang}
        chipTone={inStrip ? "accent" : "active"}
        title={booking.profiles?.full_name ?? t("req_customer")}
        subtitle={inStrip ? `${day} · ${detail}` : detail}
        trailing={
          <div className="text-end">
            {!inStrip && (
              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 whitespace-nowrap">
                {countdownLabel(daysUntil, lang)}
              </span>
            )}
            {booking.duration_flexible && (
              <p className="mt-0.5 text-[11px] font-semibold text-red-600">{t("req_duration_not_sure")}</p>
            )}
          </div>
        }
        onClick={() => setOpen(true)}
      />
      {open && <CleanDetailModal booking={booking} onClose={() => setOpen(false)} hourlyRate={hourlyRate} />}
    </>
  );
}

export function PastCleanRow({
  booking,
  todayStr,
  hourlyRate,
}: {
  booking: BookingWithCustomer;
  todayStr: string;
  hourlyRate?: number | null;
}) {
  const { t } = useLang();
  const router = useRouter();
  const lang = useChipLang();
  const [status, setStatus] = useState(booking.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const completed = status === "completed";
  const cancelled = status === "cancelled";

  async function complete() {
    setLoading(true);
    setError(null);
    const result = await completeBooking(booking.id);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setStatus("completed");
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <ScheduleRow
        dateStr={booking.scheduled_date}
        todayStr={todayStr}
        lang={lang}
        faded={completed || cancelled}
        title={booking.profiles?.full_name ?? t("req_customer")}
        subtitle={detailLine(booking, t("req_h"))}
        trailing={
          cancelled ? (
            <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 whitespace-nowrap">
              {t("dash_cancelled")}
            </span>
          ) : !completed ? (
            <div className="text-end">
              <button
                type="button"
                onClick={complete}
                disabled={loading}
                className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? t("dash_completing") : t("dash_complete")}
              </button>
              {error && <p className="text-[11px] text-red-600 mt-1 max-w-[9rem]">{error}</p>}
            </div>
          ) : undefined
        }
        onClick={() => setOpen(true)}
      />
      {open && <CleanDetailModal booking={booking} onClose={() => setOpen(false)} hourlyRate={hourlyRate} />}
    </>
  );
}
