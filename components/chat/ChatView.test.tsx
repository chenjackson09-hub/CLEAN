import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatView from './ChatView'
import type { ChatBookingCard, ChatMessage } from '@/lib/chatFormat'

const mockSend = jest.fn()
jest.mock('@/lib/actions/chat', () => ({
  sendMessage: (...a: unknown[]) => mockSend(...a),
  loadOlderMessages: jest.fn(),
}))
jest.mock('@/lib/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel }
  const q: Record<string, unknown> = {}
  for (const m of ['update', 'eq', 'is', 'contains']) q[m] = () => q
  q.then = (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r)
  return { createClient: () => ({ channel: () => channel, removeChannel: jest.fn(), from: () => q }) }
})

const upcoming: ChatBookingCard = {
  booking_id: 'b2', attached_at: '2026-06-14T12:00:00Z', status: 'accepted',
  scheduled_date: '2026-06-17', scheduled_start: '09:00:00', address: 'Kibbutz Amir', hourly_rate: 90,
}
const past: ChatBookingCard = { ...upcoming, booking_id: 'b1', attached_at: '2026-05-26T12:00:00Z', status: 'completed', scheduled_date: '2026-05-26' }
const messages: ChatMessage[] = [
  { id: 'm1', sender_id: 'cleaner-1', body: 'Entry code?', created_at: '2026-05-26T09:00:00Z' },
  { id: 'm2', sender_id: 'host-1', body: 'It is 4821', created_at: '2026-05-26T09:05:00Z' },
]

function renderChat(role: 'host' | 'cleaner' = 'host') {
  return render(
    <ChatView
      conversationId="conv-1"
      currentUserId={role === 'host' ? 'host-1' : 'cleaner-1'}
      currentUserRole={role}
      other={{ id: 'x', name: 'Noa Rosen', displayName: 'Noa R.', avatarUrl: null }}
      initialMessages={messages}
      initialHasMore={false}
      cards={[past, upcoming]}
      backHref="/chat"
    />
  )
}

