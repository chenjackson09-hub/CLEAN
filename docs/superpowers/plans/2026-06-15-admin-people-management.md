# Admin People Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two admin list views — `/admin/cleaners` and `/admin/customers` — where the admin can view all cleaners/customers, write a free-text note about each, and remove them from the list.

**Architecture:** A small generic `lib/mockAdminOverridesStore.ts` (localStorage-backed, parameterized by `kind: 'cleaners' | 'customers'`) holds per-person `{ removed?, notes? }` overrides. Each admin page applies these overrides to its seed data (`MOCK_CLEANERS` / new `MOCK_CUSTOMERS`) via a shared `applyOverrides()` helper, then renders a grid of list cards (`CleanerListCard` / `CustomerListCard`) that expose a notes textarea + Save button and a Delete button with a confirm dialog.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS (RTL-safe utilities), Jest + `@testing-library/react` + `@testing-library/user-event`, `lib/i18n` translations (EN/HE).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `lib/types/customer.ts` | Create | `CustomerResult` type |
| `lib/mockData/customers.ts` | Create | Seeded customer list (`MOCK_CUSTOMERS`) |
| `lib/mockAdminOverridesStore.ts` | Create | Generic localStorage store for delete/notes overrides |
| `lib/mockAdminOverridesStore.test.ts` | Create | Tests for the overrides store |
| `lib/i18n/translations.ts` | Modify | Add `adminNav.cleaners/customers`, `admin.cleaners.*`, `admin.customers.*`, `admin.shared.*` (EN+HE) |
| `app/admin/Nav.tsx` | Modify | Add "Cleaners" and "Customers" links |
| `app/admin/Nav.test.tsx` | Modify | Cover the two new links |
| `app/admin/cleaners/CleanerListCard.tsx` | Create | Card: cleaner info + notes + delete |
| `app/admin/cleaners/CleanerListCard.test.tsx` | Create | Tests for `CleanerListCard` |
| `app/admin/cleaners/page.tsx` | Create | `/admin/cleaners` list page |
| `app/admin/cleaners/page.test.tsx` | Create | Tests for the cleaners list page |
| `app/admin/customers/CustomerListCard.tsx` | Create | Card: customer info + notes + delete |
| `app/admin/customers/CustomerListCard.test.tsx` | Create | Tests for `CustomerListCard` |
| `app/admin/customers/page.tsx` | Create | `/admin/customers` list page |
| `app/admin/customers/page.test.tsx` | Create | Tests for the customers list page |

---

### Task 1: Customer type, seed data, and admin overrides store

**Files:**
- Create: `lib/types/customer.ts`
- Create: `lib/mockData/customers.ts`
- Create: `lib/mockAdminOverridesStore.ts`
- Test: `lib/mockAdminOverridesStore.test.ts`

- [ ] **Step 1: Write the failing test for the overrides store**

Create `lib/mockAdminOverridesStore.test.ts`:

```ts
import { getOverrides, setNotes, removePerson, applyOverrides } from './mockAdminOverridesStore'

describe('mockAdminOverridesStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  const seed = [
    { id: '1', full_name: 'Alice' },
    { id: '2', full_name: 'Bob' },
  ]

  describe('getOverrides', () => {
    it('returns an empty object when nothing is stored', () => {
      expect(getOverrides('cleaners')).toEqual({})
    })
  })

  describe('setNotes', () => {
    it('stores notes for a person', () => {
      setNotes('cleaners', '1', 'Great cleaner')
      expect(getOverrides('cleaners')).toEqual({ '1': { notes: 'Great cleaner' } })
    })

    it('merges with an existing removed flag without clobbering it', () => {
      removePerson('cleaners', '1')
      setNotes('cleaners', '1', 'Great cleaner')
      expect(getOverrides('cleaners')).toEqual({ '1': { removed: true, notes: 'Great cleaner' } })
    })
  })

  describe('removePerson', () => {
    it('marks a person as removed', () => {
      removePerson('customers', '2')
      expect(getOverrides('customers')).toEqual({ '2': { removed: true } })
    })

    it('merges with existing notes without clobbering them', () => {
      setNotes('customers', '2', 'Frequent customer')
      removePerson('customers', '2')
      expect(getOverrides('customers')).toEqual({ '2': { notes: 'Frequent customer', removed: true } })
    })
  })

  describe('applyOverrides', () => {
    it('attaches adminNotes defaulting to an empty string', () => {
      expect(applyOverrides('cleaners', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: '' },
        { id: '2', full_name: 'Bob', adminNotes: '' },
      ])
    })

    it('attaches stored notes as adminNotes', () => {
      setNotes('cleaners', '1', 'Great cleaner')
      expect(applyOverrides('cleaners', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: 'Great cleaner' },
        { id: '2', full_name: 'Bob', adminNotes: '' },
      ])
    })

    it('filters out removed entries', () => {
      removePerson('cleaners', '2')
      expect(applyOverrides('cleaners', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: '' },
      ])
    })

    it('keeps overrides for different kinds separate', () => {
      removePerson('cleaners', '1')
      expect(applyOverrides('customers', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: '' },
        { id: '2', full_name: 'Bob', adminNotes: '' },
      ])
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest lib/mockAdminOverridesStore.test.ts`
Expected: FAIL — `Cannot find module './mockAdminOverridesStore'`

