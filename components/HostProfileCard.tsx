"use client";

import { CindyVerifiedBadge } from "@/components/CindyVerifiedBadge";
import Image from "next/image";
import type { Customer } from "@/types/database";
import ReviewsList, { type ReviewItem } from "./HostProfileReviews";
import { StarIcon } from "./HostProfileIcons";
import { useDocLang } from "@/components/chat/useDocLang";

type Lang = "en" | "he";

const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Own EN/HE text: this card is shown by hosts (customer i18n) and by cleaners (cleaner i18n), so
// like the chat and the help bubble it takes the language from <html dir>.
const STR = {
  en: {
    aboutUs: "About us",
    theHome: "The home",
    cleansDone: (n: number) => (n === 1 ? "1 clean completed" : `${n} cleans completed`),
    cleansRated: (n: number) => (n === 1 ? "1 clean" : `${n} cleans`),
    dwelling: { apartment: "Apartment", house: "House", guesthouse: "Guesthouse / Airbnb", office: "Office", villa: "Villa", other: "Other" } as Record<string, string>,
    bedrooms: (n: number) => plural(n, "bedroom", "bedrooms"),
    rooms: (n: number) => plural(n, "room", "rooms"),
    bathrooms: (n: number) => plural(n, "bathroom", "bathrooms"),
    floorsInHome: (n: number) => plural(n, "floor in the home", "floors in the home"),
    apartmentFloor: (n: number) => `Apartment on floor ${n}`,
    people: (n: number) => plural(n, "person", "people"),
    kids: (n: number) => plural(n, "kid under 15", "kids under 15"),
    photos: "Photos of the home",
    photoAlt: "Photo of the home",
    photosNote: "Shared by the host with you because you have a request from them. Please don't share them.",
    languages: "Languages",
    pets: "Pets",
    petAlt: "Pet",
    petLine: (types: string[], count: number | null) => {
      const kinds = types.map((p) => (p === "dog" ? "dog" : p === "cat" ? "cat" : "pet")).join(" & ");
      return count ? `${count} ${kinds}` : kinds;
    },
    typicalNeeds: "Typical needs",
    howOften: "How often",
    perVisit: "Per visit",
    days: "Days",
    daysFlexible: "Days · flexible",
    flexible: "Flexible",
    hours: (h: number) => `~${h} ${h === 1 ? "hour" : "hours"}`,
    frequency: { weekly: "Weekly", twice_monthly: "Twice a month", monthly: "Monthly", occasional: "Occasionally", one_time: "Just once", other: "Other" } as Record<string, string>,
    cleaningType: { regular: "Regular cleaning", deep: "Deep cleaning", both: "Regular and deep cleaning" } as Record<string, string>,
    priorities: { kitchen: "Kitchen", bathrooms: "Bathrooms", floors: "Floors", dusting: "Dusting", windows: "Windows", linens: "Linens", laundry: "Laundry", dishes: "Dishes", outdoor: "Outdoor" } as Record<string, string>,
    other: "Other",
    dayLabels: { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" } as Record<string, string>,
    needsNote: "Each request may differ from this profile.",
    notesLocked: "Home notes are shared once you accept a request from this host.",
    homeNotes: "Home notes",
    reviews: "Reviews from cleaners",
    noReviews: "No reviews yet.",
    seeAll: "See all reviews",
  },
  he: {
    aboutUs: "עלינו",
    theHome: "הבית",
    cleansDone: (n: number) => (n === 1 ? "ניקיון אחד הושלם" : `${n} ניקיונות הושלמו`),
    cleansRated: (n: number) => (n === 1 ? "ניקיון אחד" : `${n} ניקיונות`),
    dwelling: { apartment: "דירה", house: "בית", guesthouse: "צימר / Airbnb", office: "משרד", villa: "וילה", other: "אחר" } as Record<string, string>,
    bedrooms: (n: number) => (n === 1 ? "חדר שינה אחד" : `${n} חדרי שינה`),
    rooms: (n: number) => (n === 1 ? "חדר אחד" : `${n} חדרים`),
    bathrooms: (n: number) => (n === 1 ? "חדר אמבטיה אחד" : `${n} חדרי אמבטיה`),
    floorsInHome: (n: number) => (n === 1 ? "קומה אחת בבית" : `${n} קומות בבית`),
    apartmentFloor: (n: number) => `הדירה בקומה ${n}`,
    people: (n: number) => (n === 1 ? "נפש אחת" : `${n} נפשות`),
    kids: (n: number) => (n === 1 ? "ילד אחד מתחת לגיל 15" : `${n} ילדים מתחת לגיל 15`),
    photos: "תמונות של הבית",
    photoAlt: "תמונה של הבית",
    photosNote: "המארח שיתף אתכם בתמונות האלה כי יש לכם בקשה ממנו. נא לא לשתף אותן הלאה.",
    languages: "שפות",
    pets: "חיות מחמד",
    petAlt: "חיית מחמד",
    petLine: (types: string[], count: number | null) => {
      const kinds = types.map((p) => (p === "dog" ? "כלב" : p === "cat" ? "חתול" : "חיית מחמד")).join(" ו");
      return count ? `${kinds} (${count})` : kinds;
    },
    typicalNeeds: "צרכים אופייניים",
    howOften: "תדירות",
    perVisit: "משך ביקור",
    days: "ימים",
    daysFlexible: "ימים · גמישים",
    flexible: "גמישים",
    hours: (h: number) => (h === 1 ? "בערך שעה" : h === 2 ? "בערך שעתיים" : `בערך ${h} שעות`),
    frequency: { weekly: "כל שבוע", twice_monthly: "פעמיים בחודש", monthly: "פעם בחודש", occasional: "מדי פעם", one_time: "פעם אחת", other: "אחר" } as Record<string, string>,
    cleaningType: { regular: "ניקיון רגיל", deep: "ניקיון יסודי", both: "ניקיון רגיל ויסודי" } as Record<string, string>,
    priorities: { kitchen: "מטבח", bathrooms: "חדרי אמבטיה", floors: "רצפות", dusting: "ניקוי אבק", windows: "חלונות", linens: "החלפת מצעים", laundry: "כביסה", dishes: "כלים", outdoor: "שטח חיצוני" } as Record<string, string>,
    other: "אחר",
    dayLabels: { sun: "א׳", mon: "ב׳", tue: "ג׳", wed: "ד׳", thu: "ה׳", fri: "ו׳", sat: "שבת" } as Record<string, string>,
    needsNote: "כל בקשה עשויה להיות שונה מהפרופיל הזה.",
    notesLocked: "ההערות על הבית נחשפות אחרי שמאשרים בקשה מהמארח הזה.",
    homeNotes: "הערות על הבית",
    reviews: "חוות דעת ממנקים",
    noReviews: "אין חוות דעת עדיין.",
    seeAll: "לכל חוות הדעת",
  },
} satisfies Record<Lang, unknown>;

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
  const lang = useDocLang();
  const t = STR[lang];
  const ratingCount = customer?.rating_count ?? 0;
  const ratingAvg = customer?.rating_avg != null ? Number(customer.rating_avg) : null;
  const cleansCompleted = customer?.cleans_completed ?? 0;

  const dwellingLabel = customer?.dwelling_type ? t.dwelling[customer.dwelling_type] ?? customer.dwelling_type : null;

  // Home facts as compact chips ("3 bedrooms", "~41 m²") instead of one big tile per number.
  // Merges the older num_rooms/floor fields with the newer bedrooms/bathrooms/num_floors ones,
  // since a customer may only have one set.
  const bedrooms = customer?.bedrooms ?? customer?.num_rooms ?? null;
  const homeFacts: string[] = customer
    ? [
        bedrooms != null ? (customer.bedrooms != null ? t.bedrooms(Number(bedrooms)) : t.rooms(Number(bedrooms))) : null,
        customer.bathrooms != null ? t.bathrooms(Number(customer.bathrooms)) : null,
        customer.num_floors != null ? t.floorsInHome(Number(customer.num_floors)) : null,
        customer.floor != null ? t.apartmentFloor(Number(customer.floor)) : null,
        customer.house_size_sqm != null ? `~${customer.house_size_sqm} m²` : null,
        customer.num_people != null ? t.people(Number(customer.num_people)) : null,
        customer.num_kids_under_15 != null ? t.kids(Number(customer.num_kids_under_15)) : null,
      ].filter((f): f is string => f !== null)
    : [];

  const hasPets = (customer?.pet_types?.length ?? 0) > 0;
  const petLine = t.petLine(customer?.pet_types ?? [], customer?.num_pets ?? null);

  const priorityBubbles = (customer?.cleaning_priorities ?? []).map((p) =>
    p === "other" ? customer?.cleaning_priorities_other || t.other : t.priorities[p] ?? p
  );

  // "Typical needs": what this household usually asks for. Each request can still differ.
  const hours = customer?.typical_hours != null && customer.typical_hours !== "" ? Number(customer.typical_hours) : null;
  const dayList = DAY_ORDER.filter((d) => (customer?.preferred_days ?? []).includes(d)).map((d) => t.dayLabels[d]);
  const needRows: { label: string; value: string }[] = [
    customer?.usage_frequency ? { label: t.howOften, value: t.frequency[customer.usage_frequency] ?? customer.usage_frequency } : null,
    hours != null && Number.isFinite(hours) && hours > 0 ? { label: t.perVisit, value: t.hours(hours) } : null,
    dayList.length > 0
      ? { label: customer?.days_flexible ? t.daysFlexible : t.days, value: dayList.join(", ") }
      : customer?.days_flexible
        ? { label: t.days, value: t.flexible }
        : null,
  ].filter((r): r is { label: string; value: string } => r !== null);
  const cleaningTypeLabel = customer?.usual_cleaning_type ? t.cleaningType[customer.usual_cleaning_type] ?? null : null;
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
              <span className="text-gray-400">· {t.cleansRated(ratingCount)}</span>
            </div>
          )}
          {town && <p className="text-sm text-gray-500 mt-1 truncate">{town}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{t.cleansDone(cleansCompleted)}</p>
          {cindyVerified && <p className="mt-1.5"><CindyVerifiedBadge lang={lang} /></p>}
        </div>
      </div>

      {customer?.bio && (
        <div className="mb-4">
          <p className={LABEL}>{t.aboutUs}</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-blue-50/60 rounded-xl px-3 py-2.5">{customer.bio}</p>
        </div>
      )}

      {(dwellingLabel || homeFacts.length > 0) && (
        <div className="mb-4">
          <p className={LABEL}>{t.theHome}</p>
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
          <p className={LABEL}>{t.photos}</p>
          <ul className="grid grid-cols-3 gap-2">
            {homePhotos.map((url) => (
              <li key={url} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                {/* A plain <img>: private, short-lived links must not go through the public image optimizer cache. */}
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={t.photoAlt} className="w-full h-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-1.5">{t.photosNote}</p>
        </div>
      )}

      {(customer?.languages ?? []).length > 0 && (
        <div className="mb-4">
          <p className={LABEL}>{t.languages}</p>
          <div className="flex flex-wrap gap-1.5">
            {(customer?.languages ?? []).map((l) => (
              <span key={l} className={PILL}>{l}</span>
            ))}
          </div>
        </div>
      )}

      {hasPets && (
        <div className="mb-4">
          <p className={LABEL}>{t.pets}</p>
          <div className="flex items-center gap-3">
            {customer?.pet_photo_url && (
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0">
                <Image src={customer.pet_photo_url} alt={t.petAlt} width={48} height={48} className="object-cover w-full h-full" />
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
          <p className={LABEL}>{t.typicalNeeds}</p>
          {needRows.length > 0 && (
            <dl className="bg-gray-50 rounded-xl px-3 divide-y divide-gray-100 mb-2">
              {needRows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-xs text-gray-400 shrink-0">{row.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900 text-end">{row.value}</dd>
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
          <p className="text-xs text-gray-400 mt-2">{t.needsNote}</p>
        </div>
      )}

      {homeNotesLocked && (
        <div className="mb-4 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
          <span aria-hidden>🔒 </span>
          {t.notesLocked}
        </div>
      )}

      {!homeNotesLocked && customer?.home_instructions && (
        <div className="mb-4">
          <p className={LABEL}>{t.homeNotes}</p>
          <p className="text-sm text-gray-600 italic whitespace-pre-line">&ldquo;{customer.home_instructions}&rdquo;</p>
        </div>
      )}

      <div>
        <p className={LABEL}>
          {t.reviews}
          {ratingCount > 0 ? ` (${ratingCount})` : ""}
        </p>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">{t.noReviews}</p>
        ) : (
          <ReviewsList reviews={reviews} seeAllLabel={t.seeAll} />
        )}
      </div>
    </div>
  );
}
