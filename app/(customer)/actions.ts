"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { geocodeAddress } from "@/lib/geocode"
import { restoreAvailability } from "@/lib/availability"
import { sendNewBookingRequest } from "@/lib/resend"

// Records that the customer has now seen their bookings, clearing the "newly
// accepted" badge on the Bookings nav item. Called when the bookings page opens.
export async function markBookingsSeen(): Promise<void> {
  cookies().set("bookings_seen_at", new Date().toISOString(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath("/bookings")
}

type ActionResult = { error?: string; success?: boolean; avatarUrl?: string } | null

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export async function updateCustomerProfile(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const fullName = formData.get("full_name") as string
  const phone = formData.get("phone") as string
  const bio = formData.get("bio") as string
  const preferredServiceType = formData.get("preferred_service_type") as string
  const address = formData.get("address") as string

  // Handle avatar upload
  const avatarFile = formData.get("avatar") as File
  let avatarUrl: string | undefined
  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
    if (uploadErr) return { error: uploadErr.message }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
    // The storage path is stable (upsert overwrites the same file), so the public
    // URL never changes between uploads — the browser and next/image would keep
    // serving the cached old photo. A unique version query string forces a fresh
    // fetch each time the photo is replaced.
    avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, ...(avatarUrl && { avatar_url: avatarUrl }) })
    .eq("id", user.id)
  if (profileErr) return { error: profileErr.message }

  const location = await geocodeAddress(address)

  const { error: customerErr } = await supabase
    .from("customers")
    .upsert({
      id: user.id,
      bio,
      address,
      preferred_service_type: preferredServiceType || null,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
    })
  if (customerErr) return { error: customerErr.message }

  revalidatePath("/profile")
  return { success: true, avatarUrl: avatarUrl ?? undefined }
}

