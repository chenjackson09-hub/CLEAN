import { createClient } from '@supabase/supabase-js'

// Service role client — only use in admin server actions, never expose to the client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
