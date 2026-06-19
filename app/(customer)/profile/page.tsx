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
    supabase.from("customers").select("bio, address, preferred_service_type").eq("id", user.id).single(),
  ])

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Profile</h1>
      <ProfileForm
        action={updateCustomerProfile}
        defaultValues={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          bio: customer?.bio ?? "",
          preferred_service_type: (customer?.preferred_service_type as 'residential' | 'commercial') ?? "residential",
          address: customer?.address ?? "",
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
    </div>
  )
}