export async function createBooking(data: {
  cleaner_id: string
  service_type: string
  scheduled_date: string
  scheduled_start: string
  duration_hours: number
  address: string
  notes?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const adminClient = createAdminClient()

  // Verify the cleaner exists and is approved — never let a customer book a
  // pending, rejected, or suspended cleaner by passing a cleaner_id directly.
  const { data: cleaner } = await adminClient
    .from('cleaners')
    .select('status')
    .eq('id', data.cleaner_id)
    .single()
  if (!cleaner || cleaner.status !== 'approved') {
    return { error: 'This cleaner is not available for booking.' }
  }

  // Block duplicate requests: one live pending request per cleaner per date.
  // The customer can read their own bookings under RLS ("customer manages own
  // bookings"), so the session client is fine here. Only a still-live pending
  // request counts — an expired one (deadline passed) is effectively declined,
  // so the customer is free to re-request that cleaner for the same date.
  const { data: existingPending } = await supabase
    .from('bookings')
    .select('id')
    .eq('customer_id', user.id)
    .eq('cleaner_id', data.cleaner_id)
    .eq('scheduled_date', data.scheduled_date)
    .eq('status', 'pending')
    .gt('response_deadline', new Date().toISOString())
    .limit(1)
  if (existingPending && existingPending.length > 0) {
    return { error: 'You already have a pending request with this cleaner for that date.' }
  }

  // Validate that the requested time falls within the cleaner's availability.
  // A time is bookable if it falls within either a recurring weekly slot for
  // that weekday OR a specific-date slot the cleaner set for that exact date.
  // Must use admin client — RLS blocks customers from reading these tables.
  const dayOfWeek = new Date(data.scheduled_date + 'T12:00:00').getDay()
  const [{ data: weeklyRows }, { data: dateRows }] = await Promise.all([
    adminClient
      .from('cleaner_weekly_availability')
      .select('start_time, end_time')
      .eq('cleaner_id', data.cleaner_id)
      .eq('day_of_week', dayOfWeek),
    adminClient
      .from('cleaner_availability')
      .select('start_time, end_time')
      .eq('cleaner_id', data.cleaner_id)
      .eq('date', data.scheduled_date),
  ])
  const availRows = [...(weeklyRows ?? []), ...(dateRows ?? [])]

  if (availRows.length === 0) {
    return { error: 'The cleaner is not available on the selected day.' }
  }

  const startMin = timeToMinutes(data.scheduled_start)
  const endMin = startMin + data.duration_hours * 60
  const withinSlot = availRows.some(slot =>
    timeToMinutes(slot.start_time) <= startMin &&
    timeToMinutes(slot.end_time) >= endMin
  )
  if (!withinSlot) {
    return { error: 'Selected time or duration is outside the cleaner\'s availability.' }
  }

  const deadline = new Date()
  deadline.setHours(deadline.getHours() + 24)

  const { error } = await supabase.from("bookings").insert({
    customer_id: user.id,
    cleaner_id: data.cleaner_id,
    service_type: data.service_type,
    scheduled_date: data.scheduled_date,
    scheduled_start: data.scheduled_start,
    duration_hours: data.duration_hours,
    address: data.address,
    notes: data.notes ?? null,
    status: "pending",
    response_deadline: deadline.toISOString(),
  })

  if (error) return { error: error.message }

  // Notify the cleaner of the new request — fire and forget, must not block or
  // fail the booking if email delivery has a problem.
  notifyCleanerOfBooking(adminClient, supabase, data.cleaner_id, user.id, data).catch(() => {})

  revalidatePath("/bookings")
  return { success: true }
}

// Lets a customer cancel their own booking from the Bookings page. Only pending
// requests and accepted (confirmed) bookings can be cancelled — past/declined/
// already-cancelled bookings are terminal. The booking is scoped to the calling
// customer both when reading and writing, and the "customer manages own bookings"
// RLS policy (auth.uid() = customer_id) enforces ownership at the DB level too.
//
// Note: this does NOT restore the carved-out time to the cleaner's availability;
// respondToBooking trims availability on accept, so a follow-up could re-open it.
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("status, cleaner_id, scheduled_date, scheduled_start, duration_hours")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single()

  if (fetchErr || !booking) return { error: "Booking not found." }
  if (booking.status !== "pending" && booking.status !== "accepted") {
    return { error: "This booking can no longer be cancelled." }
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("customer_id", user.id)

  if (error) return { error: error.message }

  // Only accepted bookings had their time carved out of the cleaner's
  // availability on accept; reopen that slot. Pending requests never reserved
  // time, so there's nothing to restore. Uses the service-role client because
  // RLS only lets the cleaner write their own cleaner_availability.
  if (booking.status === "accepted") {
    const bookedStart = timeToMinutes(booking.scheduled_start)
    const bookedEnd = bookedStart + booking.duration_hours * 60
    await restoreAvailability(
      createAdminClient(),
      booking.cleaner_id,
      booking.scheduled_date,
      bookedStart,
      bookedEnd,
    )
  }

  revalidatePath("/bookings")
  return { success: true }
}

async function notifyCleanerOfBooking(
  adminClient: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  cleanerId: string,
  customerId: string,
  data: { service_type: string; scheduled_date: string; scheduled_start: string; address: string },
) {
  const [{ data: cleanerAuth }, { data: cleanerProfile }, { data: customerProfile }] =
    await Promise.all([
      adminClient.auth.admin.getUserById(cleanerId),
      supabase.from("profiles").select("full_name").eq("id", cleanerId).single(),
      supabase.from("profiles").select("full_name").eq("id", customerId).single(),
    ])

  const cleanerEmail = cleanerAuth?.user?.email
  if (!cleanerEmail) return

  await sendNewBookingRequest({
    cleanerEmail,
    cleanerName: cleanerProfile?.full_name ?? "there",
    customerName: customerProfile?.full_name ?? "A customer",
    scheduledDate: data.scheduled_date,
    scheduledStart: data.scheduled_start,
    address: data.address,
    serviceType: data.service_type,
  })
}
