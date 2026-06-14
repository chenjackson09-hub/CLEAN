# Cleaner Booking Workflow & Contact Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the cleaner (hardcoded as Sarah M., id `'1'`) accept/decline her own booking requests on a new `/dashboard` page; once a booking is accepted, customer and cleaner see each other's phone/email inline on their existing booking cards; `/admin/bookings` becomes a read-only status overview (Approve/Deny removed).

**Architecture:** Pure client-side changes to the existing Next.js 14 App Router + TypeScript + Tailwind "Clean" app, following the established mock/localStorage "PREVIEW MOCK" pattern (no DB migrations). Reuses `lib/mockBookingsStore.ts`'s existing `getAllBookings()`/`updateBookingStatus()`. New route `app/(cleaner)/dashboard/page.tsx` (route group adds no path segment → resolves to `/dashboard`). New `CleanerBookingCard` component mirrors the existing `BookingCard`/`BookingReviewCard` structure. `BookingCard` and the new `CleanerBookingCard` both grow a conditional "Contact Info" block for accepted bookings. `BookingReviewCard` loses its Approve/Deny buttons and `onUpdateStatus` prop.

**Tech Stack:** Next.js 14.2.35 App Router, TypeScript, Tailwind CSS, Jest + `@testing-library/react` + `@testing-library/user-event`, `lib/i18n` (EN/HE, `useLanguage()`/`t()`, RTL-safe classes).

---

## Task 1: Contact info data model + seed data

**Files:**
- Modify: `lib/types/cleaner.ts`
- Modify: `lib/types/booking.ts`
- Modify: `app/(customer)/cleaners/[id]/BookingRequestForm.tsx`
- Test: `app/(customer)/cleaners/[id]/BookingRequestForm.test.tsx`
- Modify: `lib/mockData/cleaners.ts`
- Modify: `lib/mockData/bookings.ts`

- [ ] **Step 1: Add optional `email`/`phone` to `CleanerResult`**

In `lib/types/cleaner.ts`, change:

```ts
export type CleanerResult = {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string
  service_types: string[]
  hourly_rate: number
  years_experience: number
  languages: string[]
  distance_km: number
  area?: string
}
```

to:

```ts
export type CleanerResult = {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string
  service_types: string[]
  hourly_rate: number
  years_experience: number
  languages: string[]
  distance_km: number
  area?: string
  email?: string
  phone?: string
}
```

- [ ] **Step 2: Add optional contact fields to `BookingResult`**

In `lib/types/booking.ts`, change:

```ts
export type BookingResult = {
  id: string
  cleaner_name: string
  cleaner_avatar_url: string | null
  service_type: 'residential' | 'commercial'
  scheduled_date: string // 'YYYY-MM-DD'
  scheduled_start: string // 'HH:MM'
  duration_hours: number
  address: string
  notes?: string
  status: BookingStatus
  customer_name?: string
}
```

to:

```ts
export type BookingResult = {
  id: string
  cleaner_name: string
  cleaner_avatar_url: string | null
  service_type: 'residential' | 'commercial'
  scheduled_date: string // 'YYYY-MM-DD'
  scheduled_start: string // 'HH:MM'
  duration_hours: number
  address: string
  notes?: string
  status: BookingStatus
  customer_name?: string
  cleaner_email?: string
  cleaner_phone?: string
  customer_email?: string
  customer_phone?: string
}
```

- [ ] **Step 3: Write the failing test — extend `BookingRequestForm.test.tsx`**

In `app/(customer)/cleaners/[id]/BookingRequestForm.test.tsx`, change the `cleaner` fixture from:

```ts
const cleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough.',
  service_types: ['residential', 'commercial'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
  area: 'Tel Aviv',
}
```

to:

```ts
const cleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough.',
  service_types: ['residential', 'commercial'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
  area: 'Tel Aviv',
  email: 'sarah.m@example.com',
  phone: '050-222-1111',
}
```

Then change the `toMatchObject` assertion in `'adds the booking to the mock bookings store on submit'` from:

```ts
    const stored = getStoredBookings()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      cleaner_name: cleaner.full_name,
      service_type: cleaner.service_types[0],
      scheduled_date: '2026-07-01',
      scheduled_start: '09:00',
      duration_hours: 2,
      address: '12 Rothschild Blvd, Tel Aviv',
      status: 'pending',
    })
```

to:

```ts
    const stored = getStoredBookings()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      cleaner_name: cleaner.full_name,
      service_type: cleaner.service_types[0],
      scheduled_date: '2026-07-01',
      scheduled_start: '09:00',
      duration_hours: 2,
      address: '12 Rothschild Blvd, Tel Aviv',
      status: 'pending',
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
      customer_email: 'maya.cohen@example.com',
      customer_phone: '050-111-1111',
    })
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx jest app/\(customer\)/cleaners/\[id\]/BookingRequestForm.test.tsx`

