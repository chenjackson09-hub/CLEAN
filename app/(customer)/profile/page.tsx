import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfilePreview } from './ProfilePreview'

// The Profile button now lands on a read-only preview of what a cleaner sees
// when they open this customer's profile; the editable form lives at
// /profile/edit (reached via the "Edit profile" button).
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Pull the same fields a cleaner reads on /cleaner/customers/[id]. rating_avg
  // comes back as a string (PostgREST numeric), so coerce it for the stars.
  const [{ data: profile }, { data: customer }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
    supabase.from("customers").select("bio, rating_avg, rating_count, cleans_completed, num_rooms, pet_types, num_pets, num_kids_under_15, num_people, house_size_sqm, dwelling_type, floor").eq("id", user.id).single(),
  ])

  // languages was added by migration 0018 (applied by hand). Fetch it separately
  // so the preview still loads if the migration hasn't run yet (error → []).
  const { data: langRow } = await supabase
    .from("customers").select("languages").eq("id", user.id)
    .single<{ languages: string[] | null }>()

  return (
    <div className="max-w-lg mx-auto">
      <ProfilePreview
        data={{
          full_name: profile?.full_name ?? "",
          avatar_url: profile?.avatar_url ?? null,
          bio: customer?.bio ?? "",
          languages: langRow?.languages ?? [],
          rating_avg: customer?.rating_avg != null ? Number(customer.rating_avg) : null,
          rating_count: customer?.rating_count ?? 0,
          cleans_completed: customer?.cleans_completed ?? 0,
          num_rooms: customer?.num_rooms ?? null,
          pet_types: (customer?.pet_types as ('dog' | 'cat' | 'other')[]) ?? [],
          num_pets: customer?.num_pets ?? null,
          num_kids_under_15: customer?.num_kids_under_15 ?? null,
          num_people: customer?.num_people ?? null,
          house_size_sqm: customer?.house_size_sqm ?? null,
          dwelling_type: (customer?.dwelling_type as 'apartment' | 'house' | null) ?? null,
          floor: customer?.floor ?? null,
        }}
      />
    </div>
  )
}
