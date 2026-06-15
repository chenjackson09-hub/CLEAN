import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Profile, Booking } from "@/types/database";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  declined:  "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: profile }, { data: bookings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single<Profile>(),
    supabase
      .from("bookings")
      .select("*")
      .eq("cleaner_id", user.id)
      .eq("customer_id", id)
      .order("scheduled_date", { ascending: false })
      .returns<Booking[]>(),
  ]);

  if (!profile) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/cleaner/requests"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        ← Back to requests
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-5 mb-6">
        <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ?? "Customer"}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : null}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name ?? "Customer"}</h1>
          {profile.phone && (
            <p className="text-base text-gray-500 mt-1">{profile.phone}</p>
          )}
        </div>
      </div>

      {/* Booking history */}
      <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Booking history
      </h2>

      {!bookings || bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-10 text-center text-gray-400">
          No bookings with this customer yet.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-semibold text-gray-900">{formatDate(b.scheduled_date)}</p>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[b.status]}`}>
                  {b.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">Time</p>
                  <p className="font-medium">{b.scheduled_start.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">Duration</p>
                  <p className="font-medium">{b.duration_hours}h</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{b.address}</p>
              {b.notes && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-2">{b.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