Expected: FAIL on `'adds the booking to the mock bookings store on submit'` — `toMatchObject` fails because `stored[0]` has no `cleaner_email`/`cleaner_phone`/`customer_email`/`customer_phone`.

- [ ] **Step 5: Implement — set the 4 contact fields in `BookingRequestForm.tsx`**

In `app/(customer)/cleaners/[id]/BookingRequestForm.tsx`, change the `booking` object inside `handleSubmit` from:

```ts
    const booking: BookingResult = {
      id: `${cleaner.id}-${Date.now()}`,
      cleaner_name: cleaner.full_name,
      cleaner_avatar_url: cleaner.avatar_url,
      service_type: serviceType as BookingResult['service_type'],
      scheduled_date: date,
      scheduled_start: startTime,
      duration_hours: duration,
      address,
      notes: notes || undefined,
      status: 'pending',
      customer_name: 'Maya Cohen',
    }
```

to:

```ts
    const booking: BookingResult = {
      id: `${cleaner.id}-${Date.now()}`,
      cleaner_name: cleaner.full_name,
      cleaner_avatar_url: cleaner.avatar_url,
      service_type: serviceType as BookingResult['service_type'],
      scheduled_date: date,
      scheduled_start: startTime,
      duration_hours: duration,
      address,
      notes: notes || undefined,
      status: 'pending',
      customer_name: 'Maya Cohen',
      cleaner_email: cleaner.email,
      cleaner_phone: cleaner.phone,
      customer_email: 'maya.cohen@example.com',
      customer_phone: '050-111-1111',
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest app/\(customer\)/cleaners/\[id\]/BookingRequestForm.test.tsx`

Expected: PASS (all 7 tests).

- [ ] **Step 7: Fill in `email`/`phone` for all 6 cleaners in seed data**

Replace the full contents of `lib/mockData/cleaners.ts` with:

```ts
import type { CleanerResult } from '@/lib/types/cleaner'

export const MOCK_CLEANERS: CleanerResult[] = [
  { id: '1', full_name: 'Sarah M.', avatar_url: null, bio: 'Reliable and thorough. Specialise in deep cleans and move-out cleaning for residential homes.', service_types: ['residential'], hourly_rate: 80, years_experience: 5, languages: ['EN', 'HE'], distance_km: 2.1, area: 'Tel Aviv', email: 'sarah.m@example.com', phone: '050-222-1111' },
  { id: '2', full_name: 'David K.', avatar_url: null, bio: 'Expert in office and retail space cleaning. Fully insured and available on short notice.', service_types: ['commercial'], hourly_rate: 95, years_experience: 8, languages: ['EN', 'AR'], distance_km: 4.7, area: 'Haifa', email: 'david.k@example.com', phone: '050-222-2222' },
  { id: '3', full_name: 'Lena R.', avatar_url: null, bio: 'Friendly and detail-oriented. Available most weekdays. Eco-friendly products on request.', service_types: ['residential', 'commercial'], hourly_rate: 70, years_experience: 3, languages: ['RU', 'HE'], distance_km: 1.3, area: 'Tel Aviv', email: 'lena.r@example.com', phone: '050-222-3333' },
  { id: '4', full_name: 'Moshe T.', avatar_url: null, bio: 'Professional cleaner with a focus on post-construction and deep cleaning services.', service_types: ['residential'], hourly_rate: 85, years_experience: 6, languages: ['HE'], distance_km: 3.5, area: 'Ramat Gan', email: 'moshe.t@example.com', phone: '050-222-4444' },
  { id: '5', full_name: 'Anna P.', avatar_url: null, bio: 'Experienced in both homes and small offices. References available upon request.', service_types: ['residential', 'commercial'], hourly_rate: 75, years_experience: 4, languages: ['RU', 'EN'], distance_km: 0.8, area: 'Tel Aviv', email: 'anna.p@example.com', phone: '050-222-5555' },
  { id: '6', full_name: 'Yosef B.', avatar_url: null, bio: 'Specialise in large commercial spaces. Background-checked and professionally trained.', service_types: ['commercial'], hourly_rate: 100, years_experience: 10, languages: ['HE', 'EN'], distance_km: 6.2, area: 'Herzliya', email: 'yosef.b@example.com', phone: '050-222-6666' },
]
```

- [ ] **Step 8: Fill in contact fields for all 5 seed bookings**

Replace the full contents of `lib/mockData/bookings.ts` with:

