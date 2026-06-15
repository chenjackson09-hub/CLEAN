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

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
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
