import { buildCancellationEmail, sendCancellationEmail, type CancellationEmailInput } from './cancellationEmail'
import type { CancelSuccess } from './cancellation'

const mockSendMail = jest.fn()
jest.mock('./mailer', () => ({
  ...jest.requireActual('./mailer'),
  sendMail: (...a: unknown[]) => mockSendMail(...a),
}))

const base: CancellationEmailInput = {
  recipientRole: 'host',
  recipientName: 'Dana Levi',
  otherName: 'Noa R.',
  date: '2026-10-15',
  time: '09:00',
  reason: 'plans_changed',
  message: 'So sorry, my car broke down',
  origin: 'https://clean.example',
  otherUserId: 'cleaner-1',
  bookingId: 'b-1',
  canRebook: true,
}

describe('buildCancellationEmail', () => {
  it('tells the host who cancelled, when, why, and how to find another cleaner — in both languages', () => {
    const { subject, html, text } = buildCancellationEmail(base)
    expect(subject).toContain('Cleaning cancelled')
    expect(subject).toContain('הניקיון בוטל')
    expect(text).toContain('Hi Dana,')
    expect(text).toContain('Noa R. had to cancel the cleaning booked for Thu 15 Oct at 09:00.')
    expect(text).toContain('Reason: Plans changed')
    expect(text).toContain('So sorry, my car broke down')
    expect(text).toContain('https://clean.example/browse?rebook=b-1')
    expect(text).toContain('https://clean.example/chat/cleaner-1')
    expect(text).toContain('שלום Dana,')
    expect(text).toContain('בוטל על ידי המנקה')
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('dir="ltr"')
  })

  it('tells the cleaner their time was reopened, with the cleaner-side chat link and no rebook link', () => {
    const { text } = buildCancellationEmail({ ...base, recipientRole: 'cleaner', recipientName: 'Noa Regev', otherName: 'Dana Levi', otherUserId: 'host-1' })
    expect(text).toContain('Dana Levi cancelled the cleaning booked for Thu 15 Oct at 09:00.')
    expect(text).toContain('Your availability for this time has been reopened.')
    expect(text).toContain('בוטל על ידי המארח')
    expect(text).toContain('https://clean.example/cleaner/chat/host-1')
    expect(text).not.toContain('rebook')
  })

  it('leaves out the rebook link once the day has passed, and every link when the site address is unknown', () => {
    expect(buildCancellationEmail({ ...base, canRebook: false }).text).not.toContain('rebook')
    const noOrigin = buildCancellationEmail({ ...base, origin: null })
    expect(noOrigin.text).not.toContain('http')
    expect(noOrigin.html).not.toContain('<a ')
  })

  it('leaves out the reason and note lines when there are none', () => {
    const { text } = buildCancellationEmail({ ...base, reason: null, message: null })
    expect(text).not.toContain('Reason:')
    expect(text).not.toContain('Note')
    expect(text).not.toContain('סיבה')
  })

  it('escapes anything a person typed', () => {
    const { html } = buildCancellationEmail({ ...base, message: '<script>alert(1)</script>', otherName: 'A <b>' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('A <b>')
  })
})

function fakeAdmin(opts: { email?: string | null; why?: { cancellation_reason: string | null; cancellation_message: string | null } | null }) {
  return {
    auth: { admin: { getUserById: jest.fn().mockResolvedValue({ data: { user: opts.email ? { email: opts.email } : null } }) } },
    from: (table: string) => {
      if (table === 'bookings') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.why ?? null }) }) }) }
      }
      // profiles (profileNames)
      return { select: () => ({ in: async () => ({ data: [{ id: 'host-1', full_name: 'Dana Levi' }, { id: 'cleaner-1', full_name: 'Noa Regev' }] }) }) }
    },
  } as never
}

const result = (over: Partial<CancelSuccess> = {}): CancelSuccess => ({
  ok: true,
  role: 'cleaner',
  wasConfirmed: true,
  booking: { id: 'b-1', customer_id: 'host-1', cleaner_id: 'cleaner-1', scheduled_date: '2099-01-01', scheduled_start: '09:00:00' },
  ...over,
})

describe('sendCancellationEmail', () => {
  beforeEach(() => { mockSendMail.mockReset(); mockSendMail.mockResolvedValue({ sent: true }) })

  it('emails the host when the cleaner cancels a confirmed clean (cleaner shown as First L.)', async () => {
    const admin = fakeAdmin({ email: 'dana@example.com', why: { cancellation_reason: 'unexpected', cancellation_message: 'sorry' } })
    await expect(sendCancellationEmail(admin, result())).resolves.toEqual({ sent: true })
    const mail = mockSendMail.mock.calls[0][0]
    expect(mail.to).toBe('dana@example.com')
    expect(mail.text).toContain('Noa R. had to cancel')
    expect(mail.text).toContain('Something unexpected happened')
  })

  it('emails the cleaner when the host cancels', async () => {
    const admin = fakeAdmin({ email: 'noa@example.com' })
    await sendCancellationEmail(admin, result({ role: 'host' }))
    const mail = mockSendMail.mock.calls[0][0]
    expect(mail.to).toBe('noa@example.com')
    expect(mail.text).toContain('Dana Levi cancelled the cleaning')
  })

  it('sends nothing for a withdrawn pending request', async () => {
    await expect(sendCancellationEmail(fakeAdmin({ email: 'x@example.com' }), result({ wasConfirmed: false }))).resolves.toEqual({ sent: false, reason: 'skipped' })
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('sends nothing to an address that is not a real email', async () => {
    await expect(sendCancellationEmail(fakeAdmin({ email: 'dror@admin' }), result())).resolves.toEqual({ sent: false, reason: 'bad_recipient' })
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it('never throws, even if the lookup blows up', async () => {
    const broken = { auth: { admin: { getUserById: jest.fn().mockRejectedValue(new Error('boom')) } } } as never
    await expect(sendCancellationEmail(broken, result())).resolves.toMatchObject({ sent: false, reason: 'failed' })
  })
})