```ts
import type { BookingResult } from '@/lib/types/booking'

export const MOCK_BOOKINGS: BookingResult[] = [
  {
    id: '1',
    cleaner_name: 'Sarah M.',
    cleaner_avatar_url: null,
    service_type: 'residential',
    scheduled_date: '2026-06-15',
    scheduled_start: '09:00',
    duration_hours: 3,
    address: '12 Rothschild Blvd, Tel Aviv',
    notes: 'Please bring eco-friendly products if possible.',
    status: 'pending',
    customer_name: 'Maya Cohen',
    cleaner_email: 'sarah.m@example.com',
    cleaner_phone: '050-222-1111',
    customer_email: 'maya.cohen@example.com',
    customer_phone: '050-111-1111',
  },
  {
    id: '2',
    cleaner_name: 'David K.',
    cleaner_avatar_url: null,
    service_type: 'commercial',
    scheduled_date: '2026-06-18',
    scheduled_start: '14:00',
    duration_hours: 4,
    address: '8 HaArba\'a St, Tel Aviv',
    status: 'accepted',
    customer_name: 'Maya Cohen',
    cleaner_email: 'david.k@example.com',
    cleaner_phone: '050-222-2222',
    customer_email: 'maya.cohen@example.com',
    customer_phone: '050-111-1111',
  },
  {
    id: '3',
    cleaner_name: 'Lena R.',
    cleaner_avatar_url: null,
    service_type: 'residential',
    scheduled_date: '2026-06-05',
    scheduled_start: '10:00',
    duration_hours: 2,
    address: '45 Dizengoff St, Tel Aviv',
    status: 'completed',
    customer_name: 'Maya Cohen',
    cleaner_email: 'lena.r@example.com',
    cleaner_phone: '050-222-3333',
    customer_email: 'maya.cohen@example.com',
    customer_phone: '050-111-1111',
  },
  {
    id: '4',
    cleaner_name: 'Yosef B.',
    cleaner_avatar_url: null,
    service_type: 'commercial',
    scheduled_date: '2026-06-02',
    scheduled_start: '08:00',
    duration_hours: 5,
    address: '3 Herzl St, Herzliya',
    status: 'declined',
    customer_name: 'Maya Cohen',
    cleaner_email: 'yosef.b@example.com',
    cleaner_phone: '050-222-6666',
    customer_email: 'maya.cohen@example.com',
    customer_phone: '050-111-1111',
  },
  {
    id: '5',
    cleaner_name: 'Anna P.',
    cleaner_avatar_url: null,
    service_type: 'residential',
    scheduled_date: '2026-05-28',
    scheduled_start: '11:00',
    duration_hours: 1,
    address: '20 Allenby St, Tel Aviv',
    status: 'cancelled',
    customer_name: 'Maya Cohen',
    cleaner_email: 'anna.p@example.com',
    cleaner_phone: '050-222-5555',
    customer_email: 'maya.cohen@example.com',
    customer_phone: '050-111-1111',
  },
]
```

- [ ] **Step 9: Run the full suite and tsc to confirm nothing broke**

Run: `npx jest`

Expected: All suites PASS (137 tests + the BookingRequestForm extension already counted).

Run: `npx tsc --noEmit`

Expected: Clean aside from the pre-existing excluded `middleware.ts` issue.

- [ ] **Step 10: Commit**

```bash
git add lib/types/cleaner.ts lib/types/booking.ts lib/mockData/cleaners.ts lib/mockData/bookings.ts app/\(customer\)/cleaners/\[id\]/BookingRequestForm.tsx app/\(customer\)/cleaners/\[id\]/BookingRequestForm.test.tsx
git commit -m "feat: add cleaner/customer contact info to booking data model"
```

---

## Task 2: Customer `/bookings` — reveal cleaner contact info once accepted

**Files:**
- Modify: `app/(customer)/bookings/BookingCard.tsx`
- Test: `app/(customer)/bookings/BookingCard.test.tsx`
- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing tests**

In `app/(customer)/bookings/BookingCard.test.tsx`, add these two tests at the end of the `describe('BookingCard', ...)` block (after the `'renders img when cleaner_avatar_url is set'` test, before the closing `})`):

```ts

  it('shows cleaner contact info for accepted bookings', () => {
    render(<BookingCard booking={{
      ...baseBooking,
      status: 'accepted',
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
    }} />)

    expect(screen.getByText('Contact Info')).toBeInTheDocument()
    expect(screen.getByText(/050-222-1111/)).toBeInTheDocument()
    expect(screen.getByText(/sarah.m@example.com/)).toBeInTheDocument()
  })

  it('does not show contact info for pending bookings', () => {
    render(<BookingCard booking={{
      ...baseBooking,
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
    }} />)

    expect(screen.queryByText('Contact Info')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest app/\(customer\)/bookings/BookingCard.test.tsx`

Expected: FAIL — `'shows cleaner contact info for accepted bookings'` fails because `screen.getByText('Contact Info')` finds nothing.

- [ ] **Step 3: Add `bookingCard.contact.*` i18n keys**

In `lib/i18n/translations.ts`, in the `en.bookingCard` object, change:

```ts
    bookingCard: {
      hour: 'hr',
      hours: 'hrs',
      status: {
        pending: 'Pending',
        accepted: 'Accepted',
        declined: 'Declined',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
    },
```

to:

```ts
    bookingCard: {
      hour: 'hr',
      hours: 'hrs',
      status: {
        pending: 'Pending',
        accepted: 'Accepted',
        declined: 'Declined',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      contact: {
        title: 'Contact Info',
        phone: 'Phone',
        email: 'Email',
      },
    },
```

In the `he.bookingCard` object, change:

```ts
    bookingCard: {
      hour: 'שעה',
      hours: 'שעות',
      status: {
        pending: 'בהמתנה',
        accepted: 'התקבל',
        declined: 'נדחה',
        completed: 'הושלם',
        cancelled: 'בוטל',
      },
    },
```

to:

```ts
    bookingCard: {
      hour: 'שעה',
      hours: 'שעות',
      status: {
        pending: 'בהמתנה',
        accepted: 'התקבל',
        declined: 'נדחה',
        completed: 'הושלם',
        cancelled: 'בוטל',
      },
      contact: {
        title: 'פרטי קשר',
        phone: 'טלפון',
        email: 'אימייל',
      },
    },
```

- [ ] **Step 4: Implement the Contact block in `BookingCard.tsx`**

In `app/(customer)/bookings/BookingCard.tsx`, change:

```tsx
      {booking.notes && (
        <p className="text-sm text-gray-500 italic">"{booking.notes}"</p>
      )}
    </div>
  )
}
```

to:

```tsx
      {booking.notes && (
        <p className="text-sm text-gray-500 italic">"{booking.notes}"</p>
      )}

      {booking.status === 'accepted' && booking.cleaner_phone && booking.cleaner_email && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingCard.contact.title')}</p>
          <p>{t('bookingCard.contact.phone')}: {booking.cleaner_phone}</p>
          <p>{t('bookingCard.contact.email')}: {booking.cleaner_email}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest app/\(customer\)/bookings/BookingCard.test.tsx`

Expected: PASS (all 13 tests).

- [ ] **Step 6: Run the full suite to confirm nothing broke**

Run: `npx jest`

Expected: All suites PASS.

- [ ] **Step 7: Commit**

```bash
git add app/\(customer\)/bookings/BookingCard.tsx app/\(customer\)/bookings/BookingCard.test.tsx lib/i18n/translations.ts
git commit -m "feat: reveal cleaner contact info on accepted bookings"
```

---

## Task 3: Admin `/admin/bookings` becomes read-only

**Files:**
- Modify: `app/admin/bookings/BookingReviewCard.tsx`
- Test: `app/admin/bookings/BookingReviewCard.test.tsx`
- Modify: `app/admin/bookings/page.tsx`
- Test: `app/admin/bookings/page.test.tsx`
- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Rewrite the failing test file**

Replace the full contents of `app/admin/bookings/BookingReviewCard.test.tsx` with:

```tsx
import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingReviewCard } from './BookingReviewCard'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const baseBooking: BookingResult = {
  id: 'b-1',
  cleaner_name: 'Sarah M.',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: '2026-06-15',
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '12 Rothschild Blvd, Tel Aviv',
  status: 'pending',
  customer_name: 'Maya Cohen',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

describe('BookingReviewCard', () => {
  it('renders who requested whom', () => {
    render(<BookingReviewCard booking={baseBooking} />)

    expect(screen.getByText('Maya Cohen requested Sarah M.')).toBeInTheDocument()
  })

  it('renders date, time, duration and address', () => {
    render(<BookingReviewCard booking={baseBooking} />)

    expect(screen.getByText(/Jun 15, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText(/2 hrs/)).toBeInTheDocument()
    expect(screen.getByText(/12 Rothschild Blvd, Tel Aviv/)).toBeInTheDocument()
  })

  it.each(Object.entries(STATUS_LABEL) as [BookingStatus, string][])(
    'renders the %s status badge and no Approve/Deny buttons',
    (status, label) => {
      render(<BookingReviewCard booking={{ ...baseBooking, status }} />)

      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
    }
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest app/admin/bookings/BookingReviewCard.test.tsx`

Expected: FAIL — the `pending` case of the `it.each` fails because the current component still renders Approve/Deny buttons for `status === 'pending'`.

- [ ] **Step 3: Implement — remove Approve/Deny from `BookingReviewCard.tsx`**

Replace the full contents of `app/admin/bookings/BookingReviewCard.tsx` with:

