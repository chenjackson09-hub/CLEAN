# Chen's Feedback — Tracking Backlog

Source: Chen's review of clean-kappa-silk.vercel.app on 6/21/2026. Items are checked off as they're implemented — work through them one at a time (or in small batches), not all at once.

Status legend: ✅ already works · 🟡 partial · 🔴 missing · ❓ question (answered below)

---

## General / Login

- [x] ❓ **"Does everybody who wants to log in have to download a Vercel account?"**
  No. Auth is Supabase email/password (`app/(auth)/actions.ts`). Vercel is only the hosting platform — end users never see or need a Vercel account.

- [x] ✅ **Hebrew/English toggle works and switches quickly.**
  Two separate i18n systems (`lib/i18n/LanguageContext.tsx` for customer/auth/admin, `lib/lang.ts` for cleaner side) — both work, persist, and flip RTL/LTR instantly.

- [ ] 🟡 **"Welcome back" should maybe just say "Login" instead.**
  `lib/i18n/translations.ts` (`auth.login.title`) — currently renders "Welcome back" / "ברוך שובך" as the login page `<h1>`. Simple copy change.

- [ ] 🔴 **(Future, not now) Add a cleaning-themed image to the login/landing area.**
  Not implemented. Explicitly deprioritized by Chen.

---

## Cleaner Home (Dashboard)

`app/(cleaner)/cleaner/dashboard/`

- [x] ✅ Opens to "Welcome back, {name}" fast — `page.tsx` lines 112–114, uses `profiles.full_name`.
- [x] ✅ Upcoming/Past clean separation with bold date and "No past cleans yet" empty state — `page.tsx` lines 116–150.
- [ ] 🔴 **Search bar on the dashboard.** Does not exist — no filter/search input anywhere on this page.
- [ ] 🔴 **Upcoming-clean card: show only start time (not end/duration, since real finish time is unknown) + "in N days" countdown.**
  `UpcomingCleanCard.tsx` / `CleanDetailModal.tsx` currently show a computed start–end range and duration, not a countdown. Needs both a display change (start-only) and new logic (days-until).
- [ ] 🔴 **Link to the customer's profile from the clean-detail modal (maybe replacing "Done").**
  `CleanDetailModal.tsx` — "Done" button (line 105) just closes the modal, no navigation. No profile link exists from this modal (a similar link exists elsewhere, in `RequestCard.tsx`, to `/cleaner/customers/[id]`, but not here).
- [ ] 🟡 **Same modal: show only start time, drop duration (as above).**
- [ ] 🔴 **Add a comments field per clean** (e.g. "will be in the office" / "kitchen is most important").
  No such field in the `bookings` schema or UI.
- [x] ✅ Customer phone shown in green, centered, tappable — `CleanDetailModal.tsx` lines 87–97.
- [ ] 🔴 **"Talked to host / haven't talked to host" checkbox.** No such field exists in the schema or UI.
- [ ] 🔴 **Cancellation flow for an accepted booking, with a reason-prompt popup.**
  Does not exist. The only existing "cancel" logic auto-cancels a customer's *other* pending requests once one is accepted (`actions.ts` `respondToBooking`) — there's no cleaner-facing way to cancel an already-accepted booking.
- [x] ❓ **"Request Cleaner" — what is this?**
  This is the same button as "Request for cleaning" on the cleaner's public preview page (`app/(cleaner)/cleaner/preview/page.tsx` lines 76–78) — intended for a customer to start a booking from there. It currently has **no `onClick` handler**, so it's a non-functional placeholder.

---

## Cleaner Schedule (Availability)

`app/(cleaner)/cleaner/availability/CalendarGrid.tsx`

- [x] ✅ Hovering-cube grid formatting.
- [x] ✅ Two time blocks per day supported.
- [x] ✅ Smart warning on very short slots.
  Actually a **warning, not a hard block**: shows "⚠ This slot is an hour or less" for slots ≤60 min, but still allows saving. Close enough to what Chen described — worth confirming whether she wants it to actually be blocking.