- [ ] **Step 3: Create the customer type**

Create `lib/types/customer.ts`:

```ts
export type CustomerResult = {
  id: string
  full_name: string
  email: string
  phone: string
  address: string
}
```

- [ ] **Step 4: Create the seeded customer list**

Create `lib/mockData/customers.ts`:

```ts
import type { CustomerResult } from '@/lib/types/customer'

export const MOCK_CUSTOMERS: CustomerResult[] = [
  { id: '1', full_name: 'Maya Cohen', email: 'maya.cohen@example.com', phone: '050-111-1111', address: '12 Rothschild Blvd, Tel Aviv' },
  { id: '2', full_name: 'Noa Shapira', email: 'noa.shapira@example.com', phone: '052-444-7777', address: "8 HaArba'a St, Tel Aviv" },
  { id: '3', full_name: 'Itai Ben-David', email: 'itai.bendavid@example.com', phone: '054-888-2222', address: '45 Dizengoff St, Tel Aviv' },
  { id: '4', full_name: 'Shira Azulay', email: 'shira.azulay@example.com', phone: '050-666-3333', address: '3 Herzl St, Herzliya' },
  { id: '5', full_name: 'Roni Levi', email: 'roni.levi@example.com', phone: '053-222-9999', address: '21 Allenby St, Tel Aviv' },
]
```

Note: "Maya Cohen" (id `1`) matches the customer used throughout `lib/mockData/bookings.ts` and `app/(customer)/profile/page.tsx`, so the seed lines up with existing booking/profile data.

- [ ] **Step 5: Implement the overrides store**

Create `lib/mockAdminOverridesStore.ts`:

```ts
export type PersonKind = 'cleaners' | 'customers'

type Override = {
  removed?: boolean
  notes?: string
}

type OverridesMap = Record<string, Override>

function storageKey(kind: PersonKind): string {
  return `clean_admin_overrides_${kind}`
}

export function getOverrides(kind: PersonKind): OverridesMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(storageKey(kind))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveOverrides(kind: PersonKind, overrides: OverridesMap): void {
  window.localStorage.setItem(storageKey(kind), JSON.stringify(overrides))
}

export function setNotes(kind: PersonKind, id: string, notes: string): void {
  const overrides = getOverrides(kind)
  overrides[id] = { ...overrides[id], notes }
  saveOverrides(kind, overrides)
}

export function removePerson(kind: PersonKind, id: string): void {
  const overrides = getOverrides(kind)
  overrides[id] = { ...overrides[id], removed: true }
  saveOverrides(kind, overrides)
}

export function applyOverrides<T extends { id: string }>(kind: PersonKind, seed: T[]): (T & { adminNotes: string })[] {
  const overrides = getOverrides(kind)

  return seed
    .filter(person => !overrides[person.id]?.removed)
    .map(person => ({ ...person, adminNotes: overrides[person.id]?.notes ?? '' }))
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest lib/mockAdminOverridesStore.test.ts`
Expected: PASS — 6 tests passing

