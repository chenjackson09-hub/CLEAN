import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { Nav } from './Nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Defense in depth alongside middleware's role gate — a direct render path
  // that skipped middleware (or a future middleware change) shouldn't expose
  // admin data to a non-admin.
  if (profile?.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav currentUserName={profile.full_name ?? user.email ?? ''} />
      <main className="pt-14 md:ps-56">{children}</main>
    </div>
  )
}
