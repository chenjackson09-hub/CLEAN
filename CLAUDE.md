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
├── (cleaner)/    # /cleaner/dashboard  /profile  /availability  /requests  /preview  /customers/[id]
├── (customer)/   # /browse  /cleaners/[id]  /bookings  /profile  /home
├── admin/        # /admin/applications  /cleaners  /customers  /bookings  /availability
└── api/auth/signout/
```

After login, `signIn` redirects by role via `ROLE_HOME` in `lib/roleHome.ts` (customer → `/browse`, cleaner → `/cleaner/dashboard`, admin → `/admin/applications`).

### Availability & booking

- Cleaners set availability **per specific date** in `cleaner_availability` (the calendar at `/cleaner/availability`, 15-minute granularity). The older recurring `cleaner_weekly_availability` table still exists and is honored as a fallback, but its dedicated weekly-schedule UI has been removed.
- Customer browse (`/browse`) and booking validation (`createBooking`) match against the **union** of per-date and weekly slots. Browse filters by selected dates + start time + duration (a slot must fully contain the requested window).
- On approval, `respondToBooking` carves the booked time out of that day's `cleaner_availability` (splitting/trimming/removing slots) and guards against double-booking (the slot must still be available and not overlap an already-accepted booking).
- On approval, `respondToBooking` also cancels **all** of that customer's other still-`pending` requests (sets them to `cancelled`) — customers fan the same job out to several cleaners (and possibly other days), so accepting one clears the rest. Those siblings belong to other cleaners, so the cleaner's RLS-scoped session can't update them: this cleanup uses `createAdminClient()` (service role) to bypass RLS. Other cleaners can't accept a cancelled request regardless (the `status !== "pending"` guard rejects it); their dashboard removes it in real time via `RealtimeBookings`, but `/cleaner/requests` has no realtime subscriber so it only clears on next navigation.
- Booking requests carry a 24h `response_deadline`. There are no scheduled jobs, so `lib/expireRequests.ts` lazily marks expired-but-still-pending requests as `declined` on cleaner page loads (run in the cleaner layout and the availability page).
- The cleaner dashboard shows **Upcoming cleans** (accepted, start time in the future) and **Past cleans** (`completed`), with a "Complete" action (`completeBooking`). Each clean card is clickable and opens a shared `CleanDetailModal` (customer name, time range, duration, address, notes, tappable phone). The modal renders via a `createPortal` to `document.body` so the cards' hover `transform` can't become the containing block for its `fixed` overlay.
- **Displaying a booking's embedded customer profile (name/phone) on cleaner pages requires the service-role client.** The "users manage own profile" RLS policy hides other users' `profiles` rows, so a `bookings` query joining `profiles!customer_id(...)` returns a null profile under the cleaner's RLS session. Fetch such bookings with `createAdminClient()` instead — the explicit `cleaner_id = user.id` filter keeps results scoped. Used by `/cleaner/requests`, the dashboard (Upcoming/Past), and the availability calendar's day panel (which shows `booked <customer> / <time range · duration> / <address>` per accepted booking).

### Supabase client hierarchy

Three distinct clients — use the right one per context:

| File | Use when |
|---|---|
| `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| `src/lib/supabase/client.ts` | Client Components (`"use client"`) |
| `src/lib/supabase/admin.ts` | Admin-only operations requiring service role (bypasses RLS) |

`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and must never be called from client-side code.

### Middleware & auth

`src/middleware.ts` runs at the edge on every non-static request. It:
1. Skips `supabase.auth.getUser()` entirely when no session cookie is present (avoids a network hang).
2. Redirects unauthenticated users to `/login`.
3. Redirects authenticated users away from `/login`/`/register` to `/{role}/dashboard`.
4. Enforces role — only `cleaner` role can access `/cleaner/*` routes.

Role is stored in the `profiles.role` column and read from Supabase (not the JWT) inside middleware.

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
- **Distance filtering happens in-app, not in SQL.** Browse fetches each cleaner's `location` + `service_radius_km`, parses the PostGIS point with `lib/geo.ts` `parsePoint()` (handles EWKB hex / WKT / GeoJSON), and keeps a cleaner only when `distanceKm(customer, cleaner) <= service_radius_km` (haversine). Customer location is **required** for search; results are then grouped by date.
- **Re-geocoding existing rows:** `npm run regeocode` (`scripts/regeocode-cleaners.mjs`) backfills/refreshes `location` for cleaners that have an `address`, with rate-limiting and a `--dry-run` flag.

### Email notifications

`src/lib/resend.ts` exports typed functions for each notification event (booking accepted/declined, application approved/rejected, new booking request). These are called from Server Actions. Email failure is caught and swallowed — it must not block the primary mutation.

### Types

All shared DB types live in `src/types/database.ts`. The key enums are `UserRole`, `BookingStatus`, `CleanerStatus`, `ApplicationStatus`, and `ServiceType`.

### Environment variables

Required in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY`