- [ ] **Step 7: Commit**

```bash
git add lib/types/customer.ts lib/mockData/customers.ts lib/mockAdminOverridesStore.ts lib/mockAdminOverridesStore.test.ts
git commit -m "feat: add customer type, mock data, and admin overrides store"
```

---

### Task 2: i18n additions (EN/HE)

**Files:**
- Modify: `lib/i18n/translations.ts`

- [ ] **Step 1: Add `adminNav.cleaners`/`adminNav.customers` (EN)**

In `lib/i18n/translations.ts`, within `en.adminNav` (currently lines 10-13):

```ts
    adminNav: {
      applications: 'Applications',
      bookings: 'Booking Requests',
      cleaners: 'Cleaners',
      customers: 'Customers',
    },
```

- [ ] **Step 2: Add `admin.cleaners`, `admin.customers`, `admin.shared` (EN)**

In `lib/i18n/translations.ts`, within `en.admin` (currently lines 98-116), add two new sibling sections after `bookings`:

```ts
    admin: {
      applications: {
        title: 'Cleaner Applications',
        empty: 'No applications yet.',
        approve: 'Approve',
        reject: 'Reject',
        submitted: 'Submitted',
        status: {
          pending: 'Pending',
          approved: 'Approved',
          rejected: 'Rejected',
        },
      },
      bookings: {
        title: 'Booking Requests',
        empty: 'No booking requests yet.',
        requestedBy: '{customer} requested {cleaner}',
      },
      cleaners: {
        title: 'Cleaners',
        empty: 'No cleaners yet.',
      },
      customers: {
        title: 'Customers',
        empty: 'No customers yet.',
      },
      shared: {
        notes: 'Admin Notes',
        notesPlaceholder: 'Write a note about this person...',
        save: 'Save',
        saved: '✅ Saved',
        delete: 'Delete',
        confirmDelete: 'Remove this person from the list?',
      },
    },
```

- [ ] **Step 3: Add `adminNav.cleaners`/`adminNav.customers` (HE)**

In `lib/i18n/translations.ts`, within `he.adminNav` (currently lines 212-215):

```ts
    adminNav: {
      applications: 'בקשות הצטרפות',
      bookings: 'בקשות הזמנה',
      cleaners: 'מנקים',
      customers: 'לקוחות',
    },
```

- [ ] **Step 4: Add `admin.cleaners`, `admin.customers`, `admin.shared` (HE)**

In `lib/i18n/translations.ts`, within `he.admin` (currently lines 300-318), add the same two new sibling sections after `bookings`:

```ts
    admin: {
      applications: {
        title: 'בקשות הצטרפות מנקים',
        empty: 'אין בקשות עדיין.',
        approve: 'אישור',
        reject: 'דחייה',
        submitted: 'הוגש',
        status: {
          pending: 'בהמתנה',
          approved: 'אושר',
          rejected: 'נדחה',
        },
      },
      bookings: {
        title: 'בקשות הזמנה',
        empty: 'אין בקשות הזמנה עדיין.',
        requestedBy: '{customer} ביקש/ה את {cleaner}',
      },
      cleaners: {
        title: 'מנקים',
        empty: 'אין מנקים עדיין.',
      },
      customers: {
        title: 'לקוחות',
        empty: 'אין לקוחות עדיין.',
      },
      shared: {
        notes: 'הערות מנהל',
        notesPlaceholder: 'כתבו הערה על האדם הזה...',
        save: 'שמירה',
        saved: '✅ נשמר',
        delete: 'הסרה',
        confirmDelete: 'להסיר את האדם הזה מהרשימה?',
      },
    },
```

- [ ] **Step 5: Verify the file still type-checks**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `middleware.ts(42,17)` error (no new errors)

- [ ] **Step 6: Commit**

```bash
git add lib/i18n/translations.ts
git commit -m "feat: add admin people management i18n keys"
```

---

### Task 3: Admin Nav — add Cleaners and Customers links

**Files:**
- Modify: `app/admin/Nav.tsx`
- Modify: `app/admin/Nav.test.tsx`

- [ ] **Step 1: Write the failing test assertions**

