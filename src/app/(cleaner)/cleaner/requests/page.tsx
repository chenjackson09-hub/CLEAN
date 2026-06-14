import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RequestCard from "./RequestCard";
import type { BookingWithCustomer } from "@/types/database";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: pending }, { data: past }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, profiles!customer_id(full_name, phone, avatar_url)")
      .eq("cleaner_id", user.id)
      .eq("status", "pending")
      .gt("response_deadline", now)
      .order("created_at", { ascending: true })
      .returns<BookingWithCustomer[]>(),
    supabase
      .from("bookings")
      .select("*, profiles!customer_id(full_name, phone, avatar_url)")
      .eq("cleaner_id", user.id)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<BookingWithCustomer[]>(),
  ]);

  if ((!pending || pending.length === 0) && (!past || past.length === 0)) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <div className="text-5xl mb-4">📬</div>
        <p className="text-lg">{t(lang, "req_empty")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t(lang, "req_title")}</h1>
      <p className="text-base text-gray-500 mb-6">{t(lang, "req_subtitle")}</p>

      {pending && pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t(lang, "req_awaiting")} ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <RequestCard key={b.id} booking={b} showActions />
            ))}
          </div>
        </section>
      )}

      {past && past.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t(lang, "req_past")}
          </h2>
          <div className="space-y-3">
            {past.map((b) => (
              <RequestCard key={b.id} booking={b} showActions={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