- [x] ✅ Clicking a booked cube shows where you're cleaning (inline, in the day panel).
- [ ] 🔴 **Link to that customer's profile from the booked-cube view.** Currently just text ("Booked {name} / {time} / {address}"), not a link.
- [ ] 🔴 **Visual redesign: day-of-week banner (Sun/Mon/Tue…) instead of resizing cubes; month/week toggle like Google Calendar.**
  Current grid is a custom-built component (not a calendar library) with a column-count "zoom" toggle (7 columns down to 1), not a true month/week switcher. This is a real UI rework, not a tweak.
- [ ] 🔴 **"Add to Google Calendar" button.** Not implemented.
- [ ] 🔴 **Legend/key at the top (Available / Booked / Not available).**
  Colors already exist in code (dark blue = accepted, light blue = pending, pale blue = available, gray = none) but there's no legend shown to the user.
- [ ] 🟡 **Mark a specific day/time as recurring ("make this available every week").**
  Backend support exists — `cleaner_weekly_availability` table + matching logic still works as a fallback — but the dedicated weekly UI was **deliberately removed** (per `CLAUDE.md`). Re-adding a UI for this is a bigger decision than a quick toggle; Chen flagged it as low-priority/premium-feature anyway.

---

## Cleaner Profile

`app/(cleaner)/cleaner/profile/`

- [x] ✅ Gallery exists — `GalleryManager.tsx`, upload/delete, backed by `cleaner_gallery` table.
- [x] ✅ Simple, clear layout.
- [x] ❓ **"What is 'Request for cleaning' for?"** Same answer as above — non-functional placeholder button on the public preview page.
- [x] ✅ **"There's no place to see where the cleaner is from."**
  Actually already there — `ProfileForm.tsx` lines 138–147 shows the address as an editable, pre-filled field. Worth double-checking with Chen whether she means something different (e.g. a *display-only* location shown elsewhere, like on the public preview page, rather than the edit form).
- [x] ✅ **"After editing, profile doesn't refresh automatically."**
  Already calls `router.refresh()` on save (`ProfileForm.tsx` line 33) — should be auto-refreshing. Worth re-testing live; might have been fixed since Chen's pass, or there's a specific repro case (e.g. the *customer-facing* preview page, which is a separate route and might not revalidate).
- [ ] 🟡 **More service options** (see her spec doc).
  Currently only two checkboxes: residential / commercial (`ProfileForm.tsx`). Expanding this is just adding more checkbox options once the desired list is confirmed.
- [ ] 🔴 **"Houses cleaned" count and rating, even if admin-entered manually.**
  No such columns exist in the `cleaners` table at all — needs a schema change before any UI.

---

## Admin

⚠️ Note: the file Chen referenced (`CleanMatch — Admin Panel Spec.html`) turned out, when pasted, to be a general product PRD from 2026-06-11 — it doesn't mention "Hosts" or "Matching Queue" anywhere and uses "customer" terminology throughout. It does **not** match Chen's own 6-sheet breakdown below, so it isn't used as a source of truth here — only Chen's own written description is.

Current nav: `admin/Nav.tsx` — Applications, Bookings, Cleaners, Customers (Availability hidden). All four list pages use the same flat 3-column card grid, which is almost certainly the direct cause of Chen's "boxes next to one another causes confusion" — there's no visual hierarchy distinguishing people from requests, and no drill-in detail pages.

