import {
  buildAccountDecisionEmail,
  buildAdminSignupEmail,
  buildAdminSupportEmail,
  buildNewRequestEmail,
  buildRequestAnsweredEmail,
  emailAccountDecision,
  emailAdminsNewSignup,
  emailNewRequest,
  emailRequestAnswered,
} from './appEmails'

const mockSendMail = jest.fn()
jest.mock('./mailer', () => ({
  ...jest.requireActual('./mailer'),
  sendMail: (...a: unknown[]) => mockSendMail(...a),
}))

const origin = 'https://clean.example'

describe('what the emails say', () => {
  it('new request: who, when, the 24 hours and a link — both languages, nothing private', () => {
    const { subject, text, html } = buildNewRequestEmail({ cleanerName: 'Noa Regev', hostName: 'Dana Levi', date: '2026-10-15', time: '09:00', origin })
    expect(subject).toContain('New cleaning request')
    expect(text).toContain('Hi Noa,')
    expect(text).toContain('Dana Levi sent you a cleaning request for Thu 15 Oct at 09:00.')
    expect(text).toContain('24 hours')
    expect(text).toContain('https://clean.example/cleaner/requests')
    expect(text).toContain('שלום Noa,')
    expect(text).toContain('24 שעות')
    expect(html).toContain('dir="rtl"')
  })

  it('accepted: chat and booking links for the host', () => {
    const { text } = buildRequestAnsweredEmail({ kind: 'accepted', hostName: 'Dana Levi', cleanerName: 'Noa R.', date: '2026-10-15', time: '09:00', origin, cleanerId: 'c1', bookingId: 'b1' })
    expect(text).toContain('Noa R. accepted your request for Thu 15 Oct at 09:00.')
    expect(text).toContain('https://clean.example/chat/c1')
    expect(text).toContain('https://clean.example/bookings?booking=b1')
    expect(text).toContain('אושרה')
  })

  it('declined and expired: say which, and point back to the search', () => {
    const declined = buildRequestAnsweredEmail({ kind: 'declined', hostName: 'Dana', cleanerName: 'Noa R.', date: '2026-10-15', time: '09:00', origin, cleanerId: 'c1', bookingId: 'b1' })
    expect(declined.text).toContain("Noa R. can't take your request for Thu 15 Oct.")
    expect(declined.text).toContain('https://clean.example/browse')
    const expired = buildRequestAnsweredEmail({ kind: 'expired', hostName: 'Dana', cleanerName: 'Noa R.', date: '2026-10-15', time: '', origin, cleanerId: 'c1', bookingId: 'b1' })
    expect(expired.text).toContain("didn't answer your request for Thu 15 Oct within 24 hours")
    expect(expired.subject).toContain('no answer')
  })

  it('account decisions: the right next step per role, and no links when the site address is unknown', () => {
    expect(buildAccountDecisionEmail({ name: 'Noa', role: 'cleaner', status: 'approved', origin }).text).toContain('https://clean.example/cleaner/availability')
    expect(buildAccountDecisionEmail({ name: 'Dana', role: 'host', status: 'approved', origin }).text).toContain('https://clean.example/browse')
    expect(buildAccountDecisionEmail({ name: 'Noa', role: 'cleaner', status: 'needs_info', origin }).text).toContain('more information')
    const rejected = buildAccountDecisionEmail({ name: 'Noa', role: 'cleaner', status: 'rejected', origin: null })
    expect(rejected.text).toContain("can't approve")
    expect(rejected.text).not.toContain('http')
  })

  it('admin alerts: name, role, the message (shortened and escaped)', () => {
    expect(buildAdminSignupEmail({ name: 'Dana Levi', role: 'customer', origin }).text).toContain('Dana Levi finished signing up as a host')
    const support = buildAdminSupportEmail({ name: 'Noa', role: 'cleaner', message: '<b>help</b> ' + 'x'.repeat(700), origin })
    expect(support.text).toContain('New support message from Noa (cleaner).')
    expect(support.html).toContain('&lt;b&gt;help')
    expect(support.html).not.toContain('<b>help')
    expect(support.text).toContain('…')
    expect(support.text).toContain('https://clean.example/admin/support')
  })
})

