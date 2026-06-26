# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (polling flags are set for WSL file-watching)
npm run build      # Production build (also type-checks and lints)
npm run lint       # ESLint via next lint
npm test           # Jest unit/component tests (jsdom)
npm run test:watch # Jest in watch mode
npm run regeocode  # Re-geocode cleaners that have an address (supports --dry-run)
```

**Do not run `npm run build` while `npm run dev` is running** — both write to `.next/`, and the production build will clobber the dev server's compiled assets (the page then renders unstyled). Stop dev first, or build in a separate checkout.

### Tests

Colocated `*.test.tsx` / `*.test.ts` run under Jest + Testing Library (jsdom). `jest.setup.ts` polyfills React Server Component / form APIs that the jsdom runtime lacks (`cache`, `useFormState`, `useFormStatus`) and provides a default `next/navigation` mock.

Many existing suites predate the current implementation (they target removed mock-data stores, older routes, and pre-refactor markup) and currently fail — they need updating to the current components. Add/refresh a colocated test when you change a component's behavior.

## Architecture

**Clean** is a cleaning-services marketplace: customers browse and book verified cleaners; cleaners manage availability and respond to requests; admins approve cleaner applications.

Stack: Next.js 14 App Router · TypeScript · Supabase (Postgres + Auth + Storage + Realtime) · Tailwind CSS · Resend (email).

### Route groups

```
app/
├── (auth)/       # /login  /register  /register/cleaner  /register/customer
├── (cleaner)/    # /cleaner/dashboard  /profile  /availability  /requests  /preview  /pending  /customers/[id]
├── (customer)/   # /browse  /cleaners/[id]  /bookings  /profile  /home
├── admin/        # /admin/applications  /cleaners  /customers  /bookings  /availability
└── api/auth/signout/
```

Each route group has a co-located layout that renders its own nav: `(cleaner)/layout.tsx` → `NavLinks.tsx`, `(customer)/layout.tsx` → `CustomerNav.tsx`, `admin/Nav.tsx`. All three navs share the same responsive shape — icon-over-label on mobile, icon-beside-label on `lg` — and put the language toggle and sign-out inside a **Settings gear dropdown** (the cleaner nav's dropdown also shows the cleaner's name + status badge). The admin nav renders inline per-page (each `admin/*/page.tsx` renders `<Nav />`) and is `sticky` rather than `fixed`, so the pages need no top padding. Keep the three navs visually in sync when changing one.

**Page padding lives on each route group's layout `<main>`:** customer = `px-3 … sm:px-8`, cleaner = `p-8 pt-16` (no responsive reduction). A few pages trim their own mobile padding by pulling a **negative horizontal margin** on the page root that resets at `sm:` — e.g. `-mx-4 sm:mx-auto` on `/cleaner/requests` and `-mx-4 sm:mx-0` on `/cleaner/customers/[id]` (halving the cleaner layout's 2rem side padding on mobile), and `-mx-1.5 sm:mx-auto` on `/home`. **Don't** drop the cleaner layout's `p-8` globally: `(customer)/cleaners/[id]/CleanerProfile.tsx` (reused by the cleaner preview) breaks out with `-mx-8`, which assumes exactly that padding.

- **Admin "Availability" nav button is temporarily hidden.** The `/admin/availability` page still exists and is reachable by URL, but its entry in `admin/Nav.tsx`'s `NAV_ITEMS` is commented out because we're not yet sure admins need it. Uncomment that entry to restore the button (the `adminNav.availability` translations are already in place).

After login, `signIn` redirects by role via `ROLE_HOME` in `lib/roleHome.ts` (customer → `/browse`, cleaner → `/cleaner/dashboard`, admin → `/admin/applications`).

### Availability & booking

- Cleaners set availability **per specific date** in `cleaner_availability` (the calendar at `/cleaner/availability`, 15-minute granularity). The older recurring `cleaner_weekly_availability` table still exists and is honored as a fallback, but its dedicated weekly-schedule UI has been removed.
- Customer browse (`/browse`) and booking validation (`createBooking`) match against the **union** of per-date and weekly slots. Browse filters by selected dates + start time + duration (a slot must fully contain the requested window). The duration select also has a **"Not sure"** option (`value="any"`, `filterBar.durationNotSure`): it leaves the requested window open-ended (`reqEnd` stays `null` in `page.tsx`), so a slot only has to be **open at the chosen start time** rather than span a fixed length — and with no start time set, it applies no time filter at all. (The per-card availability badges still show each cleaner's full slots for the day, so the customer can gauge slot length before booking.)
- **Browse uses the customer's *profile* address as the search location — there is no location field on `/browse`.** `page.tsx` reads the signed-in customer's saved `customers.address` + geocoded `customers.lat`/`lng` (set on `/profile` save) and uses those coords for the distance filter (geocoding the address only as a fallback when coords are missing). `hasLocation` means "the customer has a saved address"; `locationError` means that saved address couldn't be resolved. When the customer has **no** saved address, `BrowseResults` shows a prompt with a **link to `/profile`** instead of results (same for an unresolvable address). The saved address is also passed through as the `location` preset for `CleanerCard` → booking forms.
- **The `/browse` UI has one Search button, in `CalendarPicker`, that commits the whole query.** On desktop (`lg`) `page.tsx` lays out the **compact calendar** (`lg:w-96`) and the **filters** (`BrowseFilters`, flex-1) side by side; on mobile they stack (calendar first). Tapping calendar days only updates local selection — nothing reloads until **Search**. `CalendarPicker.runSearch()` is the single commit path: it finds `BrowseFilters`' `<form id="browse-search-form">`, runs `form.reportValidity()`, reads the filter fields (start/duration/type/sort) via `FormData`, adds the selected `dates`, and `router.push`es `/browse?…`. `BrowseFilters` has **no submit button of its own** (only a Clear link) and is **collapsed by default** (the remaining filters are optional refinements). When the filter is collapsed, `runSearch` falls back to preserving the committed URL params. The form is still a native `<form method="get" action="/browse">`, so pressing Enter in a field also searches (using committed dates rather than the live calendar selection). (`FilterBar.tsx` is older dead code, kept only by its test.)
- **The calendar day colors are a real per-date "heat map" of in-range coverage, not a static weekday guess.** Whenever the customer has a saved location (`hasLocation`, even before any date is picked), `page.tsx` computes the **in-range cleaner set** (the same service-type + radius/distance filter used for results) and then, for each day in a forward window (`HEAT_DAYS = 120`), counts how many of those cleaners have **any** availability that day — weekly (by weekday) **or** specific-date — and buckets it by share of the in-range pool (`0` → `low`, `≥0.66` → `high`, else `medium`). The result is passed to `CalendarPicker` as the `dateHeat` prop (`{ 'YYYY-MM-DD': 'high'|'medium'|'low' }`). The heat is **deliberately coarse**: it ignores the start-time/duration window and counts a cleaner once if they're around at all that day. `CalendarPicker` falls back to the old static weekday `AVAILABILITY` guess only for dates with no entry — i.e. outside the window or when no location is saved. When the location resolves but **no** cleaner covers it, every window day reads `low`. To keep the range query small, the specific-date rows are fetched **after** the distance filter, scoped to the in-range cleaner ids and the window (so the in-range computation now also runs when only a location — not yet a date — is set; the day-group/results build still runs only `if (hasDates)`).
- **Each `CleanerCard` shows that cleaner's available time slots for the date its group is shown under**, as individual centered badges on the name's row. Availability is **per-date**: `page.tsx` computes the union of weekly + specific-date slots for each `(cleaner, date)`, de-dups and sorts them, and attaches them as `CleanerResult.availability` (an optional `{start,end}[]` set only when building a day's group — the shared base result doesn't carry it). The same cleaner can therefore appear under several date sections with different times. The slots shown are the cleaner's full availability for the day, not just the slice matching the start-time filter. The card does **not** show the cleaner's languages (profile-page only).
- **`CleanerCard` is written as two layout branches, not one reflowing tree.** Its two CTAs — "Schedule a clean" (opens the booking modal in place) and "View Profile" (links to `/cleaners/[id]`) — live in a shared `actionButtons` fragment used **only by the desktop (`lg`) branch**, where the price sits centered above them in a right column (`hidden lg:flex`). The **mobile branch (`lg:hidden`)** is written out separately: avatar + info on top, then a bottom row with the Schedule button on the left and a right column holding the price right-aligned directly above the View Profile button. So price + both buttons exist twice in the markup — edit both branches when changing button styling/labels.
- **"Schedule a clean" opens `ScheduleCleanModal` (`browse/ScheduleCleanModal.tsx`) in place** rather than navigating. It's a `createPortal`-to-`document.body` overlay (same pattern as `CleanDetailModal`) that reuses the cleaner profile's `BookingRequestForm`, fed the card's per-date `availability` (mapped into the form's `dateAvailability` shape) plus the matched `date` and searched `location` as presets. `BookingRequestForm` has three optional props for embeddings like this — `defaultOpen` (start expanded), `onCancel` (Cancel delegates to the host so it closes the modal), and `disabled` (non-interactive: the collapsed "Request booking" button can't expand the form, used by the cleaner preview); the customer profile-page usage passes none, so its behavior is unchanged. The collapsed state shows **only** the "Request booking" button (the `₪rate/hr` that used to sit beside it was removed — the rate still shows in the profile's stats card).

- **The cleaner's own profile preview (`/cleaner/preview`) is the customer-facing profile, one-to-one.** `preview/page.tsx` reuses the *same* `(customer)/cleaners/[id]/CleanerProfile.tsx` component customers see (the root `LanguageProvider` covers both route groups, so `useLanguage()` works there and the preview follows the cleaner's language toggle). `CleanerProfile` takes two optional preview-only props — `banner` (replaces the customer's back-button row; preview passes its yellow edit bar) and `bookingDisabled` (→ `BookingRequestForm`'s `disabled`, the non-interactive booking button). The customer page passes neither, so it's unchanged. The old standalone preview layout was removed; the leftover `prev_*` keys in `lib/lang.ts` are now mostly unused since the preview renders the customer `cleanerProfile.*` strings.
- **The avatar and gallery zoom (tap-to-magnify) live in `CleanerProfile` itself, shared by the customer view and the preview.** `AvatarLightbox.tsx` (renders the avatar `<img>` + a full-size overlay) and `GalleryLightbox.tsx` (the gallery card + grid, each thumbnail opening a zoom overlay with prev/next; returns `null` when there are no photos) both sit in `(customer)/cleaners/[id]/`. They render identical markup to the old plain `<img>` versions plus the lightbox, so the layout is unchanged — only the click-to-zoom is added. Edit these (not per-page copies) to change zoom behavior.
- **`createBooking` blocks duplicate requests: at most one *live* pending request per customer per cleaner per date.** Before inserting it checks for an existing `pending` booking (same `customer_id` + `cleaner_id` + `scheduled_date`) whose `response_deadline` is still in the future, and rejects with an error if found. An expired pending request (deadline passed → effectively declined) does **not** block, so the customer can re-request that cleaner for the same date. This is an app-level guard only — there's no DB constraint — so two near-simultaneous submissions could both pass; a partial unique index would be the airtight fix. The scope is cleaner+date (not time), and deliberately doesn't stop the customer from fanning the same date out to *other* cleaners (which `respondToBooking`'s sibling-cancel relies on).
- On approval, `respondToBooking` carves the booked time out of that day's `cleaner_availability` (splitting/trimming/removing slots) and guards against double-booking (the slot must still be available and not overlap an already-accepted booking).
- On approval, `respondToBooking` also cancels **all** of that customer's other still-`pending` requests (sets them to `cancelled`) — customers fan the same job out to several cleaners (and possibly other days), so accepting one clears the rest. Those siblings belong to other cleaners, so the cleaner's RLS-scoped session can't update them: this cleanup uses `createAdminClient()` (service role) to bypass RLS. Other cleaners can't accept a cancelled request regardless (the `status !== "pending"` guard rejects it); their dashboard removes it in real time via `RealtimeBookings`, but `/cleaner/requests` has no realtime subscriber so it only clears on next navigation.
- Booking requests carry a 24h `response_deadline`. There are no scheduled jobs, so `lib/expireRequests.ts` lazily marks expired-but-still-pending requests as `declined` on cleaner page loads (run in the cleaner layout and the availability page).
- **Customers can cancel their own bookings** from `/bookings`: tapping a `BookingCard` opens `BookingDetailModal` (the customer-side mirror of `CleanDetailModal` — same portal pattern, but uses the customer i18n system), which has a Cancel button (two-step confirm) wired to the `cancelBooking` server action. Only `pending`/`accepted` bookings are cancellable; the action sets `status = 'cancelled'`. **When the cancelled booking was `accepted`, it restores the carved-out time to the cleaner's availability** via `restoreAvailability` (see below) — using `createAdminClient()`, since RLS only lets the cleaner write their own `cleaner_availability`. Pending cancellations restore nothing (they never reserved time). It still does **not** notify the cleaner by email — an open follow-up.
- **Cancelling an `accepted` booking reopens the cleaner's availability.** `lib/availability.ts` `restoreAvailability(client, cleanerId, date, freedStart, freedEnd)` is the inverse of `carveAvailability` (in `(cleaner)/actions.ts`): it adds the freed range back into `cleaner_availability` for that date and **merges** it with any overlapping or exactly-adjacent slots so the day stays consolidated (existing `10:00–12:00` + freed `08:00–10:00` → `08:00–12:00`). Called by both `cancelBooking` (customer, admin client) and `cancelClean` (cleaner, own session). Only ever called for `accepted` cancellations — pending requests never carved time out, so restoring them would create phantom availability. The sibling auto-cancel in `respondToBooking` only touches `pending` rows, so it deliberately doesn't restore.
- **`/bookings` groups into four sections purely by `status` (see `page.tsx`):** confirmed (`accepted`), pending (`pending`), **"Refused & cancelled"** (`declined` **or** `cancelled`, combined — declined/expired requests, siblings auto-cancelled when another cleaner got booked, and bookings the customer cancelled; capped at the 20 most recent combined), and past cleans (`completed` only). Note the customer-side display maps an expired-but-still-`pending` row to `declined` (mirroring what `lib/expireRequests.ts` will write on the next cleaner page load), so expired requests land in the combined section. There is no `cancelled_by` column (an earlier draft added one but it was dropped once the split became status-only). The `BookingCard` shows the cleaner's avatar (with an initials fallback) and status badge in the top-end corner (absolutely positioned so its height doesn't push the card body down), and renders the cleaner name as "First L." (first name + last initial). The same "First L." shortening is applied in `BookingDetailModal`'s header.
- The cleaner dashboard shows **Upcoming cleans** (accepted, start time in the future) and **Past cleans** (`completed`), with a "Complete" action (`completeBooking`). Each clean card is clickable and opens a shared `CleanDetailModal` (customer **avatar**, name, time range, duration, address, notes, tappable phone, and a **"View profile"** link to `/cleaner/customers/[id]`). The modal renders via a `createPortal` to `document.body` so the cards' hover `transform` can't become the containing block for its `fixed` overlay. Each `UpcomingCleanCard` also shows a **"Today" / "Tomorrow" / "In N days"** pill (countdown to the clean). The day count is computed **server-side** in `page.tsx` (`daysUntilClean`, whole calendar days from today) and passed in as the `daysUntil` prop — done on the server so the relative label can't hydrate-mismatch; the card maps the number to words via `useLang()` so it still switches language instantly.
- **The cleaner can cancel an accepted clean** from inside `CleanDetailModal` (two-step confirm), wired to the `cancelClean` server action — shown only when `booking.status === 'accepted'`. It sets `status = 'cancelled'` (so the customer sees it under their `/bookings` "Refused & cancelled" section), restores the carved-out time via `restoreAvailability`, and `router.refresh()`es the dashboard. It also sets `cleaner_ack_cancelled = true` so the cleaner's own cancel never appears in her "Updates" section (below). It still does **not** notify the customer by email — an open follow-up.
- **The cleaner dashboard shows an "Updates" section** (`UpdatesSection.tsx`) listing bookings cancelled by someone *other* than the cleaner — i.e. `status = 'cancelled' AND cleaner_ack_cancelled = false` (fetched with the admin client for the embedded customer profile). It's collapsible, and each row has an **"I have seen this"** button wired to the `acknowledgeCancellation` server action, which sets `cleaner_ack_cancelled = true` to drop it permanently. The `cleaner_ack_cancelled boolean` column comes from `supabase/migrations/0003_cleaner_ack_cancelled.sql` (`cancelClean` sets it true on the cleaner's own cancels; customer cancels and sibling auto-cancels leave it false so they surface). `RealtimeBookings` already refreshes the dashboard on any `bookings` UPDATE, so a customer cancellation appears in Updates live.
- **Displaying a booking's embedded customer profile (name/phone) on cleaner pages requires the service-role client.** The "users manage own profile" RLS policy hides other users' `profiles` rows, so a `bookings` query joining `profiles!customer_id(...)` returns a null profile under the cleaner's RLS session. Fetch such bookings with `createAdminClient()` instead — the explicit `cleaner_id = user.id` filter keeps results scoped. Used by `/cleaner/requests`, the dashboard (Upcoming/Past), and the availability calendar's day panel (which shows `booked <customer> / <time range · duration> / <address>` per accepted booking).
- **Cleaners can open a customer's profile at `/cleaner/customers/[id]`** (`(cleaner)/cleaner/customers/[id]/page.tsx`): the customer's avatar/name/phone plus their **booking history with this cleaner**, sorted by `scheduled_date` then `scheduled_start` **ascending (closest date first)**. Fetched with `createAdminClient()` (same RLS reason as above); authorization is enforced by **404ing unless this cleaner has at least one booking with that customer**. Reached from the **dashboard `CleanDetailModal`** and the **requests `RequestCard`** — via the card's customer name (a link) and an explicit **"View profile"** button in each detail modal (label `req_view_profile`). The dashboard `CleanDetailModal` and the requests `RequestCard` **card** show the customer avatar beside the name; the requests **detail modal** shows the name + buttons without an avatar. (The customer page's back link is **origin-aware** via a `?from=dashboard` query param: the dashboard `CleanDetailModal`'s "View profile" link adds `?from=dashboard` so the page's `BackLink.tsx` returns to `/cleaner/dashboard`; the requests links omit it and default back to `/cleaner/requests`. `BackLink` is a small client component so the label uses the cleaner i18n — `req_back_dashboard` / `req_back_requests`.)

### Supabase client hierarchy

Three distinct clients — use the right one per context:

| File | Use when |
|---|---|
| `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| `lib/supabase/client.ts` | Client Components (`"use client"`) |
| `lib/supabase/admin.ts` | Admin-only operations requiring service role (bypasses RLS) |

`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and must never be called from client-side code.

### Middleware & auth

`middleware.ts` (project root) runs at the edge on every non-static request. It:
1. Skips `supabase.auth.getUser()` entirely when no session cookie is present (avoids a network hang).
2. Redirects unauthenticated users to `/login`.
3. Redirects authenticated users away from `/login`/`/register` to `/{role}/dashboard`.
4. Enforces role — only `cleaner` role can access `/cleaner/*` routes.

Role is stored in the `profiles.role` column and read from Supabase (not the JWT) inside middleware.

### Registration & the signup trigger

Registration is a **two-step client-side flow** (not the legacy `signUp` server action in `app/(auth)/actions.ts`, which is dead code): `register/page.tsx` stashes `{email, password}` in `localStorage` (`pending_signup`), then `register/customer/page.tsx` / `register/cleaner/page.tsx` call `supabase.auth.signUp(...)` and write the role-specific rows. This requires a session to exist **immediately after `signUp`**, which only holds when **email confirmation is disabled** in Supabase — the profile/customer/cleaner writes are RLS-scoped to `auth.uid()`. (See the empty `app/(auth)/auth/confirm/` dir — a leftover from an older confirm-email flow.)

- **A DB trigger creates the role rows too — the client cooperates with it, it doesn't own creation.** `on_auth_user_created` (AFTER INSERT on `auth.users`) runs `handle_new_user()`, which reads `raw_user_meta_data` and inserts the **skeleton** rows: always `profiles`, then `customers` (role `customer`) or `cleaners` + `cleaner_applications` (role `cleaner`). It defaults to `customer` when no role metadata is passed, and every insert is idempotent (`on conflict (id) do nothing` / `not exists`). This trigger lives in `supabase/migrations/0004_handle_new_user.sql` (it predated migrations and was untracked until then — query the live DB with `select pg_get_functiondef('public.handle_new_user'::regproc);` to inspect it).
- **The client must therefore pass `options: { data: { role } }` to `signUp` and `upsert` (not `insert`) its detail rows.** Both register pages pass the role so the trigger branches correctly (without it, cleaner signups also got a stray `customers` row), and they `upsert` `profiles`/`customers`/`cleaners` so they *fill in* the trigger's skeleton rows instead of colliding on the PK (`customers_pkey` etc.). The cleaner page does **not** insert `cleaner_applications` — the trigger already creates it, and that table isn't keyed on `cleaner_id`, so a client insert would duplicate it.

### Server Actions pattern

All mutations are Next.js Server Actions (`"use server"`) in `actions.ts` files co-located with their route group. They always:
- Call `supabase.auth.getUser()` to get the authenticated user (never trust client-passed IDs).
- Return `{ error: string }` on failure or `{ success: true }` on success.
- Call `revalidatePath(...)` after mutations so Server Components re-fetch.

### Realtime

Realtime is implemented via headless `"use client"` components that subscribe to Supabase Postgres changes and call `router.refresh()` to re-render Server Components. See `RealtimeBookings.tsx` for the pattern.

### Geocoding & location

Cleaners enter a free-text `address` (persisted in `cleaners.address`) plus a `service_radius_km`. On profile save (`(cleaner)/actions.ts`) the address is geocoded via OpenStreetMap Nominatim and stored as a PostGIS `POINT(lng lat)` in `cleaners.location`.

- **Shared geocoder** `lib/geocode.ts` is used by both cleaner save and customer browse. It biases results to Israel/Hebrew (`countrycodes=il&accept-language=he`, overridable via `GEOCODE_COUNTRY_CODES` / `GEOCODE_LANGUAGE` env vars) — without this, ambiguous place names resolved to the wrong country.
- **Distance filtering happens in-app, not in SQL.** Browse fetches each cleaner's `location` + `service_radius_km`, parses the PostGIS point with `lib/geo.ts` `parsePoint()` (handles EWKB hex / WKT / GeoJSON), and keeps a cleaner only when `distanceKm(customer, cleaner) <= service_radius_km` (haversine). The customer's coords come from their saved profile address (`customers.lat`/`lng`, see the browse bullet above); results are then grouped by date.
- **Re-geocoding existing rows:** `npm run regeocode` (`scripts/regeocode-cleaners.mjs`) backfills/refreshes `location` for cleaners that have an `address`, with rate-limiting and a `--dry-run` flag.

### Email notifications

`lib/resend.ts` exports typed functions for each notification event (booking accepted/declined, application approved/rejected, new booking request). These are called from Server Actions. Email failure is caught and swallowed — it must not block the primary mutation.

### Types

All shared DB types live in `types/database.ts`. The key enums are `UserRole`, `BookingStatus`, `CleanerStatus`, `ApplicationStatus`, and `ServiceType`. Per-feature view models live under `lib/types/` (`booking.ts`, `cleaner.ts`, etc.).

- **`cleaners.status` valid values are only `pending | approved | rejected | suspended`** (the `cleaner_status` enum). `/browse` only shows cleaners with `status = 'approved'`, so any other value silently hides the cleaner from customers. If approved cleaners stop appearing in browse, check their status values first — that exact symptom traces back to bad status values, not a browse bug.
- **The `cleaner_status` enum was once polluted with stray values (resolved 2026-06-25).** An out-of-band DB change had `ALTER TYPE ... ADD VALUE`'d `active`/`new` onto the enum, and cleaner rows were relabeled to them — so genuinely-approved cleaners no longer matched the `'approved'` filter and vanished from browse. Fixed by: (1) normalizing the data (`active`→`approved`, `new`→`pending`), then (2) `supabase/migrations/0002_retighten_cleaner_status.sql`, which recreates the enum with only the four canonical values (Postgres can't drop enum values in place, so the type is renamed-aside/recreated/swapped inside a transaction). Writing an invalid status now errors at the DB. To audit the enum: `select enumlabel from pg_enum where enumtypid = 'cleaner_status'::regtype;`
- **Bulk status updates via PostgREST that filter on `status` and chain `.select()` hang against this DB** (e.g. `.update({status}).eq('status', x).select()`). Update per row by `id` instead when scripting status changes.
- **Guard direct DB access.** The enum pollution above came from a manual/out-of-band write (Supabase SQL Editor, dashboard table edit, or an external script) — it left no trace in git or app code, so it can't be diagnosed from the repo. The app itself only ever writes the four canonical statuses (`handle_new_user` inserts `pending`; admin approval writes `approved`). Treat any non-canonical status, or any schema/enum change not represented by a file in `supabase/migrations/`, as an out-of-band change to investigate. Make schema changes via tracked migrations, not ad-hoc SQL Editor edits, and limit who holds service-role / direct-Postgres credentials.

### Internationalization (two separate systems)

The app has **two independent i18n setups** — don't mix them:

| Side | Import | Hook | Usage | Strings |
|---|---|---|---|---|
| Customer + auth + admin | `@/lib/i18n/LanguageContext` | `useLanguage()` | `t('namespace.key')`, `toggleLanguage()`, `messages.*` | `lib/i18n/translations.ts` |
| Cleaner | `@/context/LangContext` | `useLang()` | `t(translationKey)`, `setLang('en'\|'he')` | `lib/lang.ts` |

Both drive RTL the same way: `document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'`. With `dir` set, Tailwind logical utilities (`text-start`, `end-0`, `justify-start`) flip automatically — prefer them over `left`/`right` so layouts work in both directions.

### Environment variables

Required in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY`
