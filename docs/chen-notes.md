# Chen's Feedback — Tracking Backlog

Source: Chen's review of clean-kappa-silk.vercel.app on 6/21/2026, plus the GitHub Issues opened since (cross-referenced at the bottom). Items are checked off as they're implemented — work through them one at a time (or in small batches), not all at once.

Status legend: ✅ already works · 🟡 partial · 🔴 missing · ❓ question (answered below)

⚠️ **Branch divergence (as of 2026-06-26):** `main` has moved on independently of this `chen-notes` branch — another contributor (`rafael-mishayev`) merged PRs #26/#27 fixing issues #14 and #19 directly to `main`. PR #27 touches `app/(cleaner)/cleaner/dashboard/UpcomingCleanCard.tsx` and `lib/lang.ts` — **the same files** this branch's Batch-1 countdown work touched, independently implementing overlapping logic. Merging/rebasing `chen-notes` onto `main` will need a manual reconciliation of that file, not a trivial merge. Do this before starting more cleaner-dashboard work on either branch.

⚠️ **Issue/code mismatch:** GitHub issue #24 ("add cancelation option") is closed with both checkboxes ticked, but no cancellation flow exists in the code on any branch I can find — confirm with Chen whether it was closed in error.

---

## General / Login

- [x] ❓ **"Does everybody who wants to log in have to download a Vercel account?"**
  No. Auth is Supabase email/password (`app/(auth)/actions.ts`). Vercel is only the hosting platform — end users never see or need a Vercel account.

- [x] ✅ **Hebrew/English toggle works and switches quickly.**
  Two separate i18n systems (`lib/i18n/LanguageContext.tsx` for customer/auth/admin, `lib/lang.ts` for cleaner side) — both work, persist, and flip RTL/LTR instantly. Both `t()` functions now also support `{var}` interpolation (added during the countdown work below).

- [x] ✅ **"Welcome back" should maybe just say "Login" instead.** Done — `lib/i18n/translations.ts` `auth.login.title`.

- [ ] 🔴 **(Future, not now) Add a cleaning-themed image to the login/landing area.**
  Not implemented. Explicitly deprioritized by Chen.

---

## Cleaner Home (Dashboard)

`app/(cleaner)/cleaner/dashboard/`

- [x] ✅ Opens to "Welcome back, {name}" fast.
- [x] ✅ Upcoming/Past clean separation with bold date and "No past cleans yet" empty state.
- [ ] 🔴 **Search bar on the dashboard.** Still missing.
- [x] ✅ **Upcoming-clean card: start time only + "in N days" countdown.**
  Done in `UpcomingCleanCard.tsx` / `CleanDetailModal.tsx`. ⚠️ Also independently re-implemented on `main` for the same files via #27 — reconcile on merge (see branch-divergence note above).
