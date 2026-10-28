"use client"

import { useState } from "react"
import ProfileView from "./ProfileView"
import { ProfileForm } from "./ProfileForm"
import type { ReviewItem } from "@/components/HostProfileReviews"
import type { Customer } from "@/types/database"

type ActionResult = { error?: string; success?: boolean; avatarUrl?: string; petPhotoUrl?: string } | null

type DefaultValues = React.ComponentProps<typeof ProfileForm>["defaultValues"]

// Mirrors the cleaner side's ProfileViewEdit: defaults to the read-only
// "how others see you" card, switching to the editable form and back on
// save — so a host's own profile only looks different from what a cleaner
// sees while they're actively editing it.
export default function ProfileViewEdit({
  fullName,
  avatarUrl,
  customer,
  reviews,
  town,
  defaultValues,
  action,
  startInEdit = false,
}: {
  fullName: string
  avatarUrl: string | null
  customer: Customer | null
  reviews: ReviewItem[]
  town?: string | null
  defaultValues: DefaultValues
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>
  // Set by `?edit=1` — e.g. the "choose your area" notification lands straight in the form.
  startInEdit?: boolean
}) {
  const [editing, setEditing] = useState(startInEdit)

  if (editing) {
    return <ProfileForm defaultValues={defaultValues} action={action} onSaved={() => setEditing(false)} />
  }
  return (
    <ProfileView
      fullName={fullName}
      avatarUrl={avatarUrl}
      customer={customer}
      reviews={reviews}
      town={town}
      onEdit={() => setEditing(true)}
    />
  )
}