Replace `app/admin/Nav.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Nav } from './Nav'

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/bookings',
}))

describe('Nav', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders links for applications, booking requests, cleaners, and customers', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'Booking Requests' })).toHaveAttribute('href', '/admin/bookings')
    expect(screen.getByRole('link', { name: 'Cleaners' })).toHaveAttribute('href', '/admin/cleaners')
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/admin/customers')
  })

  it('highlights the current page', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Booking Requests' }).className).toContain('underline')
  })

  it('switches all links to Hebrew when the language is toggled', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByRole('link', { name: 'בקשות הצטרפות' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'בקשות הזמנה' })).toHaveAttribute('href', '/admin/bookings')
    expect(screen.getByRole('link', { name: 'מנקים' })).toHaveAttribute('href', '/admin/cleaners')
    expect(screen.getByRole('link', { name: 'לקוחות' })).toHaveAttribute('href', '/admin/customers')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest app/admin/Nav.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link" and name "Cleaners"`

- [ ] **Step 3: Add the two new links to the Nav**

In `app/admin/Nav.tsx`, update the `links` array:

```tsx
  const links = [
    { href: '/admin/applications', label: t('adminNav.applications') },
    { href: '/admin/bookings', label: t('adminNav.bookings') },
    { href: '/admin/cleaners', label: t('adminNav.cleaners') },
    { href: '/admin/customers', label: t('adminNav.customers') },
  ]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest app/admin/Nav.test.tsx`
Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/admin/Nav.tsx app/admin/Nav.test.tsx
git commit -m "feat: add Cleaners and Customers links to admin nav"
```

---

### Task 4: Admin Cleaners list page

**Files:**
- Create: `app/admin/cleaners/CleanerListCard.tsx`
- Test: `app/admin/cleaners/CleanerListCard.test.tsx`
- Create: `app/admin/cleaners/page.tsx`
- Test: `app/admin/cleaners/page.test.tsx`

- [ ] **Step 1: Write the failing test for `CleanerListCard`**

Create `app/admin/cleaners/CleanerListCard.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CleanerListCard } from './CleanerListCard'
import type { CleanerResult } from '@/lib/types/cleaner'

const cleaner: CleanerResult & { adminNotes: string } = {
  id: '1',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough.',
  service_types: ['residential'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
  area: 'Tel Aviv',
  email: 'sarah.m@example.com',
  phone: '050-222-1111',
  adminNotes: '',
}

describe('CleanerListCard', () => {
  it('renders cleaner info', () => {
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={jest.fn()} onDelete={jest.fn()} />)

    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('sarah.m@example.com')).toBeInTheDocument()
    expect(screen.getByText('050-222-1111')).toBeInTheDocument()
    expect(screen.getByText('Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Residential')).toBeInTheDocument()
    expect(screen.getByText('₪80/hr')).toBeInTheDocument()
  })

  it('saves edited notes', async () => {
    const user = userEvent.setup()
    const onSaveNotes = jest.fn()
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={onSaveNotes} onDelete={jest.fn()} />)

    const textarea = screen.getByPlaceholderText('Write a note about this person...')
    await user.type(textarea, 'Great with pets')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveNotes).toHaveBeenCalledWith('1', 'Great with pets')
    expect(screen.getByText('✅ Saved')).toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not delete if confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest app/admin/cleaners/CleanerListCard.test.tsx`
Expected: FAIL — `Cannot find module './CleanerListCard'`

- [ ] **Step 3: Implement `CleanerListCard`**

Create `app/admin/cleaners/CleanerListCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
  both: 'bg-yellow-100 text-yellow-800',
}

type Props = {
  cleaner: CleanerResult & { adminNotes: string }
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}

