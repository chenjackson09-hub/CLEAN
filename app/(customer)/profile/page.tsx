import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from './ProfileForm'
import { updateCustomerProfile } from '../actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: customer }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).single(),
    supabase.from("customers").select("bio, address, preferred_service_type, num_rooms, pet_types, num_pets, num_kids_under_15, num_people, house_size_sqm, dwelling_type, floor").eq("id", user.id).single(),
  ])

  const numOrEmpty = (n: number | null | undefined) => (n == null ? "" : String(n))

  return (
    <div className="max-w-lg mx-auto">
      <ProfileForm
        action={updateCustomerProfile}
        defaultValues={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          bio: customer?.bio ?? "",
          preferred_service_type: (customer?.preferred_service_type as 'residential' | 'commercial') ?? "residential",
          address: customer?.address ?? "",
          avatar_url: profile?.avatar_url ?? null,
          num_rooms: numOrEmpty(customer?.num_rooms),
          pet_types: (customer?.pet_types as ('dog' | 'cat' | 'other')[]) ?? [],
          num_pets: numOrEmpty(customer?.num_pets),
          num_kids_under_15: numOrEmpty(customer?.num_kids_under_15),
          num_people: numOrEmpty(customer?.num_people),
          house_size_sqm: numOrEmpty(customer?.house_size_sqm),
          dwelling_type: (customer?.dwelling_type as 'apartment' | 'house' | null) ?? null,
          floor: numOrEmpty(customer?.floor),
        }}
      />
    </div>
  )
}
