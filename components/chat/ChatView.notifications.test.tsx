import { render, act } from '@testing-library/react'
import ChatView from './ChatView'

jest.mock('@/lib/actions/chat', () => ({ sendMessage: jest.fn(), loadOlderMessages: jest.fn() }))

const handlers: { filterTable: string; cb: (p: { new: unknown }) => void }[] = []
const mockUpdate = jest.fn()
jest.mock('@/lib/supabase/client', () => {
  const channel: Record<string, unknown> = {}
  channel.on = (_t: string, opts: { table: string }, cb: (p: { new: unknown }) => void) => {
    handlers.push({ filterTable: opts.table, cb })
    return channel
  }
  channel.subscribe = () => channel
  const q: Record<string, unknown> = {}
  q.update = (...a: unknown[]) => { mockUpdate(...a); return q }
  for (const m of ['eq', 'is', 'contains']) q[m] = () => q
  q.then = (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r)
  return { createClient: () => ({ channel: () => channel, removeChannel: jest.fn(), from: () => q }) }
})

function renderChat() {
  return render(
    <ChatView
      conversationId="conv-1"
      currentUserId="host-1"
      currentUserRole="host"
      other={{ id: 'x', name: 'Noa Rosen', displayName: 'Noa R.', avatarUrl: null }}
      initialMessages={[]}
      initialHasMore={false}
      cards={[]}
      backHref="/chat"
    />
  )
}

function notificationHandler() {
  return handlers.find((h) => h.filterTable === 'notifications')!.cb
}

describe('ChatView unread notifications', () => {
  beforeEach(() => { handlers.length = 0; mockUpdate.mockClear() })

  it('marks the chat’s message notification read on open', () => {
    renderChat()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('marks a message notification for THIS chat read as it arrives while the chat is in view', async () => {
    renderChat()
    mockUpdate.mockClear()
    await act(async () => notificationHandler()({ new: { kind: 'chat_message', data: { conversation: 'conv-1' } } }))
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('ignores other chats and other kinds of notification', async () => {
    renderChat()
    mockUpdate.mockClear()
    await act(async () => notificationHandler()({ new: { kind: 'chat_message', data: { conversation: 'other' } } }))
    await act(async () => notificationHandler()({ new: { kind: 'request_received', data: {} } }))
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('leaves it unread while the tab is hidden', async () => {
    renderChat()
    mockUpdate.mockClear()
    const spy = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => notificationHandler()({ new: { kind: 'chat_message', data: { conversation: 'conv-1' } } }))
    expect(mockUpdate).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