```tsx
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const STATUS_ACCENT: Record<BookingStatus, string> = {
  pending: 'border-t-yellow-400',
  accepted: 'border-t-green-400',
  declined: 'border-t-red-400',
  completed: 'border-t-blue-400',
  cancelled: 'border-t-gray-300',
}

const SERVICE_BADGE: Record<BookingResult['service_type'], string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Props = {
  booking: BookingResult
}

export function BookingReviewCard({ booking }: Props) {
  const { t } = useLanguage()
  const initial = booking.cleaner_name.charAt(0).toUpperCase()

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-t-4 ${STATUS_ACCENT[booking.status]} hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          {booking.cleaner_avatar_url ? (
            <img
              src={booking.cleaner_avatar_url}
              alt={booking.cleaner_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
              {initial}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">
              {t('admin.bookings.requestedBy', { customer: booking.customer_name ?? '', cleaner: booking.cleaner_name })}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(booking.scheduled_date)} · {booking.scheduled_start} · {booking.duration_hours} {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap ${STATUS_BADGE[booking.status]}`}>
          {t(`bookingCard.status.${booking.status}`)}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3">📍 {booking.address}</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[booking.service_type]}`}>
          {t(`common.${booking.service_type}`)}
        </span>
      </div>

      {booking.notes && (
        <p className="text-sm text-gray-500 italic">"{booking.notes}"</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest app/admin/bookings/BookingReviewCard.test.tsx`

Expected: PASS (all 7 cases — 2 fixed tests + 5 `it.each` cases).

- [ ] **Step 5: Update `app/admin/bookings/page.tsx` to drop the status-update handler**

Replace the full contents of `app/admin/bookings/page.tsx` with:

```tsx
// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from '../Nav'
import { BookingReviewCard } from './BookingReviewCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_BOOKINGS } from '@/lib/mockData/bookings'
import { getAllBookings } from '@/lib/mockBookingsStore'
import type { BookingResult } from '@/lib/types/booking'

export default function AdminBookingsPage() {
  const { t } = useLanguage()
  const [bookings, setBookings] = useState<BookingResult[]>(MOCK_BOOKINGS)

  useEffect(() => {
    setBookings(getAllBookings())
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.bookings.title')}</h1>

        {bookings.length === 0 && (
          <p className="text-gray-500 text-sm">{t('admin.bookings.empty')}</p>
        )}

        {bookings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map(booking => (
              <BookingReviewCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Update `app/admin/bookings/page.test.tsx`**

Replace the full contents of `app/admin/bookings/page.test.tsx` with:

```tsx
import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminBookingsPage from './page'

describe('AdminBookingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the existing mock bookings with who requested whom', () => {
    render(<AdminBookingsPage />)

    expect(screen.getByText('Maya Cohen requested Sarah M.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run the admin bookings suite to verify it passes**

Run: `npx jest app/admin/bookings`

Expected: PASS (8 tests total: 7 in `BookingReviewCard.test.tsx` + 1 in `page.test.tsx`).

- [ ] **Step 8: Remove the now-unused `admin.bookings.approve`/`admin.bookings.deny` i18n keys**

In `lib/i18n/translations.ts`, in the `en.admin.bookings` object, change:

```ts
      bookings: {
        title: 'Booking Requests',
        empty: 'No booking requests yet.',
        approve: 'Approve',
        deny: 'Deny',
        requestedBy: '{customer} requested {cleaner}',
      },
```

to:

```ts
      bookings: {
        title: 'Booking Requests',
        empty: 'No booking requests yet.',
        requestedBy: '{customer} requested {cleaner}',
      },
```

In the `he.admin.bookings` object, change:

```ts
      bookings: {
        title: 'בקשות הזמנה',
        empty: 'אין בקשות הזמנה עדיין.',
        approve: 'אישור',
        deny: 'דחייה',
        requestedBy: '{customer} ביקש/ה את {cleaner}',
      },
```

to:

```ts
      bookings: {
        title: 'בקשות הזמנה',
        empty: 'אין בקשות הזמנה עדיין.',
        requestedBy: '{customer} ביקש/ה את {cleaner}',
      },
```

- [ ] **Step 9: Run the full suite and tsc to confirm nothing broke**

Run: `npx jest`

Expected: All suites PASS.

Run: `npx tsc --noEmit`

Expected: Clean aside from the pre-existing excluded `middleware.ts` issue.

- [ ] **Step 10: Commit**

```bash
git add app/admin/bookings/BookingReviewCard.tsx app/admin/bookings/BookingReviewCard.test.tsx app/admin/bookings/page.tsx app/admin/bookings/page.test.tsx lib/i18n/translations.ts
git commit -m "refactor: make admin booking review read-only"
```

---

## Task 4: `CleanerBookingCard` component

**Files:**
- Create: `app/(cleaner)/dashboard/CleanerBookingCard.tsx`
- Test: `app/(cleaner)/dashboard/CleanerBookingCard.test.tsx`
- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing test file**

Create `app/(cleaner)/dashboard/CleanerBookingCard.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CleanerBookingCard } from './CleanerBookingCard'
import type { BookingResult } from '@/lib/types/booking'

const baseBooking: BookingResult = {
  id: 'b-1',
  cleaner_name: 'Sarah M.',
  cleaner_avatar_url: null,
  service_type: 'residential',
  scheduled_date: '2026-06-15',
  scheduled_start: '09:00',
  duration_hours: 2,
  address: '12 Rothschild Blvd, Tel Aviv',
  status: 'pending',
  customer_name: 'Maya Cohen',
  customer_email: 'maya.cohen@example.com',
  customer_phone: '050-111-1111',
}

describe('CleanerBookingCard', () => {
  it('renders customer name, date, time, duration, address and service badge', () => {
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={jest.fn()} />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.getByText(/Jun 15, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText(/2 hrs/)).toBeInTheDocument()
    expect(screen.getByText(/12 Rothschild Blvd, Tel Aviv/)).toBeInTheDocument()
    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('shows Accept/Deny buttons for pending bookings', () => {
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={jest.fn()} />)

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument()
  })

  it('calls onUpdateStatus with "accepted" when Accept is clicked', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={onUpdateStatus} />)

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('b-1', 'accepted')
  })

  it('calls onUpdateStatus with "declined" when Deny is clicked', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<CleanerBookingCard booking={baseBooking} onUpdateStatus={onUpdateStatus} />)

    await user.click(screen.getByRole('button', { name: 'Deny' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('b-1', 'declined')
  })

  it('shows customer contact info and no buttons for accepted bookings', () => {
    render(<CleanerBookingCard booking={{ ...baseBooking, status: 'accepted' }} onUpdateStatus={jest.fn()} />)

    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText(/050-111-1111/)).toBeInTheDocument()
    expect(screen.getByText(/maya.cohen@example.com/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
  })

  it('shows only a status badge for declined bookings', () => {
    render(<CleanerBookingCard booking={{ ...baseBooking, status: 'declined' }} onUpdateStatus={jest.fn()} />)

    expect(screen.getByText('Declined')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
    expect(screen.queryByText(/050-111-1111/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest app/\(cleaner\)/dashboard/CleanerBookingCard.test.tsx`

Expected: FAIL with "Cannot find module './CleanerBookingCard'".

- [ ] **Step 3: Add `dashboard.accept`/`dashboard.deny` i18n keys**

In `lib/i18n/translations.ts`, in the `en` object, add a new top-level `dashboard` key. Insert it right after the `admin` block closes (after the closing `},` of `admin: { ... }`, before `profile: {`):

```ts
    dashboard: {
      title: 'My Booking Requests',
      empty: 'No booking requests yet.',
      accept: 'Accept',
      deny: 'Deny',
    },
```

In the `he` object, add the matching block in the same position (after `admin: { ... }`, before `profile: {`):

```ts
    dashboard: {
      title: 'בקשות ההזמנה שלי',
      empty: 'אין בקשות הזמנה עדיין.',
      accept: 'קבל',
      deny: 'דחה',
    },
```

- [ ] **Step 4: Implement `CleanerBookingCard.tsx`**

Create `app/(cleaner)/dashboard/CleanerBookingCard.tsx`:

```tsx
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const STATUS_ACCENT: Record<BookingStatus, string> = {
  pending: 'border-t-yellow-400',
  accepted: 'border-t-green-400',
  declined: 'border-t-red-400',
  completed: 'border-t-blue-400',
  cancelled: 'border-t-gray-300',
}

const SERVICE_BADGE: Record<BookingResult['service_type'], string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Props = {
  booking: BookingResult
  onUpdateStatus: (id: string, status: 'accepted' | 'declined') => void
}

export function CleanerBookingCard({ booking, onUpdateStatus }: Props) {
  const { t } = useLanguage()
  const initial = (booking.customer_name ?? '?').charAt(0).toUpperCase()

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-t-4 ${STATUS_ACCENT[booking.status]} hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <div>
            <p className="font-bold text-gray-900">{booking.customer_name}</p>
            <p className="text-sm text-gray-500">
              {formatDate(booking.scheduled_date)} · {booking.scheduled_start} · {booking.duration_hours} {t(booking.duration_hours !== 1 ? 'bookingCard.hours' : 'bookingCard.hour')}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap ${STATUS_BADGE[booking.status]}`}>
          {t(`bookingCard.status.${booking.status}`)}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3">📍 {booking.address}</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[booking.service_type]}`}>
          {t(`common.${booking.service_type}`)}
        </span>
      </div>

      {booking.notes && (
        <p className="text-sm text-gray-500 italic mb-3">"{booking.notes}"</p>
      )}

      {booking.status === 'pending' && (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onUpdateStatus(booking.id, 'declined')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('dashboard.deny')}
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(booking.id, 'accepted')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('dashboard.accept')}
          </button>
        </div>
      )}

      {booking.status === 'accepted' && booking.customer_phone && booking.customer_email && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('bookingCard.contact.title')}</p>
          <p>{t('bookingCard.contact.phone')}: {booking.customer_phone}</p>
          <p>{t('bookingCard.contact.email')}: {booking.customer_email}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest app/\(cleaner\)/dashboard/CleanerBookingCard.test.tsx`

Expected: PASS (all 6 tests).

- [ ] **Step 6: Commit**

```bash
git add app/\(cleaner\)/dashboard/CleanerBookingCard.tsx app/\(cleaner\)/dashboard/CleanerBookingCard.test.tsx lib/i18n/translations.ts
git commit -m "feat: add CleanerBookingCard for the cleaner dashboard"
```

---

## Task 5: Cleaner dashboard `Nav` + `/dashboard` page

**Files:**
- Create: `app/(cleaner)/dashboard/Nav.tsx`
- Test: `app/(cleaner)/dashboard/Nav.test.tsx`
- Create: `app/(cleaner)/dashboard/page.tsx`
- Test: `app/(cleaner)/dashboard/page.test.tsx`

- [ ] **Step 1: Write the failing `Nav` test**

Create `app/(cleaner)/dashboard/Nav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Nav } from './Nav'

describe('Nav', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the brand and a language toggle', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByText('✨ Clean Cleaner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'עברית' })).toBeInTheDocument()
  })

  it('switches the language toggle label to English when clicked', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest app/\(cleaner\)/dashboard/Nav.test.tsx`

Expected: FAIL with "Cannot find module './Nav'".

- [ ] **Step 3: Implement `Nav.tsx`**

Create `app/(cleaner)/dashboard/Nav.tsx`:

```tsx
'use client'
import { LanguageToggle } from '@/lib/i18n/LanguageToggle'

export function Nav() {
  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 flex justify-between items-center shadow-md">
      <span className="font-bold text-lg">✨ Clean Cleaner</span>
      <LanguageToggle />
    </nav>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest app/\(cleaner\)/dashboard/Nav.test.tsx`

Expected: PASS (both tests).

- [ ] **Step 5: Write the failing `page` test**

Create `app/(cleaner)/dashboard/page.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CleanerDashboardPage from './page'
import { getAllBookings } from '@/lib/mockBookingsStore'

describe('CleanerDashboardPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows only bookings for Sarah M.', () => {
    render(<CleanerDashboardPage />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.queryByText(/8 HaArba'a St, Tel Aviv/)).not.toBeInTheDocument()
  })

  it('accepts a pending booking and persists the new status', async () => {
    const user = userEvent.setup()
    render(<CleanerDashboardPage />)

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(getAllBookings().find(b => b.id === '1')?.status).toBe('accepted')
  })

  it('declines a pending booking and persists the new status', async () => {
    const user = userEvent.setup()
    render(<CleanerDashboardPage />)

    await user.click(screen.getByRole('button', { name: 'Deny' }))

    expect(getAllBookings().find(b => b.id === '1')?.status).toBe('declined')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx jest app/\(cleaner\)/dashboard/page.test.tsx`

Expected: FAIL with "Cannot find module './page'".

- [ ] **Step 7: Add `dashboard.title`/`dashboard.empty` (already added in Task 4, Step 3 — verify present)**

Confirm `lib/i18n/translations.ts` already has the `dashboard: { title, empty, accept, deny }` blocks for both `en` and `he` from Task 4. No further i18n change needed here.

- [ ] **Step 8: Implement `page.tsx`**

Create `app/(cleaner)/dashboard/page.tsx`:

```tsx
// PREVIEW MOCK — hardcoded as Sarah M. (id '1') for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from './Nav'
import { CleanerBookingCard } from './CleanerBookingCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_BOOKINGS } from '@/lib/mockData/bookings'
import { getAllBookings, updateBookingStatus } from '@/lib/mockBookingsStore'
import type { BookingResult } from '@/lib/types/booking'

const CLEANER_NAME = 'Sarah M.'

export default function CleanerDashboardPage() {
  const { t } = useLanguage()
  const [bookings, setBookings] = useState<BookingResult[]>(
    MOCK_BOOKINGS.filter(b => b.cleaner_name === CLEANER_NAME)
  )

  useEffect(() => {
    setBookings(getAllBookings().filter(b => b.cleaner_name === CLEANER_NAME))
  }, [])

  function handleUpdateStatus(id: string, status: 'accepted' | 'declined') {
    updateBookingStatus(id, status)
    setBookings(getAllBookings().filter(b => b.cleaner_name === CLEANER_NAME))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.title')}</h1>

        {bookings.length === 0 && (
          <p className="text-gray-500 text-sm">{t('dashboard.empty')}</p>
        )}

        {bookings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map(booking => (
              <CleanerBookingCard key={booking.id} booking={booking} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx jest app/\(cleaner\)/dashboard/page.test.tsx`

Expected: PASS (all 3 tests).

- [ ] **Step 10: Run the full suite and tsc**

Run: `npx jest`

Expected: All suites PASS.

Run: `npx tsc --noEmit`

Expected: Clean aside from the pre-existing excluded `middleware.ts` issue.

- [ ] **Step 11: Commit**

```bash
git add app/\(cleaner\)/dashboard/Nav.tsx app/\(cleaner\)/dashboard/Nav.test.tsx app/\(cleaner\)/dashboard/page.tsx app/\(cleaner\)/dashboard/page.test.tsx
git commit -m "feat: add cleaner dashboard for accepting/declining bookings"
```

---

## Task 6: Full verification

**Files:** none (verification only, plus memory updates outside the repo)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`

Expected: All suites PASS (the suite count grows by: 1 BookingCard test file +2 tests, BookingReviewCard.test.tsx rewritten to 7 tests, page.test.tsx down to 1 test, +2 new test files for CleanerBookingCard (6 tests), Nav (2 tests) and dashboard page (3 tests)).

- [ ] **Step 2: Run tsc**

Run: `npx tsc --noEmit`

Expected: Clean aside from the pre-existing excluded `middleware.ts` issue.

- [ ] **Step 3: Hebrew/RTL spot-check via temporary jsdom render**

Create a temporary file `app/(cleaner)/dashboard/__rtl-check.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CleanerDashboardPage from './page'
import { BookingCard } from '@/app/(customer)/bookings/BookingCard'
import { BookingReviewCard } from '@/app/admin/bookings/BookingReviewCard'
import type { BookingResult } from '@/lib/types/booking'

describe('RTL spot-check', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the cleaner dashboard in Hebrew', async () => {
    const user = userEvent.setup()
    render(<CleanerDashboardPage />)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByText('בקשות ההזמנה שלי')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'קבל' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'דחה' })).toBeInTheDocument()
  })

  it('renders accepted-booking contact info in Hebrew on BookingCard', async () => {
    const user = userEvent.setup()
    const booking: BookingResult = {
      id: 'b-1',
      cleaner_name: 'Sarah M.',
      cleaner_avatar_url: null,
      service_type: 'residential',
      scheduled_date: '2026-06-15',
      scheduled_start: '09:00',
      duration_hours: 2,
      address: '12 Rothschild Blvd, Tel Aviv',
      status: 'accepted',
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
    }
    render(<BookingCard booking={booking} />)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByText('פרטי קשר')).toBeInTheDocument()
    expect(screen.getByText(/טלפון/)).toBeInTheDocument()
    expect(screen.getByText(/אימייל/)).toBeInTheDocument()
  })

  it('renders BookingReviewCard status badges in Hebrew with no buttons', async () => {
    const user = userEvent.setup()
    const booking: BookingResult = {
      id: 'b-1',
      cleaner_name: 'Sarah M.',
      cleaner_avatar_url: null,
      service_type: 'residential',
      scheduled_date: '2026-06-15',
      scheduled_start: '09:00',
      duration_hours: 2,
      address: '12 Rothschild Blvd, Tel Aviv',
      status: 'pending',
      customer_name: 'Maya Cohen',
    }
    render(<BookingReviewCard booking={booking} />)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByText('בהמתנה')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'אישור' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'דחייה' })).not.toBeInTheDocument()
  })
})
```

Run: `npx jest app/\(cleaner\)/dashboard/__rtl-check.test.tsx`

Expected: PASS (all 3 tests). If any text doesn't match, fix the relevant translation in `lib/i18n/translations.ts` and re-run.

- [ ] **Step 4: Delete the temporary RTL check file**

```bash
rm "app/(cleaner)/dashboard/__rtl-check.test.tsx"
```

- [ ] **Step 5: Dev-server smoke check**

```bash
pkill -f "next dev" || true
pkill -f "next-server" || true
```

```bash
rm -rf .next
```

```bash
nohup npm run dev > /tmp/next-dev.log 2>&1 & disown
```

Wait ~8 seconds, then:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/bookings
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/bookings
```

Expected: `200` for all three.

- [ ] **Step 6: Update memory**

Update `/home/meron/.claude/projects/-home-meron/memory/project_proj_clean_customer_branch.md`: add a new section describing this Phase 1 work (cleaner dashboard at `/dashboard` hardcoded to Sarah M., contact-info reveal on accepted bookings, admin bookings now read-only), and note the new test/suite counts. Update `/home/meron/.claude/projects/-home-meron/memory/MEMORY.md`'s pointer line to reflect the current branch state in one line.

No commit for this step — memory files are outside the git repo.

---

## Spec Coverage Check

- Cleaner dashboard `/dashboard`, Sarah M. (`id: '1'`), all statuses, Accept/Deny → Task 4 + Task 5 ✅
- Customer `/bookings` contact reveal inline on accepted bookings → Task 2 ✅
- Cleaner dashboard contact reveal inline on accepted bookings → Task 4 ✅
- Admin `/admin/bookings` read-only, Approve/Deny removed → Task 3 ✅
- Data model changes (`CleanerResult.email/phone`, `BookingResult.*_email/*_phone`, seed data, `BookingRequestForm`) → Task 1 ✅
- i18n additions (`dashboard.*`, `bookingCard.contact.*`) EN+HE → Tasks 2 & 4 ✅
- Removal of unused `admin.bookings.approve`/`deny` → Task 3 ✅
- Full suite + tsc + Hebrew/RTL spot-check + dev-server smoke check → Task 6 ✅
- Out of scope (Phase 2 admin customer/cleaner management pages) → not in this plan, as designed ✅