export function CleanerListCard({ cleaner, onSaveNotes, onDelete }: Props) {
  const { t } = useLanguage()
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const [notes, setNotesValue] = useState(cleaner.adminNotes)
  const [saved, setSaved] = useState(false)

  const serviceLabel =
    cleaner.service_types.includes('residential') && cleaner.service_types.includes('commercial')
      ? 'both'
      : cleaner.service_types[0] ?? 'residential'

  function handleSave() {
    onSaveNotes(cleaner.id, notes)
    setSaved(true)
  }

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) {
      onDelete(cleaner.id)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <div>
            <p className="font-bold text-gray-900">{cleaner.full_name}</p>
            <p className="text-sm text-gray-500">{t('common.yearsExp', { years: cleaner.years_experience })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
        >
          {t('admin.shared.delete')}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">📍 {cleaner.area}</span>
      </div>

      <p className="text-sm text-gray-600 mb-1">✉️ {cleaner.email}</p>
      <p className="text-sm text-gray-600 mb-3">📞 {cleaner.phone}</p>

      <p className="font-bold text-gray-900 mb-3">₪{cleaner.hourly_rate}{t('common.perHour')}</p>

      <div className="border-t border-gray-100 pt-3">
        <label htmlFor={`cleaner-notes-${cleaner.id}`} className="block text-xs font-semibold text-gray-500 mb-1">
          {t('admin.shared.notes')}
        </label>
        <textarea
          id={`cleaner-notes-${cleaner.id}`}
          value={notes}
          onChange={e => {
            setNotesValue(e.target.value)
            setSaved(false)
          }}
          placeholder={t('admin.shared.notesPlaceholder')}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 text-start"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('admin.shared.save')}
          </button>
          {saved && <span className="text-sm text-green-600">{t('admin.shared.saved')}</span>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest app/admin/cleaners/CleanerListCard.test.tsx`
Expected: PASS — 4 tests passing

- [ ] **Step 5: Write the failing test for the cleaners list page**

Create `app/admin/cleaners/page.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminCleanersPage from './page'
import { getOverrides } from '@/lib/mockAdminOverridesStore'

describe('AdminCleanersPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('lists seeded cleaners', () => {
    render(<AdminCleanersPage />)

    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('David K.')).toBeInTheDocument()
  })

  it('persists a deleted cleaner across reload', async () => {
    const user = userEvent.setup()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    const { unmount } = render(<AdminCleanersPage />)

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(screen.queryByText('Sarah M.')).not.toBeInTheDocument()

    unmount()
    render(<AdminCleanersPage />)

    expect(screen.queryByText('Sarah M.')).not.toBeInTheDocument()
    expect(getOverrides('cleaners')['1']).toEqual({ removed: true })
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx jest app/admin/cleaners/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 7: Implement the cleaners list page**

Create `app/admin/cleaners/page.tsx`:

```tsx
// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from '../Nav'
import { CleanerListCard } from './CleanerListCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_CLEANERS } from '@/lib/mockData/cleaners'
import { applyOverrides, setNotes, removePerson } from '@/lib/mockAdminOverridesStore'
import type { CleanerResult } from '@/lib/types/cleaner'

type CleanerWithNotes = CleanerResult & { adminNotes: string }

export default function AdminCleanersPage() {
  const { t } = useLanguage()
  const [cleaners, setCleaners] = useState<CleanerWithNotes[]>(() => applyOverrides('cleaners', MOCK_CLEANERS))

  useEffect(() => {
    setCleaners(applyOverrides('cleaners', MOCK_CLEANERS))
  }, [])

  function handleSaveNotes(id: string, notes: string) {
    setNotes('cleaners', id, notes)
    setCleaners(applyOverrides('cleaners', MOCK_CLEANERS))
  }

  function handleDelete(id: string) {
    removePerson('cleaners', id)
    setCleaners(applyOverrides('cleaners', MOCK_CLEANERS))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.cleaners.title')}</h1>
        {cleaners.length === 0 && (
          <p className="text-gray-500 text-sm">{t('admin.cleaners.empty')}</p>
        )}
        {cleaners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cleaners.map(cleaner => (
              <CleanerListCard key={cleaner.id} cleaner={cleaner} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx jest app/admin/cleaners`
Expected: PASS — all tests in `app/admin/cleaners/` passing (6 total)

- [ ] **Step 9: Commit**

```bash
git add app/admin/cleaners
git commit -m "feat: add admin cleaners list page"
```

---

### Task 5: Admin Customers list page

**Files:**
- Create: `app/admin/customers/CustomerListCard.tsx`
- Test: `app/admin/customers/CustomerListCard.test.tsx`
- Create: `app/admin/customers/page.tsx`
- Test: `app/admin/customers/page.test.tsx`

- [ ] **Step 1: Write the failing test for `CustomerListCard`**

Create `app/admin/customers/CustomerListCard.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CustomerListCard } from './CustomerListCard'
import type { CustomerResult } from '@/lib/types/customer'

const customer: CustomerResult & { adminNotes: string } = {
  id: '1',
  full_name: 'Maya Cohen',
  email: 'maya.cohen@example.com',
  phone: '050-111-1111',
  address: '12 Rothschild Blvd, Tel Aviv',
  adminNotes: '',
}

describe('CustomerListCard', () => {
  it('renders customer info', () => {
    render(<CustomerListCard customer={customer} onSaveNotes={jest.fn()} onDelete={jest.fn()} />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.getByText('maya.cohen@example.com')).toBeInTheDocument()
    expect(screen.getByText('050-111-1111')).toBeInTheDocument()
    expect(screen.getByText('12 Rothschild Blvd, Tel Aviv')).toBeInTheDocument()
  })

  it('saves edited notes', async () => {
    const user = userEvent.setup()
    const onSaveNotes = jest.fn()
    render(<CustomerListCard customer={customer} onSaveNotes={onSaveNotes} onDelete={jest.fn()} />)

    const textarea = screen.getByPlaceholderText('Write a note about this person...')
    await user.type(textarea, 'Prefers mornings')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveNotes).toHaveBeenCalledWith('1', 'Prefers mornings')
    expect(screen.getByText('✅ Saved')).toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CustomerListCard customer={customer} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not delete if confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CustomerListCard customer={customer} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest app/admin/customers/CustomerListCard.test.tsx`
Expected: FAIL — `Cannot find module './CustomerListCard'`

- [ ] **Step 3: Implement `CustomerListCard`**

Create `app/admin/customers/CustomerListCard.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CustomerResult } from '@/lib/types/customer'

type Props = {
  customer: CustomerResult & { adminNotes: string }
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}

export function CustomerListCard({ customer, onSaveNotes, onDelete }: Props) {
  const { t } = useLanguage()
  const initial = customer.full_name.charAt(0).toUpperCase()
  const [notes, setNotesValue] = useState(customer.adminNotes)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    onSaveNotes(customer.id, notes)
    setSaved(true)
  }

  function handleDelete() {
    if (window.confirm(t('admin.shared.confirmDelete'))) {
      onDelete(customer.id)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
          <p className="font-bold text-gray-900">{customer.full_name}</p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
        >
          {t('admin.shared.delete')}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-1">✉️ {customer.email}</p>
      <p className="text-sm text-gray-600 mb-1">📞 {customer.phone}</p>
      <p className="text-sm text-gray-600 mb-3">📍 {customer.address}</p>

      <div className="border-t border-gray-100 pt-3">
        <label htmlFor={`customer-notes-${customer.id}`} className="block text-xs font-semibold text-gray-500 mb-1">
          {t('admin.shared.notes')}
        </label>
        <textarea
          id={`customer-notes-${customer.id}`}
          value={notes}
          onChange={e => {
            setNotesValue(e.target.value)
            setSaved(false)
          }}
          placeholder={t('admin.shared.notesPlaceholder')}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg p-2 text-start"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {t('admin.shared.save')}
          </button>
          {saved && <span className="text-sm text-green-600">{t('admin.shared.saved')}</span>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest app/admin/customers/CustomerListCard.test.tsx`
Expected: PASS — 4 tests passing

- [ ] **Step 5: Write the failing test for the customers list page**

Create `app/admin/customers/page.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminCustomersPage from './page'
import { getOverrides } from '@/lib/mockAdminOverridesStore'

describe('AdminCustomersPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('lists seeded customers', () => {
    render(<AdminCustomersPage />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.getByText('Noa Shapira')).toBeInTheDocument()
  })

  it('persists a deleted customer across reload', async () => {
    const user = userEvent.setup()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    const { unmount } = render(<AdminCustomersPage />)

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(screen.queryByText('Maya Cohen')).not.toBeInTheDocument()

    unmount()
    render(<AdminCustomersPage />)

    expect(screen.queryByText('Maya Cohen')).not.toBeInTheDocument()
    expect(getOverrides('customers')['1']).toEqual({ removed: true })
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx jest app/admin/customers/page.test.tsx`
Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 7: Implement the customers list page**

Create `app/admin/customers/page.tsx`:

```tsx
// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from '../Nav'
import { CustomerListCard } from './CustomerListCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_CUSTOMERS } from '@/lib/mockData/customers'
import { applyOverrides, setNotes, removePerson } from '@/lib/mockAdminOverridesStore'
import type { CustomerResult } from '@/lib/types/customer'

type CustomerWithNotes = CustomerResult & { adminNotes: string }

export default function AdminCustomersPage() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<CustomerWithNotes[]>(() => applyOverrides('customers', MOCK_CUSTOMERS))

  useEffect(() => {
    setCustomers(applyOverrides('customers', MOCK_CUSTOMERS))
  }, [])

  function handleSaveNotes(id: string, notes: string) {
    setNotes('customers', id, notes)
    setCustomers(applyOverrides('customers', MOCK_CUSTOMERS))
  }

  function handleDelete(id: string) {
    removePerson('customers', id)
    setCustomers(applyOverrides('customers', MOCK_CUSTOMERS))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('admin.customers.title')}</h1>
        {customers.length === 0 && (
          <p className="text-gray-500 text-sm">{t('admin.customers.empty')}</p>
        )}
        {customers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map(customer => (
              <CustomerListCard key={customer.id} customer={customer} onSaveNotes={handleSaveNotes} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx jest app/admin/customers`
Expected: PASS — all tests in `app/admin/customers/` passing (6 total)

- [ ] **Step 9: Commit**

```bash
git add app/admin/customers
git commit -m "feat: add admin customers list page"
```

---

### Task 6: Full verification and RTL spot-check

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS — all suites green (previous 27 suites / 149 tests, plus new suites added in Tasks 1, 4, 5)

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `middleware.ts(42,17)` error (no new errors)

- [ ] **Step 3: Hebrew/RTL spot-check on the new pages**

Create a temporary file `app/admin/cleaners/rtl-spotcheck.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminCleanersPage from './page'

describe('AdminCleanersPage RTL spot-check', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders in Hebrew with translated labels', async () => {
    const user = userEvent.setup()
    render(<AdminCleanersPage />)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByText('מנקים')).toBeInTheDocument()
    expect(screen.getAllByText('הערות מנהל').length).toBeGreaterThan(0)
    expect(screen.getAllByText('הסרה').length).toBeGreaterThan(0)
    expect(screen.getAllByText('שמירה').length).toBeGreaterThan(0)
  })
})
```

Run: `npx jest app/admin/cleaners/rtl-spotcheck.test.tsx`
Expected: PASS

Repeat the same pattern for `app/admin/customers/` (page title `לקוחות`), then run it too.

- [ ] **Step 4: Delete the temporary spot-check files**

```bash
rm app/admin/cleaners/rtl-spotcheck.test.tsx app/admin/customers/rtl-spotcheck.test.tsx
```

- [ ] **Step 5: Confirm working tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean` (the temporary spot-check files were never committed)

---

## Self-Review Notes

- **Spec coverage:** Every section of `docs/superpowers/specs/2026-06-15-admin-people-management-design.md` maps to a task — data layer (Task 1), UI/nav (Tasks 3-5), i18n (Task 2), testing/RTL (Tasks 1, 3-6).
- **Type consistency:** `applyOverrides<T extends { id: string }>` is defined once in Task 1 and used identically (`applyOverrides('cleaners', MOCK_CLEANERS)` / `applyOverrides('customers', MOCK_CUSTOMERS)`) in Tasks 4-5. `setNotes`/`removePerson` signatures match between the store (Task 1) and both pages (Tasks 4-5).
- **No placeholders:** All code blocks are complete and copy-pasteable; all i18n keys used by components (`admin.shared.*`, `admin.cleaners.*`, `admin.customers.*`, `adminNav.cleaners/customers`) are defined in Task 2 before they're consumed in Tasks 3-5.
- **Out of scope (per spec):** no customer approval gate, no bulk actions, no note history — none of the tasks above introduce these.
