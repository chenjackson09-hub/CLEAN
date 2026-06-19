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
- The cleaner dashboard shows **Upcoming cleans** (accepted, start time in the future) and **Past cleans** (`completed`), with a "Complete" action (`completeBooking`).

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

### Signup & email confirmation

Registration requires a **real email confirmation** (Supabase Auth "Confirm email" is enabled), so signup is a two-step, mostly client-side flow:

1. `/register` collects role + email/password and stashes them in `localStorage` (`pending_signup`) — **no account is created yet**, so pressing "Go back" never leaves a half-created account behind.
2. `/register/{customer,cleaner}` collects the profile fields and calls `supabase.auth.signUp(...)` **client-side** with all fields in `options.data` (metadata) and `emailRedirectTo: ${window.location.origin}/auth/confirm`, then shows a "check your email" screen.
3. Because the user has **no session before confirming**, the client can't insert profile rows under RLS. Instead the `handle_new_user` trigger (migration `0002`, `SECURITY DEFINER`) reads the signup metadata and creates the `profiles` + `customers`/`cleaners`/`cleaner_applications` rows server-side at signup time.
4. The confirmation email links to `/auth/confirm`, which runs `verifyOtp` (token_hash) or `exchangeCodeForSession` (PKCE fallback), establishing the session, then redirects to the role's home. A bad/expired link redirects to `/login?error=could_not_confirm`, which the login page surfaces via the `auth.login.confirmError` i18n string.

There is intentionally **no `signUp` server action** — account creation lives in the onboarding pages. `app/(auth)/actions.ts` only holds `signIn` / `signOut`.

**Trigger gotcha:** `handle_new_user` inserts metadata (`text`) into enum columns, which requires explicit casts (`v_role::user_role`, `...::service_type`). A missing cast makes the trigger throw and Supabase returns the opaque **"Database error saving new user"** on signup.

**Required Supabase dashboard config** (hosted project — there is no `config.toml`, so these are not in the repo):
- Apply migration `0002_handle_new_user.sql` (SQL Editor).
- Authentication: enable **Confirm email**.
- Authentication → URL Configuration: **Site URL** = the live origin (`https://clean-kappa-silk.vercel.app`); add `<origin>/auth/confirm` to **Redirect URLs**.
- Authentication → Email Templates → **Confirm signup**: link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.

#### Email auth — where we left off (branch `real-email`, 2026-06-19)

Done:
- ✅ Code: two-step signup, `/auth/confirm` route, middleware allowance, "check your email" screens, i18n (en+he), login `confirmError` handling.
- ✅ Removed the dead `signUp` server action; `tsc` clean, auth tests pass (7/7).
- ✅ Migration `0002` applied to the hosted DB, **including the enum-cast fix** (`v_role::user_role`, `preferred_service_type::service_type`) — this fixed "Database error saving new user".
- ✅ Supabase dashboard: Confirm email enabled, Site URL + `/auth/confirm` redirect allowlist, Confirm-signup template set.

Remaining:
- ⏳ **Blocked on the built-in email rate limit** — last signup returned "Error sending confirmation email". Waiting ~1h for the cap to reset, then: delete the orphaned unconfirmed user (Authentication → Users), sign up once with a real inbox, click the link, confirm it lands logged-in on the role home.
- 🔜 **Production email:** buy + verify a domain in Resend (~$10–15/yr, only hard cost), set Supabase Custom SMTP (`smtp.resend.com`:465, user `resend`, pw = `RESEND_API_KEY`), and update `resend.ts` `FROM` from `noreply@resend.dev` to `noreply@<verified-domain>`.
- 🔜 **Commit** the branch changes (trigger fix, login handling, dead-action removal, i18n, this doc), then **merge `real-email` → main** — only after the live signup test passes. Not committed/merged yet.
- 🧹 Throwaway helper `CLEAN/fix-handle-new-user.sql.txt` can be deleted (the real fix is in migration `0002`).

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

**Two separate email senders — don't conflate them:**
- **Auth/confirmation emails** are sent by **Supabase Auth**, not by `resend.ts`. By default Supabase uses its built-in service, which is **rate-limited (~2–4/hour, testing only)** and surfaces **"Error sending confirmation email"** when the cap is hit. For production, configure Custom SMTP in Supabase (Authentication → SMTP) pointing at Resend (`smtp.resend.com`, port 465, user `resend`, password = `RESEND_API_KEY`).
- **App notification emails** are sent directly by `resend.ts`.

**Both require a verified Resend domain to reach real users.** Resend only delivers to arbitrary recipients from a verified domain; otherwise it can only email the Resend account owner. `resend.ts` currently uses `from: "Clean <noreply@resend.dev>"` as a placeholder — switch this to `noreply@<verified-domain>` once a domain is verified, or notification emails silently fail.

**Current status (as of 2026-06-19):** no domain verified yet; running on Supabase's built-in email for testing. Going live needs: buy a domain (~$10–15/yr, the only hard cost — Resend/Supabase/Vercel free tiers suffice to launch), verify it in Resend, set Supabase Custom SMTP, and update the `resend.ts` `FROM`.

### Types

All shared DB types live in `src/types/database.ts`. The key enums are `UserRole`, `BookingStatus`, `CleanerStatus`, `ApplicationStatus`, and `ServiceType`.

### Environment variables

Required in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

`NEXT_PUBLIC_SITE_URL` is present in `.env`/`.env.example` but **not read anywhere in the code** — signup builds its redirect from `window.location.origin`, and the auth-email base comes from the Supabase **Site URL** dashboard setting. It does not need to be set in Vercel.
