// Read-only body of the redesigned booking request card — shared by the
// customer's own "sent" confirmation (BookingRequestForm) and the cleaner's
// request detail view (RequestCard), so both literally render the same
// summary of a booking. Deliberately i18n-system-agnostic (like
// HelpWidget.tsx): the customer side uses lib/i18n/LanguageContext and the
// cleaner side uses context/LangContext, so rather than depend on either
// hook this takes a plain `lang` prop and keeps its own small EN/HE string
// map, matching the pattern HelpWidget already established for a component
// that has to render correctly on both sides of that i18n split.

export type BookingSummaryData = {
  scheduledDate: string; // 'YYYY-MM-DD'
  scheduledStart: string; // 'HH:MM' or 'HH:MM:SS'
  durationHours: number;
  homeDwellingType: "apartment" | "house" | "guesthouse" | "office" | "villa" | "other" | null;
  homeArea: string | null;
  homeBedrooms: number | null;
  homeBathrooms: number | null;
  cleaningType: "regular" | "deep" | null;
  extras: string[];
  petsLabel: string | null; // e.g. "1 dog" — null when the host has no pets
  petsPresent: boolean | null;
  hostPresent: boolean | null;
  notes: string | null;
  hourlyRate: number | null;
};

const EXTRA_KEYS = ["oven", "linens", "windows", "fridge", "laundry", "outdoor"] as const;

const STRINGS = {
  en: {
    date: "Date",
    startTime: "Requested start time",
    duration: "Estimated duration",
    durationHelp: "This is how long we estimate the clean will take. The actual time may be a little shorter or longer.",
    durationValue: (n: number) => `${n} hours`,
    yourHome: "Your home",
    dwelling: { apartment: "Apartment", house: "House", guesthouse: "Guesthouse / Airbnb", office: "Office", villa: "Villa", other: "Home" },
    bedrooms: (n: number) => `${n} bedroom${n === 1 ? "" : "s"}`,
    bathrooms: (n: number) => `${n} bathroom${n === 1 ? "" : "s"}`,
    cleaningType: "Cleaning type",
    cleaningTypeRegular: "Regular cleaning",
    cleaningTypeDeep: "Deep cleaning",
    extras: "Extras",
    extraLabels: { oven: "Oven", linens: "Change bed linen", windows: "Windows", fridge: "Fridge", laundry: "Laundry", outdoor: "Balcony / outdoor area" },
    pets: "Pets",
    petsWillBeHome: "Will be home",
    petsAway: "Will not be home",
    willYouBeHome: "Will you be home?",
    yes: "Yes",
    no: "No",
    note: (name: string) => `Note for ${name}`,
    estimatedTotal: "Estimated total",
    priceBreakdown: (hours: number, rate: number) => `${hours} hours × ₪${rate}/hr`,
  },
  he: {
    date: "תאריך",
    startTime: "שעת התחלה מבוקשת",
    duration: "משך מוערך",
    durationHelp: "זהו הזמן המשוער שלוקח לנקות את הבית. הזמן בפועל עשוי להיות מעט קצר או ארוך יותר.",
    durationValue: (n: number) => `${n} שעות`,
    yourHome: "הבית שלכם",
    dwelling: { apartment: "דירה", house: "בית", guesthouse: "יחידת אירוח / Airbnb", office: "משרד", villa: "וילה", other: "בית" },
    bedrooms: (n: number) => `${n} חדרי שינה`,
    bathrooms: (n: number) => `${n} חדרי אמבטיה`,
    cleaningType: "סוג ניקיון",
    cleaningTypeRegular: "ניקיון רגיל",
    cleaningTypeDeep: "ניקיון יסודי",
    extras: "תוספות",
    extraLabels: { oven: "תנור", linens: "החלפת מצעים", windows: "חלונות", fridge: "מקרר", laundry: "כביסה", outdoor: "מרפסת / שטח חוץ" },
    pets: "חיות מחמד",
    petsWillBeHome: "יהיו בבית",
    petsAway: "לא יהיו בבית",
    willYouBeHome: "האם תהיו בבית?",
    yes: "כן",
    no: "לא",
    note: (name: string) => `הערה עבור ${name}`,
    estimatedTotal: 'סה"כ משוער',
    priceBreakdown: (hours: number, rate: number) => `${hours} שעות × ₪${rate} לשעה`,
  },
} as const;

