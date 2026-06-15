# Cleaner Booking Workflow & Contact Reveal — Design

**Date:** 2026-06-14
**Routes:** `/dashboard` (cleaner, new), `/bookings` (customer, updated), `/admin/bookings` (admin, updated)
**Branch:** `feature/admin`

---

## What It Does

This is Phase 1 of a larger admin-tooling change. It reverses the earlier decision to have the admin approve/deny bookings on the cleaner's behalf:

- The **cleaner** now accepts or declines their own booking requests, on a new `/dashboard` page.
- Once a booking is **accepted**, the customer and cleaner can see each other's **phone and email** inline on their existing booking cards.
- `/admin/bookings` becomes a **read-only status overview** of every request across all cleaners/customers (no more Approve/Deny) — this is "option 3" of the admin tooling the user described (Phase 2 will add the other two options: customer and cleaner management pages).

Everything continues to follow the existing mock/localStorage "PREVIEW MOCK" pattern — no DB migrations.

---

## Fixed Identity

There is no real auth in this preview. The customer side is already hardcoded as **"Maya Cohen"**. For symmetry, the cleaner side of `/dashboard` is hardcoded as **Sarah M. (`id: '1'`)** — the same cleaner already used as the example in admin bookings tests ("Maya Cohen requested Sarah M.").

---

## Data Model Changes

**`lib/types/cleaner.ts` — `CleanerResult`**
Add:
```ts
email: string
phone: string
```
Filled in for all 6 entries in `lib/mockData/cleaners.ts`.

**`lib/types/booking.ts` — `BookingResult`**
Add (all optional, mirroring the existing `customer_name?`/`cleaner_name` denormalization pattern):
```ts
cleaner_email?: string
cleaner_phone?: string
customer_email?: string
customer_phone?: string
```

**`lib/mockData/bookings.ts`**
All 5 seed bookings get `cleaner_email`/`cleaner_phone` (copied from the matching `MOCK_CLEANERS` entry by `cleaner_name`) and `customer_email`/`customer_phone` (Maya Cohen's fixed contact details).

**`app/(customer)/cleaners/[id]/BookingRequestForm.tsx`**
When creating a new booking, set:
- `cleaner_email: cleaner.email`, `cleaner_phone: cleaner.phone` (from the `CleanerResult` prop)
- `customer_email`/`customer_phone`: Maya Cohen's fixed contact details (same constants used for `customer_name: 'Maya Cohen'`)

---

## Cleaner Dashboard — `/dashboard`

New route: `app/(cleaner)/dashboard/page.tsx` (route group `(cleaner)` adds no path segment, so this resolves to `/dashboard`, matching `ROLE_HOME.cleaner`).

**Nav:** a simple header bar with the page title and `LanguageToggle`, styled like the admin Nav's gradient bar. No extra nav links needed — it's a single page.

**Page body:** `getAllBookings().filter(b => b.cleaner_name === 'Sarah M.')`, rendered as a grid of new `CleanerBookingCard` components — same grid/card layout convention as `/admin/bookings` and `/bookings`.

**`CleanerBookingCard`** (new component, mirrors `BookingCard`/`BookingReviewCard` structure — avatar/initial, service-type badge, date/time/duration, address, notes):
- `status === 'pending'` → **Accept** / **Deny** buttons, calling `updateBookingStatus(id, 'accepted' | 'declined')` and refreshing the list (same pattern as `ApplicationCard`/old `BookingReviewCard`).
- `status === 'accepted'` → status badge **plus** a "Contact" block showing the customer's phone and email.
- All other statuses (`declined`/`completed`/`cancelled`) → status badge only, same `STATUS_BADGE`/`STATUS_ACCENT` maps as `BookingCard`.

---

## Customer `/bookings` — Contact Reveal

`BookingCard` (`app/(customer)/bookings/BookingCard.tsx`): for bookings with `status === 'accepted'`, add a "Contact" block showing the cleaner's phone and email (using the new `cleaner_email`/`cleaner_phone` fields). No change for other statuses.

---

## Admin `/admin/bookings` — Read-Only Status View

- `BookingReviewCard` (`app/admin/bookings/BookingReviewCard.tsx`) loses its Approve/Deny buttons and `onUpdateStatus` prop entirely — every booking renders with just its status badge (`STATUS_BADGE`/`STATUS_ACCENT`, reusing `bookingCard.status.*`), regardless of status.
- `app/admin/bookings/page.tsx` drops the `updateBookingStatus` import/handler; still lists `getAllBookings()` for all cleaners/customers.
- Page title/empty-state i18n keys (`admin.bookings.title`/`empty`) stay as-is — still accurate for a list of all requests and their statuses.
- Remove the now-unused `admin.bookings.approve`/`admin.bookings.deny` i18n keys (EN + HE).

---

## i18n Additions (EN + HE)

- `dashboard.*` — `title` ("My Bookings" / cleaner-facing equivalent), `empty`, `accept`, `deny`.
- `bookingCard.contact.*` — `title` (e.g. "Contact Info"), `phone`, `email`.

Both added to `lib/i18n/translations.ts` for `en` and `he`, RTL-safe (existing `text-start`/`ms-`/`me-` conventions for any new layout).

---

## Error Handling

No new error states — this is all client-side mock-data manipulation, same as the existing `updateApplicationStatus`/`updateBookingStatus` calls. No network calls, no failure modes beyond what already exists.

---

## Testing (TDD)

- `lib/mockData/cleaners.ts` / `lib/types/cleaner.ts`: type-level change, covered by existing consuming tests + `tsc`.
- `lib/types/booking.ts` / `lib/mockData/bookings.ts`: type-level + seed data, covered by existing store tests + `tsc`.
- New `CleanerBookingCard.test.tsx`: renders pending/accepted/other states; Accept/Deny call `updateBookingStatus` with correct args; accepted state shows contact info; other render status badge.
- New `app/(cleaner)/dashboard/page.test.tsx`: filters to Sarah M.'s bookings only, Accept/Deny update status and re-render, empty state when no bookings.
- `BookingCard.test.tsx`: add case for accepted booking showing cleaner contact info; non-accepted bookings unchanged.
- `BookingReviewCard.test.tsx` / `app/admin/bookings/page.test.tsx`: update to assert **no** Approve/Deny buttons exist for any status, and that all bookings render with a status badge.
- Full suite (`npx jest`) + `npx tsc --noEmit` + Hebrew/RTL spot-check (temporary jsdom render, deleted after) + dev-server smoke check via curl.

---

## Out of Scope (Phase 2)

- Admin "all customers" page (notes + block).
- Admin "all cleaners" page (notes + block), likely absorbing the existing `/admin/applications` pending-approval flow.
