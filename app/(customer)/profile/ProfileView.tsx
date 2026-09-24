"use client"

import HostProfileCard from "@/components/HostProfileCard"
import type { ReviewItem } from "@/components/HostProfileReviews"
import type { Customer } from "@/types/database"
import { useLanguage } from "@/lib/i18n/LanguageContext"

// The host's own read-only profile — deliberately the *exact same* card a
// cleaner sees at /cleaner/customers/[id] (via the shared HostProfileCard),
// so a host's profile looks like what other people already see it as. The
// only difference is the "Edit profile" affordance in the `action` slot,
// which ProfileViewEdit swaps this out for the editable ProfileForm.
export default function ProfileView({
  fullName,
  avatarUrl,
  customer,
  reviews,
  onEdit,
}: {
  fullName: string
  avatarUrl: string | null
  customer: Customer | null
  reviews: ReviewItem[]
  onEdit: () => void
}) {
  const { t } = useLanguage()
  return (
    <HostProfileCard
      fullName={fullName}
      avatarUrl={avatarUrl}
      customer={customer}
      reviews={reviews}
      action={
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('profile.editProfile')}
          className="text-lg text-gray-500 hover:text-gray-800 transition-colors"
        >
          ✏️
        </button>
      }
    />
  )
}
