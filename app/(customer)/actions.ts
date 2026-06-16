"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { geocodeAddress } from "@/lib/geocode"

type ActionResult = { error?: string; success?: boolean } | null

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
  revalidatePath("/bookings")
  return { success: true }
}
