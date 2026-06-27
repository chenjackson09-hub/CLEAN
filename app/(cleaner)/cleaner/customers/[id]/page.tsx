import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import type { Profile, Booking, Customer } from "@/types/database";
import BackLink from "./BackLink";
import DateCube from "./DateCube";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  declined:  "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const fromDashboard = from === "dashboard";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Service-role client: the "users manage own profile" RLS policy hides the
  // customer's profile row from the cleaner. Authorization is still enforced
  // below — the page 404s unless this cleaner has a booking with this customer.
  const supabase = createAdminClient();

  const [{ data: profile }, { data: customer }, { data: bookings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single<Profile>(),
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single<Customer>(),
    supabase
      .from("bookings")
      .select("*")
      .eq("cleaner_id", user.id)
      .eq("customer_id", id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_start", { ascending: true })
      .returns<Booking[]>(),
  ]);

  if (!profile || !bookings || bookings.length === 0) notFound();

  // Build the household summary, skipping anything the customer left blank.
  const petLabel =
    customer && customer.pet_types?.length
      ? customer.pet_types.map((p) => (p === "dog" ? "Dog" : p === "cat" ? "Cat" : "Other")).join(" & ") +
        (customer.num_pets ? ` (${customer.num_pets})` : "")
      : null;
  const household: { label: string; value: string }[] = customer
    ? [
        {
          label: "Property",
          value:
            customer.dwelling_type === "apartment"
              ? `Apartment${customer.floor != null ? `, floor ${customer.floor}` : ""}`
              : customer.dwelling_type === "house"
              ? "House"
              : "",
        },
        { label: "Rooms", value: customer.num_rooms != null ? String(customer.num_rooms) : "" },
        { label: "Est. size", value: customer.house_size_sqm != null ? `${customer.house_size_sqm} m²` : "" },
        { label: "People", value: customer.num_people != null ? String(customer.num_people) : "" },
        { label: "Kids under 15", value: customer.num_kids_under_15 != null ? String(customer.num_kids_under_15) : "" },
        { label: "Pets", value: petLabel ?? "" },
      ].filter((f) => f.value !== "")
    : [];

  return (
    <div className="max-w-2xl -mx-4 sm:mx-auto">
      <BackLink fromDashboard={fromDashboard} />

      {/* Profile header */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden shrink-0">
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

          </div>
        </div>
        {customer?.bio && (
          <div className="mt-4 pt-4">
            <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">About</p>
            <p className="text-base text-gray-700 whitespace-pre-line">{customer.bio}</p>
          </div>
        )}
      </div>

      {/* Household details */}
      {household.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Household details
          </h2>
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {household.map((f) => (
              <div key={f.label}>
                <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">{f.label}</p>
                <p className="text-base font-semibold text-gray-900">{f.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Booking history */}
      <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Booking history
      </h2>

      {!bookings || bookings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md py-10 text-center text-gray-400">
          No bookings with this customer yet.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-start gap-4 min-w-0">
                  <DateCube date={b.scheduled_date} />
                 <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 min-w-0">
                <div>
                  <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">Time</p>
                  <p className="font-medium">{b.scheduled_start.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">Duration</p>
                  <p className="font-medium">{b.duration_hours}h</p>
                </div>
                <div className="min-w-0">
                  <p className="text-gray-400 uppercase tracking-wide text-xs mb-0.5">Location</p>
                  <p className="font-medium break-words">{b.address}</p>
                </div>
              </div>
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[b.status]}`}>
                  {b.status}
                </span>
              </div>
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
