import { createClient, getCurrentUser, getCleanerStatus } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import RequestCard from "../requests/RequestCard";
import RealtimeBookings from "./RealtimeBookings";
import type { BookingWithCustomer } from "@/types/database";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function CleanerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  const supabase = await createClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [cleanerStatus, { data: pendingBookings }, { data: upcomingBookings }] =
    await Promise.all([
      getCleanerStatus(user.id),
      supabase
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .eq("status", "pending")
        .gt("response_deadline", now.toISOString())
        .order("created_at", { ascending: true })
        .returns<BookingWithCustomer[]>(),
      supabase
        .from("bookings")
        .select("*, profiles!customer_id(full_name, phone, avatar_url)")
        .eq("cleaner_id", user.id)
        .eq("status", "accepted")
        .gte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: true })
        .limit(5)
        .returns<BookingWithCustomer[]>(),
    ]);

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t(lang, "dash_title")}</h1>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide">
            {t(lang, "dash_new_requests")}{" "}
            {pendingBookings && pendingBookings.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingBookings.length}
              </span>
            )}
          </h2>
          <Link href="/cleaner/requests" className="text-xs text-blue-600 hover:underline">
            {t(lang, "dash_view_all")}
          </Link>
        </div>

        {pendingBookings && pendingBookings.length > 0 ? (
          <div className="space-y-3">
            {pendingBookings.map((b) => (
              <RequestCard key={b.id} booking={b} showActions />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-base">
            {t(lang, "dash_no_pending")}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t(lang, "dash_upcoming")}
        </h2>

        {upcomingBookings && upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-xl text-gray-900">
                    {b.profiles?.full_name ?? t(lang, "req_customer")}
                  </div>
                  <div className="text-base text-gray-500 mt-1">{b.address}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xl font-semibold text-gray-900">{formatDate(b.scheduled_date)}</div>
                  <div className="text-base text-gray-500 mt-1">
                    {b.scheduled_start?.slice(0, 5)} · {b.duration_hours}{t(lang, "req_h")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-base">
            {t(lang, "dash_no_upcoming")}
          </div>
        )}
      </section>
    </div>
  );
}