type Opts = { emails?: Record<string, string | null>; admins?: string[]; pendingInGroup?: number }
function fakeAdmin(o: Opts = {}) {
  const emails = o.emails ?? {}
  return {
    auth: { admin: { getUserById: jest.fn(async (id: string) => ({ data: { user: emails[id] ? { email: emails[id] } : null } })) } },
    from: (table: string) => {
      if (table === 'bookings') {
        const q: Record<string, unknown> = {}
        q.select = () => q
        q.eq = () => q
        q.then = (resolve: (v: unknown) => void) => resolve({ count: o.pendingInGroup ?? 1 })
        return q
      }
      return {
        select: () => ({
          in: async () => ({ data: [{ id: 'h1', full_name: 'Dana Levi' }, { id: 'c1', full_name: 'Noa Regev' }] }),
          eq: async () => ({ data: (o.admins ?? []).map((id) => ({ id })) }),
        }),
      }
    },
  } as never
}

describe('sending', () => {
  beforeEach(() => { mockSendMail.mockReset(); mockSendMail.mockResolvedValue({ sent: true }) })

  it('new request goes to the cleaner', async () => {
    await expect(emailNewRequest(fakeAdmin({ emails: { c1: 'noa@example.com' } }), { hostId: 'h1', cleanerId: 'c1', date: '2026-10-15', time: '09:00:00' })).resolves.toEqual({ sent: true })
    expect(mockSendMail.mock.calls[0][0].to).toBe('noa@example.com')
    expect(mockSendMail.mock.calls[0][0].text).toContain('Dana Levi sent you a cleaning request')
  })

  it('flexible days: only the first request of the same clean is emailed', async () => {
    const admin = fakeAdmin({ emails: { c1: 'noa@example.com' }, pendingInGroup: 2 })
    await expect(emailNewRequest(admin, { hostId: 'h1', cleanerId: 'c1', date: '2026-10-16', time: '09:00', groupId: 'g1' })).resolves.toEqual({ sent: false, reason: 'skipped' })
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('the answer goes to the host, who sees the cleaner as First L.', async () => {
    await emailRequestAnswered(fakeAdmin({ emails: { h1: 'dana@example.com' } }), { kind: 'accepted', bookingId: 'b1', hostId: 'h1', cleanerId: 'c1', date: '2026-10-15', time: '09:00:00' })
    expect(mockSendMail.mock.calls[0][0].to).toBe('dana@example.com')
    expect(mockSendMail.mock.calls[0][0].text).toContain('Noa R. accepted your request')
  })

  it('skips someone without a real email address', async () => {
    await expect(emailAccountDecision(fakeAdmin({ emails: { c1: 'dror@admin' } }), { userId: 'c1', role: 'cleaner', status: 'approved' })).resolves.toEqual({ sent: false, reason: 'bad_recipient' })
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('admin alerts go to every admin in one message', async () => {
    const admin = fakeAdmin({ emails: { a1: 'one@example.com', a2: 'two@example.com' }, admins: ['a1', 'a2'] })
    await emailAdminsNewSignup(admin, { userId: 'h1', role: 'customer' })
    expect(mockSendMail.mock.calls[0][0].to).toEqual(['one@example.com', 'two@example.com'])
  })

  it('never throws', async () => {
    const broken = { auth: { admin: { getUserById: jest.fn().mockRejectedValue(new Error('boom')) } }, from: () => { throw new Error('boom') } } as never
    await expect(emailRequestAnswered(broken, { kind: 'declined', bookingId: 'b', hostId: 'h', cleanerId: 'c', date: '2026-10-15' })).resolves.toMatchObject({ sent: false, reason: 'failed' })
  })
})
