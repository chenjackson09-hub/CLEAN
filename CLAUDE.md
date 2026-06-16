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

### Directory layout & the `@/*` alias

All application code lives at the **repo root** (there is no `src/` directory):

```
app/         # Next.js App Router routes
lib/         # Shared modules (supabase, i18n, lang, actions, geocode, roleHome, types, mock stores)
context/     # LangContext adapter
types/       # Shared DB types (database.ts)
middleware.ts
```

The path alias is root-only and matches the Jest config, so imports resolve identically in the app
and in tests:

```jsonc
// tsconfig.json
"paths": { "@/*": ["./*"] }
```

> Historical note: code used to be split between `src/` and root, with `@/*` resolving `src/` first —
> which silently shadowed root copies of the Supabase clients and `types/database.ts`. That split has
> been consolidated onto root and the duplicate `src/` tree removed. If you reintroduce a `src/`
> directory, do **not** re-add it to `paths` without updating `jest.config.ts` to match.

### Performance / WSL note

Dev-server slowness in this setup is dominated by the project living on the Windows filesystem
(`/mnt/c/...`) accessed from WSL — Node file-watching and IO are very slow across that boundary, which
is why `next dev` uses aggressive polling (`CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING`, plus
`webpack.watchOptions.poll` in `next.config.js`). For a major speedup, clone/move the repo into the
**WSL-native filesystem** (e.g. `~/clean`) and run it from there. This is an environment change, not a
code change.

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

### Supabase client hierarchy

Three distinct clients — use the right one per context:

| Module | Use when |
|---|---|
| `@/lib/supabase/server` | Server Components, Server Actions, Route Handlers |
| `@/lib/supabase/client` | Client Components (`"use client"`) |
| `@/lib/supabase/admin`  | Admin-only operations requiring service role (bypasses RLS) |

`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and must never be called from client-side code.
The server client is wrapped in React `cache()` so layout + page share one client / one `getUser()`
call per request (`lib/supabase/server.ts` exports `createClient`, `getCurrentUser`, and
`getCleanerStatus`).

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

The app is bilingual English / Hebrew with RTL support, implemented as a **bridge between two
rendering models** (not three rival systems — match whichever the file you're editing already uses):
- **Client pages (customer + admin)** use `@/lib/i18n/LanguageContext` — a `LanguageProvider` (wraps
  the whole tree in `app/layout.tsx`) with nested-key lookups (`t('nav.home')`) from
  `@/lib/i18n/translations.ts`. Locale persists in `localStorage`.
- **Server-rendered cleaner pages** use `@/lib/lang` — a flat-key table (`t(lang, 'nav_home')`) keyed
  off a `lang` **cookie** so the language survives SSR.
- `@/context/LangContext` (`useLang`) is the **adapter** that bridges the two: it reads the client
  provider's locale, exposes the flat `t`, and writes the `lang` cookie so the server pages stay in
  sync. `LangProvider` there is a no-op kept for back-compat.

Fully merging the two translation tables (flat vs nested keys, ~850 lines combined) is a larger
follow-up; the bridge above is the current intended design.

### Mock data (transitional)

`lib/mockData/` and the `lib/mock*Store.ts` modules predate the Supabase wiring. Most pages now read
from Supabase, but a few still import mock data (e.g. `app/admin/bookings/page.tsx`,
`app/(auth)/register/cleaner/page.tsx`). Prefer real Supabase queries for new work; treat remaining
mock usage as not-yet-migrated.

### Geocoding & location

Cleaner base location is geocoded via OpenStreetMap Nominatim (`@/lib/geocode`) on profile save
(`app/(cleaner)/actions.ts`). The result is stored as a PostGIS `POINT(lng lat)` string in
`cleaners.location`. Browse / search (`@/lib/cleanerSearch`) filters by distance.

### Email notifications

`@/lib/resend` exports typed functions for each notification event (booking
accepted/declined, application approved/rejected, new booking request). These are called from Server
Actions. Email failure is caught and swallowed — it must not block the primary mutation.

### Types

Shared DB types live in `@/types/database`. Key enums: `UserRole`, `BookingStatus`, `CleanerStatus`,
`ApplicationStatus`, `ServiceType`. Domain-specific view types live under `lib/types/`
(`application.ts`, `booking.ts`, `cleaner.ts`, `customer.ts`, `profile.ts`).

### Testing

Jest + Testing Library (`jsdom`), config in `jest.config.ts`, setup in `jest.setup.ts`. Tests are
co-located as `*.test.ts(x)` next to the code they cover. Run with `npm test`.

Some suites currently fail for **pre-existing reasons unrelated to app behavior**: several render
async Server Components directly in jsdom (React throws "Objects are not valid as a React child
(found: Promise)"), and a few (e.g. `ProfileForm.test.tsx`) assert against an older component API
(`onSave`) that has since moved to Server Actions. These need rewrites, not product fixes. The
production build (`npm run build`) passes cleanly.

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
