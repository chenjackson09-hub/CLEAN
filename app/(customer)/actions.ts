"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { geocodeAddress } from "@/lib/geocode"
import { restoreAvailability } from "@/lib/availability"
import { normalizeLanguages } from "@/lib/languages"
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
  // Languages come from the shared multi-select as a comma-joined hidden input;
  // normalize to canonical short codes (see lib/languages.ts).
  const languages = normalizeLanguages(((formData.get("languages") as string | null) ?? "").split(","))

  // Household details — all optional. Numbers come from keyboard inputs, so parse
  // leniently and store null when blank/invalid. toInt rejects negatives (counts
  // can't be negative); toIntSigned keeps them (a floor can be below ground).
  const toInt = (v: FormDataEntryValue | null): number | null => {
    const s = (v as string | null)?.trim()
    if (!s) return null
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const toIntSigned = (v: FormDataEntryValue | null): number | null => {
    const s = (v as string | null)?.trim()
    if (!s) return null
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : null
  }
  const hasPets = formData.get("has_pets") === "yes"
  const petTypes = hasPets
    ? (["dog", "cat", "other"] as const).filter((p) => formData.get(`pet_${p}`) === "on")
    : []
  const dwellingTypeRaw = formData.get("dwelling_type") as string
  const dwellingType =
    dwellingTypeRaw === "apartment" || dwellingTypeRaw === "house" ? dwellingTypeRaw : null

  const numPets = hasPets ? toInt(formData.get("num_pets")) : null

  // Cross-field validation (authoritative — the client mirrors these for UX).
  // These return i18n keys (the form translates them) since the action can't
  // read the user's language.
  if (hasPets) {
    if (numPets == null || numPets < 1) {
      return { error: "profile.errPetsMin" }
    }
    // Each selected pet type implies at least one of that animal.
    if (petTypes.length > 1 && numPets < petTypes.length) {
      return { error: "profile.errPetsKinds" }
    }
  }

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
      languages,
      max_hours: toInt(formData.get("max_hours")),
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      num_rooms: toInt(formData.get("num_rooms")),
      pet_types: petTypes,
      num_pets: numPets,
      // num_kids_under_15 / num_people are intentionally omitted: the customer can
      // no longer edit them, and omitting them from the upsert preserves any value
      // already stored (the columns remain in the DB and on the cleaner's view).
      house_size_sqm: toInt(formData.get("house_size_sqm")),
      dwelling_type: dwellingType,
      floor: dwellingType === "apartment" ? toIntSigned(formData.get("floor")) : null,
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
  duration_flexible?: boolean
  // The broader window the customer is free in ('HH:MM'), shown to the cleaner so
  // they can offer to extend. Optional. See migration 0014.
  avail_window_start?: string
  avail_window_end?: string
  address: string
  notes?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const adminClient = createAdminClient()

  // Verify the cleaner exists and is active — never let a customer book a
  // new, in-training, inactive, or blocked cleaner by passing a cleaner_id directly.
  const { data: cleaner } = await adminClient
    .from('cleaners')
    .select('status, min_hours, max_hours')
    .eq('id', data.cleaner_id)
    .single()
  if (!cleaner || cleaner.status !== 'active') {
    return { error: 'This cleaner is not available for booking.' }
  }

  // Enforce the cleaner's accepted hour window (authoritative — the form also
  // limits the options). A flexible ("Not sure") request carries no chosen
  // number, so it isn't range-checked; the client already seeds its default
  // inside the window. See migration 0013.
  if (!data.duration_flexible) {
    if (cleaner.min_hours != null && data.duration_hours < cleaner.min_hours) {
      return { error: `This cleaner only accepts cleans of at least ${cleaner.min_hours} hours.` }
    }
    if (cleaner.max_hours != null && data.duration_hours > cleaner.max_hours) {
      return { error: `This cleaner only accepts cleans of at most ${cleaner.max_hours} hours.` }
    }
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
    duration_flexible: data.duration_flexible ?? false,
    avail_window_start: data.avail_window_start ?? null,
    avail_window_end: data.avail_window_end ?? null,
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

// Clears the "updated by the cleaner" indicator once the customer has seen the
// change (the "seen" button in the booking detail's modified banner). Sets
// cleaner_modified back to false; if the cleaner edits the booking again,
// editBooking re-sets it to true, so the indicator reappears. Scoped to the
// calling customer, and the "customer manages own bookings" RLS policy
// (auth.uid() = customer_id) enforces ownership at the DB level too.
export async function acknowledgeBookingModified(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("bookings")
    .update({ cleaner_modified: false })
    .eq("id", bookingId)
    .eq("customer_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/bookings")
  return { success: true }
}

// Dismisses a declined/cancelled booking from the customer's "Refused &
// cancelled" list once they've seen it ("Mark as seen"). Sets
// customer_ack_inactive = true so the booking page filters it out. Scoped to the
// calling customer; the "customer manages own bookings" RLS policy enforces it too.
export async function acknowledgeBookingSeen(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("bookings")
    .update({ customer_ack_inactive: true })
    .eq("id", bookingId)
    .eq("customer_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/bookings")
  return { success: true }
}

// Bulk version of acknowledgeBookingSeen: dismisses every declined/cancelled
// booking the customer currently sees ("Mark all as seen"). The caller passes the
// visible booking ids, so we filter by `id` (not `status`) — a bulk PostgREST
// update filtering on `status` can hang against this DB. Ownership is enforced by
// the customer_id filter + RLS.
export async function acknowledgeAllBookingsSeen(bookingIds: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (bookingIds.length === 0) return { success: true }

  const { error } = await supabase
    .from("bookings")
    .update({ customer_ack_inactive: true })
    .in("id", bookingIds)
    .eq("customer_id", user.id)

  if (error) return { error: error.message }

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

// Customer rates the cleaner of a completed booking (1-5, numbers only for now).
// Upserts one rating per customer per booking; re-submitting updates the score.
// The DB trigger recomputes the cleaner's rating_avg/rating_count. RLS allows the
// insert only when rater_id = auth.uid(); we additionally verify the booking is
// the customer's own and `completed`.
export async function rateCleaner(bookingId: string, score: number): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (!Number.isInteger(score) || score < 1 || score > 5) return { error: "Rating must be 1-5." }

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("status, cleaner_id")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single()

  if (fetchErr || !booking) return { error: "Booking not found." }
  if (booking.status !== "completed") return { error: "You can only rate a completed clean." }

  const { error } = await supabase
    .from("ratings")
    .upsert(
      {
        booking_id: bookingId,
        rater_id: user.id,
        ratee_id: booking.cleaner_id,
        ratee_role: "cleaner",
        score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "rater_id,ratee_id" },
    )

  if (error) return { error: error.message }

  revalidatePath("/bookings")
  return { success: true }
}
