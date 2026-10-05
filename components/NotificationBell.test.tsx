import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import NotificationBell from './NotificationBell'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/' }))

const HOUR = 3600000
const mk = (id: string, hoursAgo: number, read: boolean, kind = 'rating_received') => ({
  id, kind, data: { name: `P${id}`, score: 5 }, href: '/profile',
  read_at: read ? '2026-10-01T00:00:00Z' : null, created_at: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
})
const rows = [
  { id: 'n1', kind: 'request_accepted', data: { name: 'Noa R.', date: '2026-10-17' }, href: '/bookings', read_at: null, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'n2', kind: 'rating_received', data: { name: 'Dana', score: 5 }, href: '/profile', read_at: '2026-10-01T00:00:00Z', created_at: new Date(Date.now() - 3 * HOUR).toISOString() },
  mk('e1', 30, true),
]
// A thenable query builder over `rows` that understands the filters the bell uses.
function query(source: typeof rows) {
  let out = [...source]
  let max = Infinity
  const b = {
    order: () => b,
    limit: (n: number) => { max = n; return b },
    is: () => { out = out.filter((r) => r.read_at === null); return b },
    lt: (_c: string, v: string) => { out = out.filter((r) => r.created_at < v); return b },
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: out.slice(0, max) }).then(res),
  }
  return b
}
const updates: { patch: Record<string, unknown>; filter: string }[] = []
let insertHandler: ((p: { new: unknown }) => void) | null = null

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: (_c: string, opts?: { head?: boolean }) =>
        opts?.head ? { is: () => Promise.resolve({ count: 1, data: null }) } : query(rows),
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
    const items = list.getAllByRole('listitem') // New: n1, n2; Earlier: e1
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

  it('splits into New (last day) and Earlier, and the Unread tab keeps only unread ones', async () => {
    render(<Harness />)
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications (1)' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'New' })).toBeInTheDocument()
    expect(dialog.getByRole('heading', { name: 'Earlier' })).toBeInTheDocument()
    expect(dialog.getAllByRole('listitem')).toHaveLength(3)

    await userEvent.click(dialog.getByRole('button', { name: 'Unread' }))
    await waitFor(() => expect(dialog.getAllByRole('listitem')).toHaveLength(1))
    expect(dialog.queryByRole('heading', { name: 'Earlier' })).not.toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'All' }))
    await waitFor(() => expect(dialog.getAllByRole('listitem')).toHaveLength(3))
  })

  it('loads further back into the history as the list is scrolled', async () => {
    const original = rows.splice(0, rows.length)
    for (let i = 0; i < 25; i++) rows.push(mk(`h${i}`, 2 + i * 5, true))
    try {
      render(<Harness />)
      await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }))
      const dialog = within(screen.getByRole('dialog'))
      await waitFor(() => expect(dialog.getAllByRole('listitem')).toHaveLength(20))
      fireEvent.scroll(dialog.getAllByRole('heading')[0].closest('div') as HTMLElement)
      await waitFor(() => expect(dialog.getAllByRole('listitem')).toHaveLength(25))
    } finally {
      rows.splice(0, rows.length, ...original)
    }
  })
})