describe('ChatView', () => {
  beforeEach(() => mockSend.mockReset())

  it('shows the real counterpart in the header and a dynamic placeholder', () => {
    renderChat()
    expect(screen.getByText('Noa R.')).toBeInTheDocument()
    expect(screen.getByText('Matched cleaner')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Message Noa…')).toBeInTheDocument()
  })

  it('collapses past cleans by default and expands them on tap', async () => {
    renderChat()
    const toggle = screen.getByRole('button', { name: /Clean Completed — 26 May/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands upcoming cleans by default with start, rate and location (no end time)', () => {
    renderChat()
    const toggle = screen.getByRole('button', { name: /Upcoming Clean — 17 June/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('₪90/hr')).toBeInTheDocument()
    expect(screen.getByText('Kibbutz Amir')).toBeInTheDocument()
    expect(screen.queryByText(/end|finish/i)).not.toBeInTheDocument()
  })

  it('right-aligns host messages in #E8E4DC and left-aligns cleaner messages in white', () => {
    renderChat('host')
    expect(screen.getByText('It is 4821').className).toContain('bg-[#E8E4DC]')
    expect(screen.getByText('It is 4821').parentElement?.className).toContain('items-end')
    expect(screen.getByText('Entry code?').className).toContain('bg-white')
    expect(screen.getByText('Entry code?').parentElement?.className).toContain('items-start')
  })

  it('keeps host messages on the right when the cleaner is the viewer', () => {
    renderChat('cleaner')
    expect(screen.getByText('It is 4821').parentElement?.className).toContain('items-end')
    expect(screen.getByText('Matched host')).toBeInTheDocument()
  })

  it('hides the booking summaries with the header switch (dates stay), and remembers the choice', async () => {
    localStorage.clear()
    renderChat()
    expect(screen.getByText(/Upcoming Clean/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hide booking summaries' }))
    expect(screen.queryByText(/Upcoming Clean/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Clean Completed/)).not.toBeInTheDocument()
    expect(screen.getByText('Entry code?')).toBeInTheDocument()
    expect(screen.getAllByText(/^—.*—$/).length).toBeGreaterThan(0) // the message's day divider stays
    expect(localStorage.getItem('chatHideBookings')).toBe('1')
    await userEvent.click(screen.getByRole('button', { name: 'Show booking summaries' }))
    expect(screen.getByText(/Upcoming Clean/)).toBeInTheDocument()
  })

  it('sends a message, clears the input, and ignores empty submits', async () => {
    mockSend.mockImplementation(async (_c: string, body: string, clientId: string) => ({
      message: { id: 'm3', sender_id: 'host-1', body, created_at: '2026-06-14T13:00:00Z', client_id: clientId },
    }))
    renderChat()
    const input = screen.getByPlaceholderText('Message Noa…')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(mockSend).not.toHaveBeenCalled()

    await userEvent.type(input, 'Hello Noa{enter}')
    expect(input).toHaveValue('')
    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(1))
    expect(mockSend.mock.calls[0][0]).toBe('conv-1')
    expect(mockSend.mock.calls[0][1]).toBe('Hello Noa')
    expect(await screen.findByText('Hello Noa')).toBeInTheDocument()
  })

  it('shows a retry affordance when sending fails and resends with the same client id', async () => {
    mockSend.mockResolvedValueOnce({ error: 'nope' })
    renderChat()
    await userEvent.type(screen.getByPlaceholderText('Message Noa…'), 'Hi{enter}')
    const retry = await screen.findByText('Not sent. Tap to retry.')

    mockSend.mockImplementation(async (_c: string, body: string, clientId: string) => ({
      message: { id: 'm9', sender_id: 'host-1', body, created_at: '2026-06-14T13:00:00Z', client_id: clientId },
    }))
    await userEvent.click(retry)
    await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(2))
    expect(mockSend.mock.calls[1][2]).toBe(mockSend.mock.calls[0][2])
  })

  describe('cancelled cleaning', () => {
    const cancelled: ChatBookingCard = {
      ...upcoming, booking_id: 'b3', status: 'cancelled', scheduled_date: '2099-01-10',
      cancelled_by: 'cleaner', cancelled_at: '2026-06-15T12:00:00Z', cancellation_reason: 'unexpected', cancellation_message: 'Something came up',
    }
    function renderCancelled(role: 'host' | 'cleaner') {
      return render(
        <ChatView
          conversationId="conv-1" currentUserId={role === 'host' ? 'host-1' : 'cleaner-1'} currentUserRole={role}
          other={{ id: 'x', name: 'Noa Rosen', displayName: 'Noa R.', avatarUrl: null }}
          initialMessages={[]} initialHasMore={false} cards={[cancelled]} backHref="/chat"
        />
      )
    }

    it('keeps the card (greyed) and adds a permanent entry with who, when, the reason and the note', () => {
      renderCancelled('host')
      expect(screen.getByText(/Clean Cancelled/)).toBeInTheDocument()
      expect(screen.getByText('Cleaning cancelled by Noa R.')).toBeInTheDocument()
      expect(screen.getByText(/Reason: I can no longer do this job|Reason: Something unexpected happened/)).toBeInTheDocument()
      expect(screen.getByText(/Something came up/)).toBeInTheDocument()
    })

    it('offers the host "Find another cleaner" for the same request when the cleaner cancelled', async () => {
      renderCancelled('host')
      expect(await screen.findByRole('link', { name: 'Find another cleaner' })).toHaveAttribute('href', '/browse?rebook=b3')
    })

    it('says "by you" to the person who cancelled, and gives the cleaner no rebook button', () => {
      renderCancelled('cleaner')
      expect(screen.getByText('Cleaning cancelled by you')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Find another cleaner' })).not.toBeInTheDocument()
    })
  })
})
