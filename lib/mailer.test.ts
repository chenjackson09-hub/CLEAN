import { isEmailAddress, mailConfigured, sendMail } from './mailer'

const mockSend = jest.fn()
const mockCreate = jest.fn((..._a: unknown[]) => ({ sendMail: mockSend }))
jest.mock('nodemailer', () => ({ createTransport: (...a: unknown[]) => mockCreate(...a) }))

const OLD = { ...process.env }
afterEach(() => { process.env = { ...OLD }; jest.clearAllMocks() })

const msg = { to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't' }

describe('mailer', () => {
  it('does nothing (and says so) when it is not set up', async () => {
    delete process.env.SMTP_USER; delete process.env.SMTP_PASS
    expect(mailConfigured()).toBe(false)
    await expect(sendMail(msg)).resolves.toEqual({ sent: false, reason: 'not_configured' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('refuses an address that is not an email', async () => {
    process.env.SMTP_USER = 'me@gmail.com'; process.env.SMTP_PASS = 'abcd efgh ijkl mnop'
    expect(isEmailAddress('dror@admin')).toBe(false)
    await expect(sendMail({ ...msg, to: 'dror@admin' })).resolves.toEqual({ sent: false, reason: 'bad_recipient' })
  })

  it('sends through Gmail by default, with the spaces taken out of the app password', async () => {
    process.env.SMTP_USER = 'me@gmail.com'; process.env.SMTP_PASS = 'abcd efgh ijkl mnop'
    mockSend.mockResolvedValue({})
    await expect(sendMail(msg)).resolves.toEqual({ sent: true })
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'me@gmail.com', pass: 'abcdefghijklmnop' } })
    expect(mockSend.mock.calls[0][0]).toMatchObject({ to: 'a@b.com', from: { name: 'Clean', address: 'me@gmail.com' } })
  })

  it('reports a failure instead of throwing', async () => {
    process.env.SMTP_USER = 'me@gmail.com'; process.env.SMTP_PASS = 'x'
    mockSend.mockRejectedValue(new Error('Invalid login'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendMail(msg)).resolves.toEqual({ sent: false, reason: 'failed', error: 'Invalid login' })
    spy.mockRestore()
  })
})
