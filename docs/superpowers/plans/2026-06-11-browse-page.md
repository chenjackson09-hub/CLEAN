# Browse Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/browse` page where customers search for available cleaners by day, time window, and service type, displayed as a card grid.

**Architecture:** A Next.js Server Component page reads URL search params, fetches matching cleaners via a Supabase RPC call (PostGIS proximity + availability query), and renders a grid of cleaner cards. The filter bar is a Client Component that updates URL params on submit, triggering a server-side re-render.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS (`@supabase/ssr`), Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/types/cleaner.ts` | Create | Shared TS types for cleaner data and filters |
| `lib/actions/cleaners.ts` | Create | `getCleaners` + `getCustomerLocation` server functions |
| `app/(customer)/browse/FilterBar.tsx` | Create | Client Component — filter form, pushes URL params |
| `app/(customer)/browse/CleanerCard.tsx` | Create | Server Component — renders one cleaner card |
| `app/(customer)/browse/page.tsx` | Create | Server Component — orchestrates page layout |
| `jest.config.ts` | Create | Jest config for Next.js App Router |
| `jest.setup.ts` | Create | Testing Library matchers setup |
| `lib/actions/cleaners.test.ts` | Create | Tests for server functions |
| `app/(customer)/browse/FilterBar.test.tsx` | Create | Tests for FilterBar |
| `app/(customer)/browse/CleanerCard.test.tsx` | Create | Tests for CleanerCard |

---

## Task 1: Set up Jest + React Testing Library

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Modify: `package.json` (add test script + devDependencies)

- [ ] **Step 1: Install test dependencies**

```bash
cd /mnt/c/Users/developer/PROJ_clean
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-node @types/jest
```

Expected: packages installed, no errors.

- [ ] **Step 2: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const customJestConfig: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(customJestConfig)
```

- [ ] **Step 3: Create jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to the `"scripts"` section:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify setup works**

```bash
npx jest --listTests
```

Expected: no errors, empty list (no tests yet).

- [ ] **Step 6: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json package-lock.json
git commit -m "feat: add Jest + React Testing Library setup"
```

---

## Task 2: Define shared types

**Files:**
- Create: `lib/types/cleaner.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/types/cleaner.ts

export type CleanerFilters = {
  day: number          // 0 = Sunday ... 6 = Saturday
  start: string        // 'HH:MM'
  end: string          // 'HH:MM'
  type: 'residential' | 'commercial' | 'both'
}

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
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/cleaner.ts
git commit -m "feat: add CleanerFilters and CleanerResult types"
```

---

## Task 3: getCleaners + getCustomerLocation server functions

**Files:**
- Create: `lib/actions/cleaners.ts`
- Create: `lib/actions/cleaners.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/actions/cleaners.test.ts
import { getCleaners, getCustomerLocation } from './cleaners'

const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    rpc: mockRpc,
    from: mockFrom,
  }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
})

describe('getCleaners', () => {
  it('returns cleaner data on success', async () => {
    const fakeCleaners = [
      { id: '1', full_name: 'Sarah M.', bio: 'Great cleaner', distance_km: 2.1,
        service_types: ['residential'], hourly_rate: 80, years_experience: 5,
        languages: ['EN', 'HE'], avatar_url: null },
    ]
    mockRpc.mockResolvedValue({ data: fakeCleaners, error: null })

    const result = await getCleaners(
      { day: 1, start: '09:00', end: '13:00', type: 'residential' },
      32.08, 34.78
    )

    expect(mockRpc).toHaveBeenCalledWith('get_available_cleaners', {
      p_lat: 32.08,
      p_lng: 34.78,
      p_day: 1,
      p_start: '09:00',
      p_end: '13:00',
      p_service_type: 'residential',
    })
    expect(result).toEqual({ data: fakeCleaners, error: null })
  })

  it('returns error string on Supabase error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await getCleaners(
      { day: 1, start: '09:00', end: '13:00', type: 'residential' },
      32.08, 34.78
    )

    expect(result).toEqual({ data: null, error: 'Failed to fetch cleaners' })
  })
})

