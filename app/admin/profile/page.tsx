import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminProfileView } from './AdminProfileView'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminProfilePage() {
  noStore()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  const fullName = (profile?.full_name ?? '').trim()
  const spaceIndex = fullName.indexOf(' ')
  const firstName = spaceIndex === -1 ? fullName : fullName.slice(0, spaceIndex)
  const lastName = spaceIndex === -1 ? '' : fullName.slice(spaceIndex + 1)

  return (
    <AdminProfileView initialFirstName={firstName} initialLastName={lastName} email={user.email ?? ''} />
  )
}
