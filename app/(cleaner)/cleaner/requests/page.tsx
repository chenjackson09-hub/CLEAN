import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RequestCard from "./RequestCard";
import type { BookingWithCustomer } from "@/types/database";
import type { Lang, TranslationKey } from "@/lib/lang";
import { t } from "@/lib/lang";

const WEEK_DAY_KEYS: TranslationKey[] = [
  "day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat",
];
const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

function formatDateHeader(lang: Lang, dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${t(lang, WEEK_DAY_KEYS[d.getDay()])}, ${d.getDate()} ${t(lang, MONTH_KEYS[d.getMonth()])} ${d.getFullYear()}`;
}

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  // Use the service-role client so the embedded customer profile (name, phone,
  // avatar) is readable — the "users manage own profile" RLS policy otherwise
  // hides the customer's profile row from the cleaner. The explicit
  // `cleaner_id = user.id` filter still scopes results to this cleaner's requests.
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from("bookings")
    .select("*, profiles!customer_id(full_name, phone, avatar_url)")
    .eq("cleaner_id", user.id)
    .eq("status", "pending")
    .gt("response_deadline", now)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_start", { ascending: true })
    .returns<BookingWithCustomer[]>();

  if (!pending || pending.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <div className="text-5xl mb-4">📬</div>
        <p className="text-lg">{t(lang, "req_empty")}</p>
      </div>
    );
  }

  // Group the awaiting requests by their scheduled date, closest date first.
  const pendingByDate = new Map<string, BookingWithCustomer[]>();
  for (const booking of pending ?? []) {
    const group = pendingByDate.get(booking.scheduled_date) ?? [];
    group.push(booking);
    pendingByDate.set(booking.scheduled_date, group);
  }
  const pendingDates = Array.from(pendingByDate.keys()).sort();

  return (
    <div className="max-w-3xl -mx-4 sm:mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t(lang, "req_title")}</h1>
      <p className="text-base text-gray-500 mb-6">{t(lang, "req_subtitle")}</p>

      <section>
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t(lang, "req_awaiting")} ({pending.length})
        </h2>
        <div className="space-y-6">
          {pendingDates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-gray-700 mb-2">{formatDateHeader(lang, date)}</h3>
              <div className="space-y-3">
                {pendingByDate.get(date)!.map((b) => (
                  <RequestCard key={b.id} booking={b} showActions />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