describe('getCustomerLocation', () => {
  it('returns lat/lng when customer row has both', async () => {
    mockSingle.mockResolvedValue({ data: { lat: 32.08, lng: 34.78 }, error: null })

    const result = await getCustomerLocation('user-123')

    expect(mockFrom).toHaveBeenCalledWith('customers')
    expect(result).toEqual({ lat: 32.08, lng: 34.78 })
  })

  it('returns null when lat/lng are missing', async () => {
    mockSingle.mockResolvedValue({ data: { lat: null, lng: null }, error: null })

    const result = await getCustomerLocation('user-123')

    expect(result).toBeNull()
  })

  it('returns null on Supabase error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const result = await getCustomerLocation('user-123')

    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest lib/actions/cleaners.test.ts
```

Expected: FAIL — `Cannot find module './cleaners'`

- [ ] **Step 3: Implement cleaners.ts**

```typescript
// lib/actions/cleaners.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import type { CleanerFilters, CleanerResult } from '@/lib/types/cleaner'

export async function getCleaners(
  filters: CleanerFilters,
  customerLat: number,
  customerLng: number
): Promise<{ data: CleanerResult[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_available_cleaners', {
    p_lat: customerLat,
    p_lng: customerLng,
    p_day: filters.day,
    p_start: filters.start,
    p_end: filters.end,
    p_service_type: filters.type,
  })

  if (error) {
    console.error('getCleaners error:', error)
    return { data: null, error: 'Failed to fetch cleaners' }
  }

  return { data, error: null }
}

export async function getCustomerLocation(
  userId: string
): Promise<{ lat: number; lng: number } | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('customers')
    .select('lat, lng')
    .eq('id', userId)
    .single()

  if (!data?.lat || !data?.lng) return null
  return { lat: data.lat, lng: data.lng }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest lib/actions/cleaners.test.ts
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/cleaners.ts lib/actions/cleaners.test.ts
git commit -m "feat: add getCleaners and getCustomerLocation server functions"
```

---

## Task 4: FilterBar client component

**Files:**
- Create: `app/(customer)/browse/FilterBar.tsx`
- Create: `app/(customer)/browse/FilterBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// app/(customer)/browse/FilterBar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => jest.clearAllMocks())

describe('FilterBar', () => {
  it('renders all four filter fields and search button', () => {
    render(<FilterBar />)

    expect(screen.getByLabelText(/day/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('day select contains all 7 days', () => {
    render(<FilterBar />)
    const daySelect = screen.getByLabelText(/day/i)

    expect(daySelect).toContainElement(screen.getByRole('option', { name: 'Sunday' }))
    expect(daySelect).toContainElement(screen.getByRole('option', { name: 'Saturday' }))
  })

  it('navigates to correct URL on submit', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await user.selectOptions(screen.getByLabelText(/day/i), '1')
    await user.selectOptions(screen.getByLabelText(/start time/i), '09:00')
    await user.selectOptions(screen.getByLabelText(/end time/i), '13:00')
    await user.selectOptions(screen.getByLabelText(/service type/i), 'residential')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(mockPush).toHaveBeenCalledWith(
      '/browse?day=1&start=09%3A00&end=13%3A00&type=residential'
    )
  })

  it('pre-fills values from defaultValues prop', () => {
    render(<FilterBar defaultValues={{ day: 2, start: '10:00', end: '14:00', type: 'commercial' }} />)

    expect(screen.getByLabelText<HTMLSelectElement>(/day/i).value).toBe('2')
    expect(screen.getByLabelText<HTMLSelectElement>(/start time/i).value).toBe('10:00')
    expect(screen.getByLabelText<HTMLSelectElement>(/end time/i).value).toBe('14:00')
    expect(screen.getByLabelText<HTMLSelectElement>(/service type/i).value).toBe('commercial')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest app/\(customer\)/browse/FilterBar.test.tsx
```

Expected: FAIL — `Cannot find module './FilterBar'`

- [ ] **Step 3: Implement FilterBar.tsx**

```typescript
// app/(customer)/browse/FilterBar.tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIMES = Array.from({ length: 33 }, (_, i) => {
  const totalMinutes = 360 + i * 30
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const m = String(totalMinutes % 60).padStart(2, '0')
  return `${h}:${m}`
})

type Props = {
  defaultValues?: { day: number; start: string; end: string; type: string }
}

export function FilterBar({ defaultValues }: Props) {
  const router = useRouter()
  const [day, setDay] = useState(defaultValues?.day != null ? String(defaultValues.day) : '')
  const [start, setStart] = useState(defaultValues?.start ?? '')
  const [end, setEnd] = useState(defaultValues?.end ?? '')
  const [type, setType] = useState(defaultValues?.type ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams({ day, start, end, type })
    router.push(`/browse?${params}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 items-end p-4 bg-white border-b border-gray-200">
      <div className="flex flex-col gap-1">
        <label htmlFor="day" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Day</label>
        <select id="day" value={day} onChange={e => setDay(e.target.value)} required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select day</option>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="start" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Time</label>
        <select id="start" value={start} onChange={e => setStart(e.target.value)} required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select time</option>
          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="end" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Time</label>
        <select id="end" value={end} onChange={e => setEnd(e.target.value)} required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select time</option>
          {TIMES.filter(t => !start || t > start).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Type</label>
        <select id="type" value={type} onChange={e => setType(e.target.value)} required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select type</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="both">Both</option>
        </select>
      </div>

      <button type="submit"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md font-semibold text-sm transition-colors">
        Search
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest app/\(customer\)/browse/FilterBar.test.tsx
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(customer)/browse/FilterBar.tsx" "app/(customer)/browse/FilterBar.test.tsx"
git commit -m "feat: add FilterBar client component"
```

---

## Task 5: CleanerCard component

**Files:**
- Create: `app/(customer)/browse/CleanerCard.tsx`
- Create: `app/(customer)/browse/CleanerCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// app/(customer)/browse/CleanerCard.test.tsx
import { render, screen } from '@testing-library/react'
import { CleanerCard } from './CleanerCard'
import type { CleanerResult } from '@/lib/types/cleaner'

const baseCleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough. Specialise in deep cleans and move-out cleaning.',
  service_types: ['residential'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
}

describe('CleanerCard', () => {
  it('renders name, distance, and experience', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText(/2\.1km away/i)).toBeInTheDocument()
    expect(screen.getByText(/5 yrs exp/i)).toBeInTheDocument()
  })

  it('renders bio truncated to 80 chars', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    expect(screen.getByText(/Reliable and thorough/i)).toBeInTheDocument()
  })

  it('truncates bio longer than 80 chars with ellipsis', () => {
    const longBio = 'A'.repeat(100)
    render(<CleanerCard cleaner={{ ...baseCleaner, bio: longBio }} />)

    expect(screen.getByText(`"${'A'.repeat(80)}…"`)).toBeInTheDocument()
  })

  it('renders service type badge', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('renders both badge when cleaner has residential + commercial', () => {
    render(<CleanerCard cleaner={{ ...baseCleaner, service_types: ['residential', 'commercial'] }} />)

    expect(screen.getByText('Both')).toBeInTheDocument()
  })

  it('renders languages', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    expect(screen.getByText(/EN, HE/i)).toBeInTheDocument()
  })

  it('renders hourly rate', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    expect(screen.getByText('₪80/hr')).toBeInTheDocument()
  })

  it('renders View Profile link pointing to /cleaners/{id}', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    const link = screen.getByRole('link', { name: /view profile/i })
    expect(link).toHaveAttribute('href', '/cleaners/abc-123')
  })

  it('renders initial avatar when avatar_url is null', () => {
    render(<CleanerCard cleaner={baseCleaner} />)

    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders img when avatar_url is set', () => {
    render(<CleanerCard cleaner={{ ...baseCleaner, avatar_url: 'https://example.com/photo.jpg' }} />)

    expect(screen.getByRole('img', { name: 'Sarah M.' })).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest app/\(customer\)/browse/CleanerCard.test.tsx
```

Expected: FAIL — `Cannot find module './CleanerCard'`

- [ ] **Step 3: Implement CleanerCard.tsx**

```typescript
// app/(customer)/browse/CleanerCard.tsx
import Link from 'next/link'
import type { CleanerResult } from '@/lib/types/cleaner'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
  both: 'bg-yellow-100 text-yellow-800',
}

export function CleanerCard({ cleaner }: { cleaner: CleanerResult }) {
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const bioExcerpt = cleaner.bio.length > 80 ? cleaner.bio.slice(0, 80) + '…' : cleaner.bio
  const serviceLabel =
    cleaner.service_types.includes('residential') && cleaner.service_types.includes('commercial')
      ? 'both'
      : cleaner.service_types[0] ?? 'residential'

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        {cleaner.avatar_url ? (
          <img
            src={cleaner.avatar_url}
            alt={cleaner.full_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center font-bold text-indigo-700">
            {initial}
          </div>
        )}
        <div>
          <p className="font-bold text-gray-900">{cleaner.full_name}</p>
          <p className="text-sm text-gray-500">
            {cleaner.distance_km.toFixed(1)}km away · {cleaner.years_experience} yrs exp
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3 leading-relaxed">"{bioExcerpt}"</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {serviceLabel.charAt(0).toUpperCase() + serviceLabel.slice(1)}
        </span>
        {cleaner.languages.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            🌐 {cleaner.languages.join(', ')}
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-900">₪{cleaner.hourly_rate}/hr</span>
        <Link
          href={`/cleaners/${cleaner.id}`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest app/\(customer\)/browse/CleanerCard.test.tsx
```

Expected: PASS — 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(customer)/browse/CleanerCard.tsx" "app/(customer)/browse/CleanerCard.test.tsx"
git commit -m "feat: add CleanerCard component"
```

---

## Task 6: Browse page (Server Component)

**Files:**
- Create: `app/(customer)/browse/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(customer)/browse/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCleaners, getCustomerLocation } from '@/lib/actions/cleaners'
import { FilterBar } from './FilterBar'
import { CleanerCard } from './CleanerCard'
import type { CleanerFilters } from '@/lib/types/cleaner'

type Props = {
  searchParams: { day?: string; start?: string; end?: string; type?: string }
}

export default async function BrowsePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const location = await getCustomerLocation(user.id)

  const { day, start, end, type } = searchParams
  const hasFilters = day !== undefined && start !== undefined && end !== undefined && type !== undefined

  const filters: CleanerFilters | null = hasFilters
    ? { day: parseInt(day!), start: start!, end: end!, type: type as CleanerFilters['type'] }
    : null

  const { data: cleaners, error } = filters && location
    ? await getCleaners(filters, location.lat, location.lng)
    : { data: null, error: null }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-indigo-600 text-white px-6 py-3 flex justify-between items-center">
        <span className="font-bold text-lg">✨ Clean</span>
        <div className="flex gap-6 text-sm">
          <Link href="/bookings" className="hover:underline">My Bookings</Link>
          <Link href="/profile" className="hover:underline">Profile</Link>
        </div>
      </nav>

      {/* Filter Bar */}
      <FilterBar defaultValues={filters ?? undefined} />

      {/* Content */}
      <div className="px-6 py-6">
        {!location && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 mb-6">
            Please{' '}
            <Link href="/profile" className="font-semibold underline">complete your profile</Link>
            {' '}to see nearby cleaners.
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
        )}

        {!hasFilters && !error && (
          <p className="text-gray-500 text-sm">Use the filters above to find cleaners near you.</p>
        )}

        {hasFilters && !error && cleaners?.length === 0 && (
          <p className="text-gray-500 text-sm">
            No cleaners found for your filters. Try a different day or time.
          </p>
        )}

        {cleaners && cleaners.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">{cleaners.length} cleaner{cleaners.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cleaners.map(c => <CleanerCard key={c.id} cleaner={c} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to confirm nothing is broken**

```bash
npx jest
```

Expected: all tests from Tasks 3, 4, 5 pass. No new failures.

- [ ] **Step 3: Commit**

```bash
git add "app/(customer)/browse/page.tsx"
git commit -m "feat: add browse page — filter bar + cleaner card grid"
```

- [ ] **Step 4: Push branch**

```bash
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ Top filter bar with Day, Start Time, End Time, Service Type → FilterBar.tsx
- ✅ URL search params trigger server-side re-render → page.tsx reads searchParams
- ✅ Rich cleaner card: avatar, name, distance, years exp, bio excerpt, service badge, languages, rate, View Profile → CleanerCard.tsx
- ✅ PostGIS query via Supabase RPC → getCleaners in cleaners.ts
- ✅ Customer lat/lng from profiles → getCustomerLocation
- ✅ Empty state (no results) → page.tsx
- ✅ No filters yet state → page.tsx
- ✅ Missing lat/lng banner → page.tsx
- ✅ Supabase error handling → getCleaners returns error string, page.tsx renders it

**No placeholders:** All steps have full code.

**Type consistency:** `CleanerFilters` and `CleanerResult` are defined once in `lib/types/cleaner.ts` and imported everywhere. `getCleaners` signature matches usage in `page.tsx`.
