import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import ProfileViewEdit from './ProfileViewEdit'
import { updateCustomerProfile } from '../actions'
import type { Customer } from "@/types/database"
import type { ReviewItem } from "@/components/HostProfileReviews"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: customer }, { data: reviewRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).single(),
    supabase.from("customers").select("*").eq("id", user.id).single<Customer>(),
    // Uses the admin client only to safely join the rater's (cleaner's) name —
    // RLS already lets this customer read their own rating rows as the ratee,
    // but "users manage own profile" would hide the joined profiles row.
    createAdminClient()
      .from("ratings")
      .select("id, score, review_text, updated_at, rater:profiles!rater_id(full_name)")
      .eq("ratee_id", user.id)
      .eq("ratee_role", "customer")
      .not("review_text", "is", null)
      .order("updated_at", { ascending: false })
      .returns<{ id: string; score: number; review_text: string; updated_at: string; rater: { full_name: string | null } | null }[]>(),
  ])

  const numOrEmpty = (n: number | null | undefined) => (n == null ? "" : String(n))

  const reviews: ReviewItem[] = (reviewRows ?? []).map((r) => ({
    id: r.id,
    score: r.score,
    reviewText: r.review_text,
    reviewerName: r.rater?.full_name ?? "A cleaner",
  }))

  return (
    <div className="max-w-2xl mx-auto">
      <ProfileViewEdit
        action={updateCustomerProfile}
        fullName={profile?.full_name ?? "Customer"}
        avatarUrl={profile?.avatar_url ?? null}
        customer={customer}
        reviews={reviews}
        defaultValues={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          bio: customer?.bio ?? "",
          address: customer?.address ?? "",
          avatar_url: profile?.avatar_url ?? null,
          num_rooms: numOrEmpty(customer?.num_rooms),
          pet_types: (customer?.pet_types as ('dog' | 'cat' | 'other')[]) ?? [],
          num_pets: numOrEmpty(customer?.num_pets),
          pet_photo_url: customer?.pet_photo_url ?? null,
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
