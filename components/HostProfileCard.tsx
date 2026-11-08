import { CindyVerifiedBadge } from "@/components/CindyVerifiedBadge";
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
  dishes: "Dishes",
  outdoor: "Outdoor",
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  twice_monthly: "Twice a month",
  monthly: "Monthly",
  occasional: "Occasionally",
  one_time: "Just once",
  other: "Other",
};

const CLEANING_TYPE_LABELS: Record<string, string> = {
  regular: "Regular cleaning",
  deep: "Deep cleaning",
  both: "Regular and deep cleaning",
};

const DAY_LABELS: Record<string, string> = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

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
  town,
  cindyVerified = false,
  homeNotesLocked = false,
  homePhotos = [],
}: {
  fullName: string;
  avatarUrl: string | null;
  customer: Customer | null;
  reviews: ReviewItem[];
  action?: React.ReactNode;
  // The host's TOWN only (never a street). Passed in by the page that knows the chosen locality.
  town?: string | null;
  // True only when an admin has explicitly Cindy-Verified this host.
  cindyVerified?: boolean;
  // True for a cleaner who has no confirmed booking with this host yet: the home notes are a
  // private booking detail, shared once the cleaner accepts. The caller must also leave the
  // text out of `customer`, so it never reaches the cleaner's browser.
  homeNotesLocked?: boolean;
  // Short-lived signed links to the host's PRIVATE home photos. Only the cleaner-facing page
  // passes them, and only while that cleaner has a live request from the host.
  homePhotos?: string[];
}) {
  const ratingCount = customer?.rating_count ?? 0;
  const ratingAvg = customer?.rating_avg != null ? Number(customer.rating_avg) : null;
  const cleansCompleted = customer?.cleans_completed ?? 0;

  const dwellingLabel = customer?.dwelling_type
    ? DWELLING_LABELS[customer.dwelling_type] ?? customer.dwelling_type
    : null;

  // Home facts as compact chips ("3 bedrooms", "~41 m²") instead of one big tile per number.
  // Merges the older num_rooms/floor fields with the newer bedrooms/bathrooms/num_floors ones,
  // since a customer may only have one set.
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const bedrooms = customer?.bedrooms ?? customer?.num_rooms ?? null;
  const homeFacts: string[] = customer
    ? [
        bedrooms != null ? plural(Number(bedrooms), customer.bedrooms != null ? "bedroom" : "room", customer.bedrooms != null ? "bedrooms" : "rooms") : null,
        customer.bathrooms != null ? plural(Number(customer.bathrooms), "bathroom", "bathrooms") : null,
        customer.num_floors != null ? plural(Number(customer.num_floors), "floor in the home", "floors in the home") : null,
        customer.floor != null ? `Apartment on floor ${customer.floor}` : null,
        customer.house_size_sqm != null ? `~${customer.house_size_sqm} m²` : null,
        customer.num_people != null ? plural(Number(customer.num_people), "person", "people") : null,
        customer.num_kids_under_15 != null ? plural(Number(customer.num_kids_under_15), "kid under 15", "kids under 15") : null,
      ].filter((f): f is string => f !== null)
    : [];

  const hasPets = (customer?.pet_types?.length ?? 0) > 0;
  const petCountLabel = customer?.pet_types
    ?.map((p) => (p === "dog" ? "dog" : p === "cat" ? "cat" : "pet"))
    .join(" & ");
  const petLine = customer?.num_pets ? `${customer.num_pets} ${petCountLabel}` : petCountLabel;

  const priorityBubbles = (customer?.cleaning_priorities ?? []).map((p) =>
    p === "other" ? customer?.cleaning_priorities_other || "Other" : PRIORITY_LABELS[p] ?? p
  );

  // "Typical needs": what this household usually asks for. Each request can still differ.
  const hours = customer?.typical_hours != null && customer.typical_hours !== "" ? Number(customer.typical_hours) : null;
  const dayList = DAY_ORDER.filter((d) => (customer?.preferred_days ?? []).includes(d)).map((d) => DAY_LABELS[d]);
  const needRows: { label: string; value: string }[] = [
    customer?.usage_frequency ? { label: "How often", value: FREQUENCY_LABELS[customer.usage_frequency] ?? customer.usage_frequency } : null,
    hours != null && Number.isFinite(hours) && hours > 0 ? { label: "Per visit", value: `~${hours} ${hours === 1 ? "hour" : "hours"}` } : null,
    dayList.length > 0
      ? { label: customer?.days_flexible ? "Days · flexible" : "Days", value: dayList.join(", ") }
      : customer?.days_flexible
        ? { label: "Days", value: "Flexible" }
        : null,
  ].filter((t): t is { label: string; value: string } => t !== null);
  const cleaningTypeLabel = customer?.usual_cleaning_type ? CLEANING_TYPE_LABELS[customer.usual_cleaning_type] ?? null : null;
  const hasNeeds = needRows.length > 0 || priorityBubbles.length > 0 || cleaningTypeLabel !== null;

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
              <span className="text-gray-400">· {ratingCount === 1 ? "1 clean" : `${ratingCount} cleans`}</span>
            </div>
          )}
          {town && <p className="text-sm text-gray-500 mt-1 truncate">{town}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{cleansCompleted === 1 ? "1 clean completed" : `${cleansCompleted} cleans completed`}</p>
          {cindyVerified && <p className="mt-1.5"><CindyVerifiedBadge /></p>}
        </div>
      </div>

      {customer?.bio && (
        <div className="mb-4">
          <p className={LABEL}>About us</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-blue-50/60 rounded-xl px-3 py-2.5">{customer.bio}</p>
        </div>
      )}

      {(dwellingLabel || homeFacts.length > 0) && (
        <div className="mb-4">
          <p className={LABEL}>The home</p>
          <div className="flex flex-wrap gap-1.5">
            {dwellingLabel && <span className="px-2.5 py-1 rounded-full bg-gray-800 text-white text-xs font-medium">{dwellingLabel}</span>}
            {homeFacts.map((f) => (
              <span key={f} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{f}</span>
            ))}
          </div>
        </div>
      )}

      {homePhotos.length > 0 && (
        <div className="mb-4">
          <p className={LABEL}>Photos of the home</p>
          <ul className="grid grid-cols-3 gap-2">
            {homePhotos.map((url) => (
              <li key={url} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                {/* A plain <img>: private, short-lived links must not go through the public image optimizer cache. */}
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Photo of the home" className="w-full h-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-1.5">Shared by the host with you because you have a request from them. Please don&apos;t share them.</p>
        </div>
      )}

      {(customer?.languages ?? []).length > 0 && (
        <div className="mb-4">
          <p className={LABEL}>Languages</p>
          <div className="flex flex-wrap gap-1.5">
            {(customer?.languages ?? []).map((l) => (
              <span key={l} className={PILL}>{l}</span>
            ))}
          </div>
        </div>
      )}

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

      {hasNeeds && (
        <div className="mb-4">
          <p className={LABEL}>Typical needs</p>
          {needRows.length > 0 && (
            <dl className="bg-gray-50 rounded-xl px-3 divide-y divide-gray-100 mb-2">
              {needRows.map((t) => (
                <div key={t.label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-xs text-gray-400 shrink-0">{t.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900 text-end">{t.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {(priorityBubbles.length > 0 || cleaningTypeLabel) && (
            <div className="flex flex-wrap gap-1.5">
              {priorityBubbles.map((label) => (
                <span key={label} className={PILL}>{label}</span>
              ))}
              {cleaningTypeLabel && <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">{cleaningTypeLabel}</span>}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Each request may differ from this profile.</p>
        </div>
      )}

      {homeNotesLocked && (
        <div className="mb-4 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
          <span aria-hidden>🔒 </span>
          Home notes are shared once you accept a request from this host.
        </div>
      )}

      {!homeNotesLocked && customer?.home_instructions && (
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