1. [ ] 🔴 **Dashboard** (aggregate counts + "needs attention" list). Does not exist at all — admins currently land on `/admin/applications` with no overview.
2. [ ] 🟡 **Applications** (review, Approve/Reject/Request More Info). Approve/Reject exist (`admin/applications/`); "Request More Info" action and a visible ID-document viewer are missing.
3. [ ] 🟡 **Cleaners** (full list + per-cleaner profile: info, availability, rates, status, performance stats). List exists (`admin/cleaners/`) but it's flat cards, no per-cleaner detail page, no performance stats (no `jobs_done`/`rating`/`cancellation_rate` columns exist), and the cleaner status enum in the DB (`pending/approved/rejected/suspended`) doesn't match Chen's wishlist (`New/Active/In training/Inactive/Blocked`) — reconciling that is a data-model decision, not just a UI change.
4. [ ] 🟡 **Hosts** (full list + per-host profile: contact, home details, booking history, most-used cleaner, internal notes). List exists (`admin/customers/`) but no home-details fields exist in the schema (rooms/pets/size — same gap as the host profile item below), no booking history or "most-used cleaner" view, and admin notes are currently client-side only (not persisted to the DB).
5. [ ] 🟡 **Requests** (log of every booking + outcome, for support lookups). List exists (`admin/bookings/`) but with no search/filter by date, customer, or cleaner, and no detail view.
6. [ ] 🔴 **Matching Queue** (unassigned bookings, sorted by urgency, manual notify/intervene). Does not exist — `/admin/bookings` mixes all statuses together with no concept of "still needs a cleaner."

---

## Host (Customer)

`app/(customer)/`

- [x] ✅ Easy, smooth login.
- [ ] 🟡 **Rename "Browse" to "Schedule."** Nav currently says "Browse Cleaners" (`browse/page.tsx` / `BrowseTitle.tsx`) — straightforward copy change.
- [ ] 🔴 **Remove filters for hosts — let them pick a day and just see who's available, no need for house-profile-based filtering.**
  Currently `BrowseFilters.tsx` has service type, time, duration, location, and sort-by filters. This is a deliberate UX simplification Chen is requesting (limited cleaners → filtering hurts match rate), not a small tweak — worth confirming exactly which filters to drop vs keep (e.g. day/time probably stay; service-type/sort might go).
- [ ] ⁉️ **Page bounces/jumps when pressing a date on the schedule.**
  No explicit scroll-into-view code found, but the filter panel (`BrowseFilters.tsx`) collapses after a location is set, which shifts page height — likely culprit. Needs a live repro to confirm before fixing.
- [x] 🟡 **"Fewer/many/limited cleaners" scarcity indicator (flight-pricing style) — "does it work already?"**
  Partially: `CalendarPicker.tsx` shows a static Many/Fewer/Limited legend based on a hardcoded day-of-week pattern (not live cleaner counts), while the results section separately shows a real "{count} cleaners available" per date. Not currently dynamic/data-driven the way she's picturing — and not visible right now simply because no cleaners have open availability yet.
- [ ] 🔴 **Book directly from the schedule page (pick cleaner + day, book) instead of routing through the cleaner's profile page and re-entering details.**
  Confirmed: clicking a cleaner card always routes to `/cleaners/[id]` first (`CleanerCard.tsx` "View Profile" link), where `BookingRequestForm` lives. Date/location are pre-filled via URL params, but it's still profile-page-first, not inline-from-schedule.
- [ ] 🔴 **See a cleaner's available time slots for a specific day inline on the schedule page.** Only visible after navigating to the cleaner's profile page.
- [ ] 🟡 **Keep the duration/time-limit picker, but add a "+/- N hours" flexibility option.**
  Currently a fixed 1–8 hour dropdown (`BookingRequestForm.tsx`, also `BrowseFilters.tsx`) — no flexible range option exists yet.
- [ ] 🔴 **"In N more days" on the bookings page.** `BookingCard.tsx` shows an absolute date only, no relative countdown.
- [ ] 🔴 **Host profile: rooms, pets, house size, floor, special requests, profile picture.**
  Profile picture, name, phone, bio, address, and service-type preference already exist (`app/(customer)/profile/`); rooms/pets/size/floor/special-requests have **no schema columns at all** — needs a `customers` table migration before any UI work.
