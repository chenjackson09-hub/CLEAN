# Browse Page Design
**Date:** 2026-06-11
**Route:** `/browse` (customer)
**Branch:** `feature/customer`

---

## What It Does

The browse page lets logged-in customers search for available cleaners by day, time window, and service type. Results are filtered server-side using a PostGIS proximity query and returned as a card grid.

---

## Layout

Top filter bar + card grid below.

```
┌─────────────────────────────────────────────────┐
│ Nav: Logo · Hi {name} · My Bookings · Sign out  │
├─────────────────────────────────────────────────┤
│ Day ▾  Start Time ▾  End Time ▾  Type ▾  Search │  ← filter bar
├─────────────────────────────────────────────────┤
│ 6 cleaners found                                │
│ ┌──────┐ ┌──────┐ ┌──────┐                     │
│ │ Card │ │ Card │ │ Card │  ← 3-column grid     │
│ └──────┘ └──────┘ └──────┘                     │
└─────────────────────────────────────────────────┘
```

---

## Filter Bar

Four inputs, always visible at the top:

| Field | Type | Values |
|---|---|---|
| Day | `<select>` | Sun–Sat |
| Start Time | `<select>` | 06:00–22:00 in 30-min steps |
| End Time | `<select>` | 06:00–22:00 in 30-min steps (must be > start) |
| Service Type | `<select>` | Residential · Commercial · Both |

Submitting the form updates URL search params (`?day=1&start=09:00&end=13:00&type=residential`) and triggers a server-side re-render. No client-side filtering.

---

## Cleaner Card

Each card shows:
- Avatar (initial fallback if no photo)
- Name
- Distance from customer (km)
- Years of experience
- Bio excerpt (first ~80 chars, truncated)
- Service type badge (colour-coded: indigo = residential, green = commercial, yellow = both)
- Languages spoken
- Hourly rate
- "View Profile" button → `/cleaners/{id}`

---

## Data Flow

1. Page is a **Next.js Server Component** at `app/(customer)/browse/page.tsx`
2. Reads `searchParams` from the URL
3. If filters present: calls `getCleaners(filters)` server action
4. `getCleaners` runs the PostGIS query from the spec (filters by status=approved, service type, location radius, and availability window)
5. Customer's lat/lng comes from their `customers` row (geocoded at profile save)
6. Returns list of cleaners with distance included
7. Grid renders server-side — no client state needed for the results

---

## Empty State

When no cleaners match: "No cleaners found for your filters. Try a different day or time."

When filters haven't been submitted yet: prompt the customer to use the filters above.

---

## Files to Create

```
app/(customer)/browse/
  page.tsx              ← Server Component, reads searchParams, renders grid
  CleanerCard.tsx       ← Card component (can be a Server Component)
  FilterBar.tsx         ← Filter form (Client Component — needs form submission)
lib/actions/
  cleaners.ts           ← getCleaners(filters) server action with PostGIS query
```

---

## Error Handling

- Missing customer lat/lng (profile incomplete): show banner "Please complete your profile to see nearby cleaners" with link to `/profile`.
- Supabase error: show generic "Something went wrong" message, log error server-side.
