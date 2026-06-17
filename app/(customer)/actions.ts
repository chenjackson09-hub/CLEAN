"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { geocodeAddress } from "@/lib/geocode"
import { sendNewBookingRequest } from "@/lib/resend"

type ActionResult = { error?: string; success?: boolean } | null

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
      .upload(path, avatarFile, { upsert: true })
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }
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
  return { success: true }
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

  // Validate that the requested time falls within the cleaner's availability
  // Must use admin client — RLS blocks customer from reading cleaner_weekly_availability
  const dayOfWeek = new Date(data.scheduled_date + 'T12:00:00').getDay()
  const { data: availRows } = await adminClient
    .from('cleaner_weekly_availability')
    .select('start_time, end_time')
    .eq('cleaner_id', data.cleaner_id)
    .eq('day_of_week', dayOfWeek)

  if (!availRows || availRows.length === 0) {
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
