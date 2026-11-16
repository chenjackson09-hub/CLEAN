// The app's own outgoing email (NOT the sign-up / password codes — Supabase sends those itself).
// Plain SMTP, so it works with the same Gmail account the codes use (an app password), and can be
// pointed at any other provider later by changing the environment variables only:
//   SMTP_USER       the sending address (e.g. the Gmail address)            — required
//   SMTP_PASS       its password / Gmail app password                       — required
//   SMTP_HOST       default smtp.gmail.com
//   SMTP_PORT       default 465
//   MAIL_FROM_NAME  the name people see, default "Clean"
// Never throws: a message that can't be sent must not break the action that caused it.
// SERVER ONLY — don't import this from a client component (it loads Node's network modules).

export type MailResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'bad_recipient' | 'failed'; error?: string }

export type MailMessage = { to: string; subject: string; html: string; text: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SEND_TIMEOUT_MS = 10_000

function config(env: Record<string, string | undefined> = process.env) {
  const user = (env.SMTP_USER ?? '').trim()
  const host = (env.SMTP_HOST ?? '').trim() || 'smtp.gmail.com'
  // Google shows app passwords in groups of four with spaces; the spaces aren't part of it.
  const rawPass = env.SMTP_PASS ?? ''
  const pass = /gmail|google/i.test(host) ? rawPass.replace(/\s+/g, '') : rawPass.trim()
  const port = Number(env.SMTP_PORT) || 465
  const fromName = (env.MAIL_FROM_NAME ?? '').trim() || 'Clean'
  return { user, pass, host, port, fromName }
}

export function mailConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const c = config(env)
  return !!c.user && !!c.pass
}

export function isEmailAddress(value: string | null | undefined): value is string {
  return !!value && EMAIL.test(value.trim())
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const c = config()
  if (!c.user || !c.pass) return { sent: false, reason: 'not_configured' }
  if (!isEmailAddress(message.to)) return { sent: false, reason: 'bad_recipient' }
  try {
    // Loaded only when a message is really sent, so nothing else pays for it.
    const mod = await import('nodemailer')
    const createTransport = mod.createTransport ?? (mod as unknown as { default?: typeof mod }).default?.createTransport
    if (!createTransport) return { sent: false, reason: 'failed', error: 'Mail library did not load' }
    const transport = createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465,
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: SEND_TIMEOUT_MS,
    })
    const send = transport.sendMail({
      from: { name: c.fromName, address: c.user },
      to: message.to.trim(),
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out sending the email')), SEND_TIMEOUT_MS + 2_000))
    await Promise.race([send, timeout])
    return { sent: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('mail: could not send', error)
    return { sent: false, reason: 'failed', error }
  }
}
