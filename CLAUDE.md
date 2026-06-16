# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (polling flags are set for WSL file-watching)
npm run build      # Production build
npm run lint       # ESLint via next lint
npm test           # Run the Jest test suite
npm run test:watch # Jest in watch mode
```

## Architecture

**Clean** is a cleaning-services marketplace: customers browse and book verified cleaners; cleaners manage availability and respond to requests; admins approve cleaner applications and oversee people/bookings.

Stack: Next.js 14 App Router · TypeScript · Supabase (Postgres + Auth + Storage + Realtime) · Tailwind CSS · Resend (email) · Jest + Testing Library.

### Directory layout & the `@/*` alias gotcha (read this first)

Application code lives at the **repo root**, not under `src/`:

```
app/         # Next.js App Router routes
lib/         # Shared modules (supabase, i18n, actions, geocode, types, mock stores)
types/       # Shared DB types (database.ts)
middleware.ts
```

There is **also** a `src/` directory that holds an older partial copy of some modules
(`src/lib/supabase/*`, `src/types/database.ts`, `src/lib/resend.ts`, `src/lib/lang.ts`,
`src/context/LangContext.tsx`).

The path alias resolves `src` **before** root:

```jsonc
// tsconfig.json
"paths": { "@/*": ["./src/*", "./*"] }
```

Consequences — keep these in mind to avoid silent no-op edits:
- `@/lib/supabase/server`, `@/lib/supabase/client`, `@/lib/supabase/admin`, and `@/types/database`
  exist in **both** `src/` and root. The **`src/` copy wins** — editing the root copy has no effect.
- Modules that exist only at root (`@/lib/geocode`, `@/lib/roleHome`, `@/lib/i18n/*`,
  `@/lib/cleanerSearch`, `@/lib/actions/*`, `@/lib/mock*`) resolve from root as expected.
- Jest is configured separately (`moduleNameMapper: '^@/(.*)$' → '<rootDir>/$1'`), so under test
  `@/...` resolves from **root only**. Imports can therefore behave differently in tests vs the app.

When editing one of the duplicated files, change the `src/` copy (or consolidate). Treat the
`src/` ↔ root split and the empty `_customer_app/` folder as in-progress cleanup, not intentional design.

### Route groups

All three role areas are implemented:

```
app/
├── (auth)/       # /login  /register  /register/cleaner  /register/customer
├── (cleaner)/    # /cleaner/dashboard  /cleaner/profile  /cleaner/availability
│                 # /cleaner/requests  /cleaner/pending  /cleaner/preview  /cleaner/customers/[id]
├── (customer)/   # /home  /browse  /cleaners/[id]  /bookings  /profile
├── admin/        # /admin/applications  /admin/bookings  /admin/cleaners  /admin/customers
└── api/auth/signout/
```

Note: `app/(cleaner)/dashboard/` (a `/dashboard` route) is an older mock-data implementation that
coexists with the live `/cleaner/dashboard`. The cleaner nav links to `/cleaner/dashboard`.

### Supabase client hierarchy

Three distinct clients — use the right one per context (active copies are in `src/lib/supabase/`,
which the alias resolves first; see the alias gotcha above):

| Module | Use when |
|---|---|
| `@/lib/supabase/server` | Server Components, Server Actions, Route Handlers |
| `@/lib/supabase/client` | Client Components (`"use client"`) |
| `@/lib/supabase/admin`  | Admin-only operations requiring service role (bypasses RLS) |

`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and must never be called from client-side code.
The server client is wrapped in React `cache()` so layout + page share one client / one `getUser()`
call per request (see `getUser` / `getCleanerStatus` exports).

### Middleware & auth

`middleware.ts` (repo root) runs at the edge on every non-static request. It:
1. Skips `supabase.auth.getUser()` entirely when no `-auth-token` session cookie is present (avoids a network hang).
2. Redirects unauthenticated users to `/login`.
3. Redirects authenticated users away from `/login`/`/register` to their role home.
4. Enforces role — only `cleaner` role can access `/cleaner/*` routes.

Role is stored in `profiles.role` and read from Supabase, then cached in a short-lived (1h) httpOnly
`x-user-role` cookie to skip the DB query on repeated navigations. Role-based landing pages are mapped
in `@/lib/roleHome` (`ROLE_HOME`): customer → `/browse`, cleaner → `/cleaner/dashboard`,
admin → `/admin/applications`.

### Server Actions pattern

Mutations are Next.js Server Actions (`"use server"`) in `actions.ts` files co-located with their
route group (`app/(auth)/actions.ts`, `app/(cleaner)/actions.ts`, `app/(customer)/actions.ts`,
`app/admin/actions.ts`). They generally:
- Call `supabase.auth.getUser()` to get the authenticated user (never trust client-passed IDs).
- Return `{ error: string }` on failure or `{ success: true }` on success.
- Call `revalidatePath(...)` after mutations so Server Components re-fetch.

### Realtime

Realtime is implemented via headless `"use client"` components that subscribe to Supabase Postgres
changes and call `router.refresh()` to re-render Server Components. See
`app/(cleaner)/cleaner/dashboard/RealtimeBookings.tsx` for the pattern.

### Internationalization (bilingual EN / HE)

The app is bilingual English / Hebrew with RTL support. Translation infrastructure is currently
**fragmented across multiple modules** — when adding strings, match the system already used by the
file you're editing rather than introducing a new one:
- `@/lib/i18n/` — `LanguageContext`, `LanguageToggle`, `translations.ts` (most widely used).
- `@/lib/lang` (`src/lib/lang.ts`) — `translations` object + `Lang` type (`"en" | "he"`).
- `@/context/LangContext` (`src/context/LangContext.tsx`).

### Mock data (transitional)

`lib/mockData/` and the `lib/mock*Store.ts` modules predate the Supabase wiring. Most admin pages now
read from Supabase, but a few pages still import mock data (e.g. `app/(cleaner)/dashboard/page.tsx`,
`app/admin/bookings/page.tsx`, `app/(auth)/register/cleaner/page.tsx`). Prefer real Supabase queries for
new work; treat remaining mock usage as not-yet-migrated.

### Geocoding & location

Cleaner base location is geocoded via OpenStreetMap Nominatim (`@/lib/geocode`) on profile save
(`app/(cleaner)/actions.ts`). The result is stored as a PostGIS `POINT(lng lat)` string in
`cleaners.location`. Browse / search (`@/lib/cleanerSearch`) filters by distance.

### Email notifications

`@/lib/resend` (`src/lib/resend.ts`) exports typed functions for each notification event (booking
accepted/declined, application approved/rejected, new booking request). These are called from Server
Actions. Email failure is caught and swallowed — it must not block the primary mutation.

### Types

Shared DB types live in `@/types/database` (the `src/types/database.ts` copy is the one the alias
resolves). Key enums: `UserRole`, `BookingStatus`, `CleanerStatus`, `ApplicationStatus`, `ServiceType`.
Domain-specific view types live under `lib/types/` (`application.ts`, `booking.ts`, `cleaner.ts`,
`customer.ts`, `profile.ts`).

### Testing

Jest + Testing Library (`jsdom`), config in `jest.config.ts`, setup in `jest.setup.ts`. Tests are
co-located as `*.test.ts(x)` next to the code they cover. Note the alias difference from the app:
Jest resolves `@/...` from root only (see the alias gotcha).

### Planning docs

`docs/superpowers/` holds dated implementation plans (`plans/`) and design specs (`specs/`) for major
features (browse page, cleaner booking workflow, admin people management). `spec.md` is the original
product spec.

### Environment variables

Required in `.env` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY`
