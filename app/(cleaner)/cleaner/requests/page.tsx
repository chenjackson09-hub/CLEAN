import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RequestGroupRow, { type RequestGroup } from "./RequestGroupRow";
import type { CustomerHomeInfo } from "@/lib/bookingSummary";
import type { BookingWithCustomer } from "@/types/database";
import type { Lang } from "@/lib/lang";
import { t } from "@/lib/lang";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  // Use the service-role client so the embedded customer profile (name, avatar)
  // is readable — the "users manage own profile" RLS policy otherwise hides the
  // customer's profile row from the cleaner. The explicit `cleaner_id = user.id`
  // filter still scopes results to this cleaner's requests.
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const [{ data: pending }, { data: cleanerRow }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, profiles!customer_id(full_name, avatar_url)")
      .eq("cleaner_id", user.id)
      .eq("status", "pending")
      .gt("response_deadline", now)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_start", { ascending: true })
      .returns<BookingWithCustomer[]>(),
    supabase.from("cleaners").select("hourly_rate").eq("id", user.id).single<{ hourly_rate: number | null }>(),
  ]);
  const hourlyRate = cleanerRow?.hourly_rate ?? null;

  // Home/pet info for the request's "Your home"/"Pets" rows — read live from each
  // requesting customer's profile (see migration 0029: it isn't snapshotted).
  const customerIds = Array.from(new Set((pending ?? []).map((b) => b.customer_id)));
  const { data: homeRows } = customerIds.length
    ? await supabase
        .from("customers")
        .select("id, dwelling_type, bedrooms, num_rooms, bathrooms, pet_types, num_pets")
        .in("id", customerIds)
        .returns<(CustomerHomeInfo & { id: string })[]>()
    : { data: [] as (CustomerHomeInfo & { id: string })[] };
  const homeInfoMap = new Map((homeRows ?? []).map((r) => [r.id, r]));

  if (!pending || pending.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <div className="text-5xl mb-4">📬</div>
        <p className="text-lg">{t(lang, "req_empty")}</p>
      </div>
    );
  }

  // One entry per host and need: a host who opened several candidate days for one
  // clean sent one request per day (same clean_group_id; ungrouped requests from
  // the same host are one need too, which is also how accepting one closes the
  // rest). The soonest day comes first, so groups are ordered by it.
  const groups = new Map<string, RequestGroup>();
  for (const b of pending) {
    const key = `${b.customer_id}:${b.clean_group_id ?? ""}`;
    const group = groups.get(key) ?? {
      key,
      customerId: b.customer_id,
      name: b.profiles?.full_name ?? t(lang, "req_customer"),
      avatarUrl: b.profiles?.avatar_url ?? null,
      bookings: [],
    };
    group.bookings.push(b);
    groups.set(key, group);
  }
  const list = Array.from(groups.values());

  return (
    <div className="max-w-3xl mx-auto pt-4">
      <h1 className="text-2xl font-bold text-gray-900">{t(lang, "req_title")}</h1>
      <p className="text-sm text-gray-500 mb-4">{t(lang, "req_subtitle")}</p>

      <h2 className="flex items-center gap-2 px-1 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t(lang, "req_awaiting")}
        <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 normal-case">{list.length}</span>
      </h2>
      <div className="rounded-2xl bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
        {list.map((g) => (
          <RequestGroupRow key={g.key} group={g} homeInfo={homeInfoMap.get(g.customerId) ?? null} hourlyRate={hourlyRate} />
        ))}
      </div>
    </div>
  );
}
