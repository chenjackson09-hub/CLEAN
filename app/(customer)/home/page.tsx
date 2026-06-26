import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'

export default async function CustomerHomePage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()])

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-xl -mx-1.5 sm:mx-auto pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Hi, {firstName} </h1>
      <p className="text-gray-500 mb-8">What would you like to do today?</p>

      <div className="grid grid-cols-1 gap-4">
        <Link
          href="/browse"
          className="flex items-center gap-4 bg-white rounded-2xl shadow-md hover:shadow-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Find a Cleaner</p>
            <p className="text-sm text-gray-500">Browse available cleaners and book a service</p>
          </div>
        </Link>

        <Link
          href="/bookings"
          className="flex items-center gap-4 bg-white rounded-2xl shadow-md hover:shadow-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">My Bookings</p>
            <p className="text-sm text-gray-500">View and manage your cleaning appointments</p>
          </div>
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">My Profile</p>
            <p className="text-sm text-gray-500">Update your details and preferences</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