// Titles are the bold part; answers are plain text a notch larger — so the eye
// reads "what is this" first and the value second, instead of a wall of bold.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900 mb-0.5">{label}</p>
      <div className="text-base font-normal text-gray-700">{children}</div>
    </div>
  );
}

export default function BookingRequestSummary({
  data,
  cleanerName,
  lang = "en",
}: {
  data: BookingSummaryData;
  cleanerName: string;
  lang?: "en" | "he";
}) {
  const s = STRINGS[lang];
  const dateFormatted = new Date(data.scheduledDate + "T00:00:00").toLocaleDateString(
    lang === "he" ? "he-IL" : "en-US",
    { weekday: "short", day: "numeric", month: "short", year: "numeric" }
  );
  const homeLine = [data.homeDwellingType ? s.dwelling[data.homeDwellingType] : null, data.homeArea]
    .filter(Boolean)
    .join(" · ");
  const homeDetails = [
    data.homeBedrooms != null ? s.bedrooms(data.homeBedrooms) : null,
    data.homeBathrooms != null ? s.bathrooms(data.homeBathrooms) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const extraLabels = data.extras.map((e) =>
    (EXTRA_KEYS as readonly string[]).includes(e) ? s.extraLabels[e as (typeof EXTRA_KEYS)[number]] : e
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Row label={s.date}>{dateFormatted}</Row>
        <Row label={s.startTime}>{data.scheduledStart.slice(0, 5)}</Row>
      </div>

      <div>
        <Row label={s.duration}>{s.durationValue(data.durationHours)}</Row>
        <p className="text-xs text-gray-500 mt-0.5">{s.durationHelp}</p>
      </div>

      {(homeLine || homeDetails) && (
        <Row label={s.yourHome}>
          {homeLine && <p>{homeLine}</p>}
          {homeDetails && <p className="text-sm text-gray-500">{homeDetails}</p>}
        </Row>
      )}

      {data.cleaningType && (
        <Row label={s.cleaningType}>
          {data.cleaningType === "deep" ? s.cleaningTypeDeep : s.cleaningTypeRegular}
        </Row>
      )}

      {extraLabels.length > 0 && (
        <Row label={s.extras}>
          <p>{extraLabels.join(" · ")}</p>
        </Row>
      )}

      {data.petsLabel && (
        <div className="grid grid-cols-2 gap-4">
          <Row label={s.pets}>
            <p>{data.petsLabel}</p>
            {data.petsPresent != null && (
              <p className="text-sm text-gray-500">
                {data.petsPresent ? s.petsWillBeHome : s.petsAway}
              </p>
            )}
          </Row>
          {data.hostPresent != null && (
            <Row label={s.willYouBeHome}>{data.hostPresent ? s.yes : s.no}</Row>
          )}
        </div>
      )}

      {!data.petsLabel && data.hostPresent != null && (
        <Row label={s.willYouBeHome}>{data.hostPresent ? s.yes : s.no}</Row>
      )}

      {data.notes && (
        <Row label={s.note(cleanerName)}>
          <p className="text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 whitespace-pre-line">{data.notes}</p>
        </Row>
      )}

      {data.hourlyRate != null && (
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">{s.estimatedTotal}</span>
          <div className="text-end">
            <p className="text-xs text-gray-500">{s.priceBreakdown(data.durationHours, data.hourlyRate)}</p>
            <p className="text-lg font-normal text-gray-900">₪{data.durationHours * data.hourlyRate}</p>
          </div>
        </div>
      )}
    </div>
  );
}
