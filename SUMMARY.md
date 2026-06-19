# Clean — Developer Summary

A practical map of the codebase for navigating and making changes. For the
authoritative architecture notes and gotchas, also read `CLAUDE.md` — this file
is the "where do I find / how does X flow" companion.

---

## 1. What the app is

A two-sided cleaning marketplace with three roles:

- **Customer** — searches for cleaners by date + location, views a profile, sends a booking request.
- **Cleaner** — sets availability per date, accepts/declines requests, completes jobs.
- **Admin** — approves cleaner applications, oversees cleaners/customers/bookings.

Stack: **Next.js 14 (App Router) · TypeScript · Supabase (Postgres + Auth + Storage + Realtime) · Tailwind · Resend (email)**.

---

## 2. Run it

```bash
npm run dev     # dev server (WSL polling flags baked in)
npm run build   # prod build = also type-checks + lints
npm run lint
npm test        # Jest + Testing Library (jsdom)
npm run regeocode  # backfill cleaner lat/lng from address (--dry-run supported)
```

**Never `npm run build` while `npm run dev` runs** — both write `.next/`; the build clobbers dev's assets and pages render unstyled.

Quick type-check without a full build: `npx tsc --noEmit`.

Required env (`.env`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`.

---

## 3. Directory map

```
CLEAN/
├── middleware.ts            # edge auth + role gate (runs on every request)
├── app/
│   ├── layout.tsx           # root <html>, fonts, metadata (title "CLEAN")
│   ├── (auth)/              # /login, /register/{cleaner,customer} + actions.ts
│   ├── (cleaner)/
│   │   ├── layout.tsx       # cleaner shell → renders NavLinks
│   │   ├── NavLinks.tsx     # top nav + Settings dropdown (lang + sign out)
│   │   ├── StatusBadge.tsx
│   │   ├── actions.ts       # cleaner server actions (profile, respond, complete)
│   │   └── cleaner/
│   │       ├── dashboard/   # Upcoming + Past cleans, RealtimeBookings, CleanDetailModal
│   │       ├── availability/# CalendarGrid (per-date slots) + day panel
│   │       ├── requests/    # incoming booking requests (RequestCard)
│   │       ├── preview/     # public-facing profile preview
│   │       ├── profile/     # editable cleaner profile + gallery
│   │       ├── pending/     # "application under review" screen
│   │       └── customers/[id]/
│   ├── (customer)/
│   │   ├── layout.tsx       # customer shell → CustomerNav
│   │   ├── CustomerNav.tsx  # nav + Settings dropdown (lang + sign out)
│   │   ├── actions.ts       # customer server actions (createBooking, profile)
│   │   ├── browse/          # search UI (see §5)
│   │   ├── cleaners/[id]/   # cleaner profile + BookingRequestForm
│   │   ├── bookings/        # customer's bookings list
│   │   ├── profile/         # editable customer profile
│   │   └── home/
│   ├── admin/               # applications, cleaners, customers, bookings, availability
│   └── api/auth/signout/route.ts
├── lib/
│   ├── supabase/            # server.ts | client.ts | admin.ts  (see §4)
│   ├── i18n/                # customer/admin/auth translations (LanguageContext)
│   ├── lang.ts              # cleaner-side translation strings
│   ├── cleanerSearch.ts     # browse matching logic (dates × slots × distance)
│   ├── geocode.ts           # address → lat/lng (Nominatim, IL-biased)
│   ├── geo.ts               # parsePoint() + haversine distanceKm()
│   ├── expireRequests.ts    # lazy expiry of stale pending requests
│   ├── resend.ts            # typed email senders
│   ├── roleHome.ts          # role → landing route
│   └── types/               # per-feature view models
├── context/LangContext.tsx  # cleaner-side language provider
├── types/database.ts        # shared DB types + enums
├── scripts/regeocode-cleaners.mjs
└── supabase/                # SQL / migrations
```

> Note: there is **no `src/` directory** — everything is under the paths above.

---

## 4. Supabase clients — pick the right one

| Client | Import | RLS | Use in |
|---|---|---|---|
| Server | `lib/supabase/server.ts` | enforced | Server Components, Server Actions, Route Handlers |
| Browser | `lib/supabase/client.ts` | enforced | `"use client"` components |
| Admin | `lib/supabase/admin.ts` → `createAdminClient()` | **bypassed** (service role) | server-only privileged reads/writes |

**The #1 RLS gotcha:** the "users manage own profile" policy hides *other*
users' `profiles` rows. So any cleaner-side `bookings` query that joins
`profiles!customer_id(...)` returns a **null** customer profile under the
cleaner's session. To show a customer's name/phone on a cleaner page you must
read those bookings with `createAdminClient()` (still filtered by
`cleaner_id = user.id`, so it stays scoped). Used by `/cleaner/requests`, the
dashboard, and the availability day panel.

`createAdminClient()` must **never** be imported into a `"use client"` file.

---

## 5. Key flows

### Auth & routing
1. `middleware.ts` skips auth entirely when no session cookie (avoids a hang), else loads the user, redirects unauthenticated → `/login`, and gates `/cleaner/*` to the `cleaner` role.
2. Role lives in `profiles.role` (read from DB, not the JWT).
3. After login, `signIn` redirects via `ROLE_HOME` in `lib/roleHome.ts` (customer → `/browse`, cleaner → `/cleaner/dashboard`, admin → `/admin/applications`).

### Browse / search (`app/(customer)/browse/`)
- `CalendarPicker.tsx` — multi-date picker. Selection is **local state synced from `?dates=` URL param** so a tapped day recolors instantly (no router round-trip lag), then pushes the URL in a transition.
- `BrowseFilters.tsx` — collapsible dropdown (start time, duration, location*, type, sort). Location is **required**. All controls share `h-10 … rounded-xl`; items stick to the start edge (LTR/RTL aware).
- `page.tsx` runs the search via `lib/cleanerSearch.ts`: union of per-date + weekly slots, slot must fully contain the requested window, then in-app haversine distance filter (`distanceKm <= service_radius_km`). Results grouped by date.
- `BrowseResults.tsx` — one cleaner per row; the "N cleaners available" count turns **red** when 0.
- `CleanerCard.tsx` — 3 columns (avatar | info | price-over-button). Names show as `First L.` via `shortenName()`.

### Booking lifecycle
1. Customer submits `BookingRequestForm` → `createBooking` (validates against availability) → status `pending`, with a 24h `response_deadline`.
2. Cleaner sees it in `/cleaner/requests`; accept/decline via `respondToBooking`.
3. On **accept**: the booked time is carved out of that day's `cleaner_availability` (split/trim/remove), double-booking is guarded, and **all of that customer's other pending requests are cancelled** via `createAdminClient()` (they belong to other cleaners → outside this session's RLS).
4. Expired-but-pending requests are lazily marked `declined` by `lib/expireRequests.ts` on cleaner page loads (no cron).
5. Cleaner dashboard splits **Upcoming** (accepted, future) vs **Past** (`completed`); `completeBooking` moves a job to completed.

### Realtime
Headless `"use client"` components subscribe to Postgres changes and call `router.refresh()`. Pattern: `RealtimeBookings.tsx` (cleaner dashboard), `RealtimeCustomerBookings.tsx`. Note `/cleaner/requests` has **no** subscriber — it only refreshes on navigation.

### Geocoding
On cleaner profile save, `lib/geocode.ts` turns the free-text address into a PostGIS `POINT(lng lat)` in `cleaners.location` (Nominatim, biased to Israel/Hebrew). Browse parses it back with `lib/geo.ts` `parsePoint()`.

---

## 6. UI conventions & traps

- **Fixed overlays + portals:** a card with a hover `transform` (e.g. `-translate-y-0.5`) becomes the *containing block* for any `position: fixed` descendant, trapping a modal to the card's box. Render full-screen modals with `createPortal(node, document.body)`. See `cleaner/dashboard/CleanDetailModal.tsx`.
- **RTL:** both i18n systems set `document.documentElement.dir`. Use logical Tailwind utilities (`text-start`, `end-0`, `ms-/me-`, `justify-start`) instead of `left/right` so Hebrew flips correctly.
- **Two i18n systems** (don't cross them):
  - Customer/auth/admin → `@/lib/i18n/LanguageContext`, `useLanguage()`, `t('ns.key')`, strings in `lib/i18n/translations.ts`.
  - Cleaner → `@/context/LangContext`, `useLang()`, `t(key)`, strings in `lib/lang.ts`.
- **Nav parity:** cleaner (`NavLinks.tsx`) and customer (`CustomerNav.tsx`) share a Settings-gear dropdown holding language + sign-out. Change both together.

---

## 7. Server Actions contract

All mutations are `"use server"` functions in a route group's `actions.ts`. They:
1. Call `supabase.auth.getUser()` — never trust client-passed IDs.
2. Return `{ error: string }` on failure or `{ success: true }` on success.
3. `revalidatePath(...)` after writing so Server Components re-fetch.
4. Swallow email-send failures (Resend) so they never block the primary write.

---

## 8. Tests

Co-located `*.test.ts(x)` under Jest + Testing Library (jsdom). `jest.setup.ts`
polyfills RSC/form APIs (`cache`, `useFormState`, `useFormStatus`) and mocks
`next/navigation`. **Heads-up:** many existing suites predate the current
implementation (they target removed mock stores / old markup) and currently
fail — refresh the relevant colocated test when you touch a component rather
than trusting the whole suite to be green.
```
