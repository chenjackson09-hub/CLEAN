import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runHousekeeping } from '@/lib/housekeeping'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// The scheduled job's entry point (see lib/housekeeping.ts). It is called without a signed-in
// person, so:
//   • when CRON_SECRET is set in the environment, the caller must send it
//     ("Authorization: Bearer <secret>") — set the same value as a GitHub Actions secret;
//   • when it is not set, anyone may call it, which is acceptable only because the work is
//     harmless to repeat (everything is once-only) and nothing about anyone is returned. Runs
//     are then spaced at least a few minutes apart so it can't be used to hammer the database.
const MIN_GAP_MS = 4 * 60 * 1000
let lastRun = 0

export async function GET(request: Request) {
  const secret = (process.env.CRON_SECRET ?? '').trim()
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  } else {
    const now = Date.now()
    if (now - lastRun < MIN_GAP_MS) return NextResponse.json({ ok: true, skipped: true })
    lastRun = now
  }
  try {
    await runHousekeeping(createAdminClient())
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('housekeeping: failed', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
