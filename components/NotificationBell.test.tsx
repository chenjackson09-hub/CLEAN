import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import NotificationBell from './NotificationBell'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }))

const rows = [
  { id: 'n1', kind: 'request_accepted', data: { name: 'Noa R.', date: '2026-10-17' }, href: '/bookings', read_at: null, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'n2', kind: 'rating_received', data: { name: 'Dana', score: 5 }, href: '/profile', read_at: '2026-10-01T00:00:00Z', created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
]
const updates: { patch: Record<string, unknown>; filter: string }[] = []
let insertHandler: ((p: { new: unknown }) => void) | null = null

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: (_c: string, opts?: { head?: boolean }) =>
        opts?.head
          ? { is: () => Promise.resolve({ count: 1, data: null }) }
          : { order: () => ({ limit: () => Promise.resolve({ data: rows }) }) },
      update: (patch: Record<string, unknown>) => ({
        is: () => { updates.push({ patch, filter: 'all-unread' }); return Promise.resolve({ error: null }) },
        eq: (_c: string, id: string) => { updates.push({ patch, filter: id }); return Promise.resolve({ error: null }) },
      }),
    }),
    channel: () => {
      const ch = { on: (_e: string, _f: unknown, cb: (p: { new: unknown }) => void) => { insertHandler = cb; return ch }, subscribe: () => ch }
      return ch
    },
    removeChannel: jest.fn(),
  }),
}))

function Harness() {
  const [open, setOpen] = useState(false)
  return <NotificationBell userId="me" open={open} onToggle={() => setOpen((o) => !o)} onClose={() => setOpen(false)} />
}

beforeEach(() => { push.mockReset(); updates.length = 0 })

describe('NotificationBell', () => {
  it('shows the unread count on the bell and the latest updates, newest first, in a dropdown', async () => {
    render(<Harness />)
    expect(await screen.findByRole('button', { name: 'Notifications (1)' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Notifications (1)' }))

    const list = within(screen.getByRole('dialog'))
    const items = list.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Noa R. accepted your request for 17 October')
    expect(items[0]).toHaveTextContent('5m')
    expect(items[1]).toHaveTextContent('Dana rated you 5★')
  })

  it('tapping an update marks it read and goes to the right page', async () => {
    render(<Harness />)
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications (1)' }))
    await userEvent.click(screen.getByText(/accepted your request/))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bookings'))
    expect(updates).toContainEqual(expect.objectContaining({ filter: 'n1' }))
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument() // badge cleared
  })

  it('"Mark all as read" clears the badge', async () => {
    render(<Harness />)
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications (1)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument())
    expect(updates.some((u) => u.filter === 'all-unread')).toBe(true)
  })

  it('a new notification arriving live bumps the count and appears first', async () => {
    render(<Harness />)
    await screen.findByRole('button', { name: 'Notifications (1)' })
    insertHandler!({ new: { id: 'n3', kind: 'request_declined', data: { name: 'Sam K.', date: '2026-10-20' }, href: '/bookings', read_at: null, created_at: new Date().toISOString() } })
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications (2)' }))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[0]).toHaveTextContent('Sam K. declined your request')
  })
})
