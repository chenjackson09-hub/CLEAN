# Admin People Management — Design Spec

**Branch:** `feature/admin`
**Date:** 2026-06-15

## Context

The admin already has:
- `/admin/applications` — review/approve/reject new cleaner sign-ups
- `/admin/bookings` — read-only overview of booking statuses (cleaners accept/decline their own requests via `/dashboard`)

The user wants two more admin views:
- `/admin/cleaners` — list of all cleaners on the platform
- `/admin/customers` — list of all customers on the platform

For each person in either list, the admin can:
- **Delete** them — removes the person from the list (their historical bookings/applications are unaffected)
- **Write notes** about them — a single free-text admin note per person, editable and saved

Customer registration remains ungated (no admin approval needed for customers — only cleaners go through the application/approval flow). The customer list is simply a view of registered customers.

Everything follows the existing **PREVIEW MOCK** convention: localStorage-backed stores, no real DB changes, EN/HE i18n from the start, RTL-safe Tailwind (`text-start`/`text-end`, `ms-`/`me-`, `start-`/`end-` — never `ml-`/`mr-`/`left-`/`right-`/`pl-`/`pr-`).

## Data layer

### Cleaners

Reuse the existing `CleanerResult` type (`lib/types/cleaner.ts`) and `MOCK_CLEANERS` seed (`lib/mockData/cleaners.ts`, 6 entries, already has `email`/`phone`). No changes needed here.

### Customers

**New: `lib/types/customer.ts`**
```ts
export type CustomerResult = {
  id: string
  full_name: string
  email: string
  phone: string
  address: string
}
```

**New: `lib/mockData/customers.ts`** — ~5 seeded customers, mirroring the style of `mockData/cleaners.ts`. Includes "Maya Cohen" (`maya.cohen@example.com` / `050-111-1111` / matching the address used in her bookings) so the seed lines up with existing booking data, plus a few additional customers for a realistic list.

### Admin overrides store

**New: `lib/mockAdminOverridesStore.ts`** — a small generic localStorage-backed store for admin-applied overrides (delete + notes), parameterized by `kind` so it serves both the cleaners and customers lists without duplicating logic:

```ts
export type PersonKind = 'cleaners' | 'customers'

type Override = { removed?: boolean; notes?: string }
type OverridesMap = Record<string, Override>  // keyed by person id

// Reads/writes localStorage key `clean_admin_overrides_${kind}`
function getOverrides(kind: PersonKind): OverridesMap

// Merge { notes } into the override for `id`
function setNotes(kind: PersonKind, id: string, notes: string): void

// Merge { removed: true } into the override for `id`
function removePerson(kind: PersonKind, id: string): void

// Apply overrides to a seed list: filter out removed entries,
// attach `adminNotes` (defaults to '') to each remaining entry
function applyOverrides<T extends { id: string }>(
  kind: PersonKind,
  seed: T[]
): (T & { adminNotes: string })[]
```

`applyOverrides` is the one shared piece of business logic both list pages need — it's used identically by both, so a small generic helper is justified rather than premature.

## UI & navigation

### `app/admin/cleaners/page.tsx` + `CleanerListCard.tsx`

- Page calls `applyOverrides('cleaners', MOCK_CLEANERS)` on mount, holds the result in local state.
- `CleanerListCard` displays: name, avatar initial, email, phone, area, service type badge(s), hourly rate, years of experience — similar information density to the existing `ApplicationCard`/`CleanerCard`.
- Notes: a `<textarea>` initialized from `adminNotes`, local state while editing, "Save" button calls `setNotes('cleaners', id, value)` and shows a brief saved confirmation.
- Delete: button triggers `window.confirm(t('admin.shared.confirmDelete'))`; on confirm, calls `removePerson('cleaners', id)` and removes the card from local state.

### `app/admin/customers/page.tsx` + `CustomerListCard.tsx`

- Same pattern: `applyOverrides('customers', MOCK_CUSTOMERS)`.
- `CustomerListCard` displays: name, avatar initial, email, phone, address.
- Same notes + delete behavior as `CleanerListCard`, reusing the shared i18n keys.

### Admin Nav (`app/admin/Nav.tsx`)

Add two more links after the existing "Applications" / "Booking Requests": "Cleaners" (`/admin/cleaners`) and "Customers" (`/admin/customers`), following the same active-link styling.

## i18n additions (EN/HE)

- `adminNav.cleaners`, `adminNav.customers` — nav labels
- `admin.cleaners.title`, `admin.cleaners.empty`
- `admin.customers.title`, `admin.customers.empty`
- `admin.shared.notes`, `admin.shared.notesPlaceholder`, `admin.shared.save`, `admin.shared.saved`, `admin.shared.delete`, `admin.shared.confirmDelete` — shared between both cards to avoid duplicating identical labels per kind

## Testing (TDD)

- `lib/mockAdminOverridesStore.test.ts` — `getOverrides`, `setNotes`, `removePerson`, and `applyOverrides` (covers: filters out removed entries, attaches `adminNotes` defaulting to `''`, merges partial overrides without clobbering other fields)
- `CleanerListCard.test.tsx` — renders cleaner info; editing + saving notes calls `setNotes`; delete confirms then calls `removePerson` and removes the card
- `CustomerListCard.test.tsx` — same for customers
- `app/admin/cleaners/page.test.tsx`, `app/admin/customers/page.test.tsx` — list rendering + integration with the overrides store (delete persists across reload)
- `app/admin/Nav.test.tsx` — update for the two new links
- Hebrew/RTL spot-check on both new pages (temporary render+locale-toggle test, deleted after verification), same approach used in prior phases

## Out of scope

- Customer registration approval gate (explicitly not needed — customers register freely)
- Bulk actions (select multiple, bulk delete)
- Note history/audit trail (single overwritable note per person, not a log)
- Any real backend/DB persistence — this stays in the PREVIEW MOCK pattern
