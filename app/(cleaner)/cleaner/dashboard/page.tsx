import { createClient, getCurrentUser, getCleanerStatus } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RealtimeBookings from "./RealtimeBookings";
import PastCleanCard from "./PastCleanCard";
import DateBlock from "./DateBlock";
import type { BookingWithCustomer } from "@/types/database";
import type { Lang, TranslationKey } from "@/lib/lang";
import { t } from "@/lib/lang";

const MONTH_KEYS: TranslationKey[] = [
  "month_jan", "month_feb", "month_mar", "month_apr", "month_may", "month_jun",
  "month_jul", "month_aug", "month_sep", "month_oct", "month_nov", "month_dec",
];

function CleanCard({ booking, lang }: { booking: BookingWithCustomer; lang: Lang }) {
  const [, mm, dd] = booking.scheduled_date.split("-");
  const monthName = t(lang, MONTH_KEYS[parseInt(mm) - 1]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
      <DateBlock day={parseInt(dd)} month={monthName} />
      <div className="min-w-0">
        <div className="font-semibold text-xl text-gray-900">
          {booking.profiles?.full_name ?? t(lang, "req_customer")}
        </div>
        <div className="text-base text-gray-500 mt-1">{booking.address}</div>
        <div className="text-sm text-gray-500 mt-1">
          {booking.scheduled_start?.slice(0, 5)} · {booking.duration_hours}{t(lang, "req_h")}
        </div>
      </div>
    </div>
  );
}

export default async function CleanerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  const supabase = await createClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const startDateTime = (b: BookingWithCustomer) =>
    new Date(`${b.scheduled_date}T${b.scheduled_start}`);

  const [cleanerStatus, { data: profile }, { data: upcomingRaw }, { data: pastRaw }] =
    await Promise.all([
      getCleanerStatus(user.id),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single<{ full_name: string | null }>(),
      // Accepted cleans from today onward; today's already-started ones are
      // dropped below so only genuinely upcoming cleans remain.
      supabase
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .eq("status", "accepted")
        .gte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_start", { ascending: true })
        .limit(20)
        .returns<BookingWithCustomer[]>(),
      // Accepted or completed cleans up to today; today's not-yet-started ones
      // are dropped below so only cleans whose start time has passed remain.
      supabase
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .in("status", ["accepted", "completed"])
        .lte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: false })
        .order("scheduled_start", { ascending: false })
        .limit(40)
        .returns<BookingWithCustomer[]>(),
    ]);

  const upcomingBookings = (upcomingRaw ?? [])
    .filter((b) => startDateTime(b) >= now)
    .slice(0, 6);
  const pastBookings = (pastRaw ?? [])
    .filter((b) => startDateTime(b) < now)
    .slice(0, 20);

  if (!cleanerStatus || cleanerStatus === "pending") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{t(lang, "dash_under_review_title")}</h2>
          <p className="text-base text-gray-500">{t(lang, "dash_under_review_body")}</p>
        </div>
      </div>
    );
  }

  if (cleanerStatus === "rejected") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{t(lang, "dash_rejected_title")}</h2>
          <p className="text-base text-gray-500">{t(lang, "dash_rejected_body")}</p>
        </div>
      </div>
    );
  }

  if (cleanerStatus === "suspended") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{t(lang, "dash_suspended_title")}</h2>
          <p className="text-base text-gray-500">{t(lang, "dash_suspended_body")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <RealtimeBookings cleanerId={user.id} />
      <div className="mb-6">
        <p className="text-lg text-gray-400">{t(lang, "dash_welcome")}</p>
        <h1 className="text-3xl font-extrabold text-black mt-0.5">{profile?.full_name ?? user.email}</h1>
      </div>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t(lang, "dash_upcoming")}
        </h2>

        {upcomingBookings && upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((b) => (
              <CleanCard key={b.id} booking={b} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-base">
            {t(lang, "dash_no_upcoming")}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t(lang, "dash_past")}
        </h2>

        {pastBookings.length > 0 ? (
          <div className="space-y-4">
            {pastBookings.map((b) => (
              <PastCleanCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-base">
            {t(lang, "dash_no_past")}
          </div>
        )}
      </section>
    </div>
  );
}