- [x] ✅ **Link to the customer's profile from the clean-detail modal.** Done — the customer name in `CleanDetailModal.tsx`'s header now links to `/cleaner/customers/[id]`; "Done" stays as the close action. (Likely satisfies issue #22 — verify live and close it rather than redoing this.)
- [ ] 🔴 **Add a comments field per clean** (e.g. "will be in the office" / "kitchen is most important"). No such field in the `bookings` schema or UI.
- [x] ✅ Customer phone shown in green, centered, tappable.
- [ ] 🔴 **"Talked to host / haven't talked to host" checkbox.** No such field exists. = GitHub issue #23.
- [ ] 🔴 **Cancellation flow for an accepted booking, with a reason-prompt popup.**
  Does not exist on any branch. = GitHub issue #24 (closed, but see mismatch warning above — likely closed in error).
- [x] ❓ **"Request Cleaner" — what is this?** Placeholder, non-functional button on the cleaner's public preview page. Unimplemented.

---

## Cleaner Schedule (Availability)

`app/(cleaner)/cleaner/availability/CalendarGrid.tsx`

- [x] ✅ Hovering-cube grid formatting.
- [x] ✅ Two time blocks per day supported.
- [x] ✅ Smart warning on very short slots (warns, doesn't hard-block — confirmed acceptable as-is).
- [x] ✅ Clicking a booked cube shows where you're cleaning, inline.
- [x] ✅ **Link to that customer's profile from the booked-cube view.** Done — links to `/cleaner/customers/[id]`.
- [ ] 🔴 **Visual redesign: day-of-week banner instead of resizing cubes; month/week toggle like Google Calendar.** Not started — real UI rework, not a tweak.
- [ ] 🔴 **"Add to Google Calendar" button.** Not implemented.
- [x] ✅ **Legend/key (Available / Booked / Pending / Not available).** Done.
- [ ] 🟡 **Mark a specific day/time as recurring.** Backend exists, UI deliberately removed — low priority per Chen.

---

## Cleaner Profile

`app/(cleaner)/cleaner/profile/`

- [x] ✅ Gallery, simple layout.
- [x] ❓ **"What is 'Request for cleaning' for?"** Non-functional placeholder, unimplemented.
- [x] ✅ Address already shown/editable on the profile form — re-confirm with Chen if she meant a different screen.
- [x] ✅ Profile auto-refreshes on save (`router.refresh()`) — re-confirm with Chen if still reproducible somewhere specific.
- [ ] 🟡 **More service options.** Still just residential/commercial — needs the desired list confirmed.
- [ ] 🔴 **"Houses cleaned" count and rating.** No schema columns exist yet.

---

## Admin Panel Rebuild

Chen supplied the real spec (6 screens: Dashboard, Applications, Cleaners, Hosts, Requests, Matching Queue) — the file originally referenced turned out to be an unrelated PRD and was discarded as a source. Full phased plan lives outside the repo (the planning doc from that work); status here is the live summary.

1. [x] ✅ **Phase 0 — foundation migration** (`admin_notes` columns, `needs_info` status, `admin_action_log` table). Done.
2. [x] ✅ **Phase 1 — Dashboard** (`/admin/dashboard`, schema-backed KPIs, needs-attention panel, recent activity, top areas). Done, verified live.
3. [x] ✅ **Phase 1b — cleaner status enum migration** (`new/active/in_training/inactive/blocked`, all ~9 call sites updated). Done.
4. [x] ✅ **Phase 2 — Applications** (status tabs, "Needs info" action, persisted admin notes, ID-doc link). Done.
5. [ ] 🔴 **Phase 3 — Cleaners** (per-cleaner detail page, performance stats, status management). Next up — mine.
6. [ ] 🔴 **Phase 4 — Hosts** (per-host detail page, home details, favorite cleaner). **Assigned to a friend.**
7. [ ] 🔴 **Phase 5 — Requests** (filter/search on the existing log, response time). **Assigned to a friend.**
8. [ ] 🔴 **Phase 6 — Matching Queue** (unmatched-request triage, urgency, notify cleaners). **Not yet assigned to anyone.**

---

## Host (Customer)

`app/(customer)/`

- [x] ✅ Easy, smooth login.
- [x] ✅ **Rename "Browse" to "Schedule."** Done across nav, page title, back-links, empty-state CTA. = GitHub issue #15 (should be closed, not yet).
- [ ] 🔴 **Remove filters for hosts.** Not started — needs Chen to confirm exactly which filters to drop vs keep. Related: GitHub issue #13 ("all the BROWSE fixes that are needed") tracks this broader cleanup.
- [x] ✅ **Page bounce/jump on date click — fixed independently on `main`.** GitHub issue #14, fixed via PR #26 (adds an explicit "Search" button instead of auto-reloading on date tap) — not part of this branch, will arrive on next merge from `main`.
- [x] 🟡 **"Fewer/many/limited cleaners" scarcity indicator.** Partially real (static weekly pattern + a real per-date count) — not fully dynamic. Acceptable for now.
- [ ] 🔴 **Book directly from the schedule page instead of routing through the cleaner's profile page.** Not started. Related: GitHub issue #17 wants a "Schedule a clean" button added *next to* (not replacing) "View Profile" — narrower, possibly-quicker version of this same item; do that first.
- [ ] 🔴 **See a cleaner's available time slots for a specific day inline on the schedule page.** Not started. Related: GitHub issue #17 also wants available times shown directly on the browse card.
- [ ] 🟡 **Keep the duration/time-limit picker, but add a "+/- N hours" flexibility option.** Not started. Related but distinct: GitHub issue #25 raises a deeper problem — first-time customers don't know how long a clean takes at all, and leaving duration open conflicts with cleaners needing a fixed schedule slot. Issue is tagged "question" — talk to Chen about the actual mechanism before building anything here.
- [x] ✅ **"In N more days" on the bookings page.** Done. = GitHub issue #19 (closed via PR #27 on `main` — independently re-implemented there too; same reconciliation note as the cleaner-dashboard countdown applies).
- [ ] 🔴 **Host profile: rooms, pets, house size, floor, special requests, profile picture.** No schema yet — this is exactly **Admin Phase 4**, assigned to a friend, plus GitHub issue #18 (same ask, customer-facing side — the admin detail view will read these columns once a friend adds them in Phase 4, but the *customer-facing form* to fill them in is separate and still unassigned).

---

## GitHub Issues not otherwise covered above

Genuinely new items, not represented anywhere in this doc until now:

- [ ] **#8 — Email verification + password reset.** Confirmed in code: **no password-reset flow exists at all** (`app/(auth)/` has no forgot-password route). Significant gap, unassigned.
- [ ] **#10 — Cap simultaneous pending requests at 20 per customer.** 2 of 3 sub-items already work (multi-cleaner/day requests, auto-cancel siblings on accept); only the hard cap is missing.
- [ ] **#11 — Site-wide translation completeness audit.** QA sweep, not urgent.
- [ ] **#12 — Legal/regulatory compliance check for Israeli web standards.** Not an engineering task by itself — needs a legal/compliance answer before any code follows from it.
- [ ] **#20 — "CLEANER - HOME, changes to the home page."** No body detail on the issue — get specifics from whoever filed it before scoping.

Issues that map directly onto items already tracked above (no separate action needed beyond what's listed): #7 (search engine, mostly done), #9 (calendar, done), #21 (countdown, done — see branch divergence note).
