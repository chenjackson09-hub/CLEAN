import { render, screen } from '@testing-library/react'
import RequestsPage from './page'

const mockPending = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ getCurrentUser: async () => ({ id: 'me' }) }))
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (res: (v: unknown) => void) => res(table === 'bookings' ? mockPending() : { data: [] })
          if (prop === 'single') return () => Promise.resolve({ data: { hourly_rate: 90 } })
          return () => chain
        },
      })
      return chain
    },
  }),
}))
jest.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }))
jest.mock('./RequestGroupRow', () => ({ __esModule: true, default: () => <div>row</div> }))

describe('requests page empty state', () => {
  it('invites the cleaner to open more time slots, with a link to the schedule', async () => {
    mockPending.mockReturnValue({ data: [] })
    render(await RequestsPage())
    expect(screen.getByText('No requests at the moment.')).toBeInTheDocument()
    expect(screen.getByText('Open more time slots to maximize your job opportunities.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open time slots' })).toHaveAttribute('href', '/cleaner/availability')
  })
})
