import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailConfigured, sendMail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

// Admin-only check that the app's own email is set up: opening this address while signed in as
// an admin sends ONE test message to that admin's own address and says whether it went out.
// It never shows the password or sends to anyone else.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admins only.' }, { status: 403 })

  if (!mailConfigured()) {
    return NextResponse.json({ configured: false, sent: false, hint: 'SMTP_USER and SMTP_PASS are not set for this deployment.' })
  }
  const result = await sendMail({
    to: user.email ?? '',
    subject: 'Clean: test email / אימייל בדיקה',
    html: '<p dir="rtl">זהו אימייל בדיקה מ-Clean. אם קיבלתם אותו, שליחת האימיילים מהאפליקציה עובדת.</p><p>This is a test email from Clean. If you received it, the app can send email.</p>',
    text: 'זהו אימייל בדיקה מ-Clean.\n\nThis is a test email from Clean. If you received it, the app can send email.',
  })
  return NextResponse.json({ configured: true, to: user.email, ...result })
}
