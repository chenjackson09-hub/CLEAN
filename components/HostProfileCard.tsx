import Image from "next/image";
import type { Customer } from "@/types/database";
import ReviewsList, { type ReviewItem } from "./HostProfileReviews";
import { StarIcon } from "./HostProfileIcons";

const DWELLING_LABELS: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  guesthouse: "Guesthouse / Airbnb",
  office: "Office",
  villa: "Villa",
  other: "Other",
};

const PRIORITY_LABELS: Record<string, string> = {
  kitchen: "Kitchen",
  bathrooms: "Bathrooms",
  floors: "Floors",
  dusting: "Dusting",
  windows: "Windows",
  linens: "Linens",
  laundry: "Laundry",
  outdoor: "Outdoor",
};

const LABEL = "text-xs text-gray-400 mb-1.5";
const PILL = "px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs";

// The host profile card — laid out like the cleaner's profile card (one white
// card, small grey section labels, grey stat tiles, blue pills). Used on the
// cleaner-facing /cleaner/customers/[id] page and, via the `action` slot for
// the edit pencil, on the host's own /profile page.
export default function HostProfileCard({
  fullName,
  avatarUrl,
  customer,
  reviews,
  action,
}: {
  fullName: string;
  avatarUrl: string | null;
  customer: Customer | null;
  reviews: ReviewItem[];
  action?: React.ReactNode;
}) {
  const isVerified = customer?.status === "approved";
  const ratingCount = customer?.rating_count ?? 0;
  const ratingAvg = customer?.rating_avg != null ? Number(customer.rating_avg) : null;
  const cleansCompleted = customer?.cleans_completed ?? 0;

  const dwellingLabel = customer?.dwelling_type
    ? DWELLING_LABELS[customer.dwelling_type] ?? customer.dwelling_type
    : null;
  const homeTypeLine = [dwellingLabel, customer?.address].filter(Boolean).join(" · ");

  // Home stats as label/value tiles (same format as the cleaner profile's stats
  // grid). Merges the older num_rooms/floor fields with the newer
  // bedrooms/bathrooms/num_floors ones, since a customer may only have one set.
  const bedrooms = customer?.bedrooms ?? customer?.num_rooms ?? null;
  const homeFields: { label: string; value: string }[] = customer
    ? [
        bedrooms != null ? { label: customer.bedrooms != null ? "Bedrooms" : "Rooms", value: String(bedrooms) } : null,
        customer.bathrooms != null ? { label: "Bathrooms", value: String(customer.bathrooms) } : null,
        customer.floor != null ? { label: "Floor", value: String(customer.floor) } : null,
        customer.num_floors != null ? { label: "Floors", value: String(customer.num_floors) } : null,
        customer.house_size_sqm != null ? { label: "Size", value: `~${customer.house_size_sqm} m²` } : null,
        customer.num_people != null ? { label: "People", value: String(customer.num_people) } : null,
        customer.num_kids_under_15 != null ? { label: "Kids under 15", value: String(customer.num_kids_under_15) } : null,
      ].filter((f): f is { label: string; value: string } => f !== null)
    : [];

  const hasPets = (customer?.pet_types?.length ?? 0) > 0;
  const petCountLabel = customer?.pet_types
    ?.map((p) => (p === "dog" ? "dog" : p === "cat" ? "cat" : "pet"))
    .join(" & ");
  const petLine = customer?.num_pets ? `${customer.num_pets} ${petCountLabel}` : petCountLabel;

  const priorityBubbles = (customer?.cleaning_priorities ?? []).map((p) =>
    p === "other" ? customer?.cleaning_priorities_other || "Other" : PRIORITY_LABELS[p] ?? p
  );

  return (
    <div className="bg-white rounded-3xl shadow-md p-6">
      {action && <div className="flex justify-end mb-2">{action}</div>}

      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 overflow-hidden shrink-0 flex items-center justify-center text-blue-600 font-bold text-2xl">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={fullName} width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{fullName}</h1>
          {ratingAvg != null && ratingCount > 0 && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
              <StarIcon className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{ratingAvg.toFixed(1)}</span>
              <span className="text-gray-400">({ratingCount})</span>
            </div>
          )}
          {customer?.address && <p className="text-sm text-gray-500 mt-1 truncate">{customer.address}</p>}
          {isVerified && <p className="text-xs font-medium text-blue-600 mt-1">✓ Verified host</p>}
        </div>
      </div>

      {customer?.bio && <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">{customer.bio}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-gray-400">Cleans completed</p>
          <p className="text-base font-semibold text-gray-900 mt-0.5">{cleansCompleted}</p>
        </div>
        {dwellingLabel && (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">Home type</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{dwellingLabel}</p>
          </div>
        )}
        {homeFields.map((f) => (
          <div key={f.label} className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-400">{f.label}</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>

      {hasPets && (
        <div className="mb-4">
          <p className={LABEL}>Pets</p>
          <div className="flex items-center gap-3">
            {customer?.pet_photo_url && (
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0">
                <Image src={customer.pet_photo_url} alt="Pet" width={48} height={48} className="object-cover w-full h-full" />
              </div>
            )}
            <div className="min-w-0">
              <span className={PILL}>{petLine}</span>
              {customer?.pet_note && <p className="text-sm text-gray-600 italic mt-1.5">&ldquo;{customer.pet_note}&rdquo;</p>}
            </div>
          </div>
        </div>
      )}

      {priorityBubbles.length > 0 && (
        <div className="mb-4">
          <p className={LABEL}>Usually clean</p>
          <div className="flex flex-wrap gap-1.5">
            {priorityBubbles.map((label) => (
              <span key={label} className={PILL}>{label}</span>
            ))}
          </div>
        </div>
      )}

      {customer?.home_instructions && (
        <div className="mb-4">
          <p className={LABEL}>Home notes</p>
          <p className="text-sm text-gray-600 italic whitespace-pre-line">&ldquo;{customer.home_instructions}&rdquo;</p>
        </div>
      )}

      <div>
        <p className={LABEL}>
          Reviews from cleaners
          {ratingCount > 0 ? ` (${ratingCount})` : ""}
        </p>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet.</p>
        ) : (
          <ReviewsList reviews={reviews} />
        )}
      </div>
    </div>
  );
}
