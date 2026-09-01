import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function AdminAvailabilityPage() {
  noStore()
  const admin = createAdminClient()

  const [{ data: weeklyRows }, { data: profileRows }] = await Promise.all([
    admin
      .from('cleaner_weekly_availability')
      .select('id, cleaner_id, day_of_week, start_time, end_time')
      .order('cleaner_id')
      .order('day_of_week')
      .order('start_time')
      .limit(500),
    admin.from('profiles').select('id, full_name').eq('role', 'cleaner').limit(500),
  ])

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p.full_name ?? p.id]))

  const byCleanerMap = new Map<string, { id: string; day_of_week: number; start_time: string; end_time: string }[]>()
  for (const row of weeklyRows ?? []) {
    if (!byCleanerMap.has(row.cleaner_id)) byCleanerMap.set(row.cleaner_id, [])
    byCleanerMap.get(row.cleaner_id)!.push(row)
  }

  return (
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Cleaner Availability</h1>
        {byCleanerMap.size === 0 ? (
          <p className="text-gray-500">No availability data found.</p>
        ) : (
          <div className="grid gap-4">
            {Array.from(byCleanerMap.entries()).map(([cleanerId, slots]) => (
              <div key={cleanerId} className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-semibold text-gray-900 mb-3">
                  {profileMap.get(cleanerId) ?? cleanerId}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {slots.map(slot => (
                    <span key={slot.id} className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1.5 rounded-full">
                      {DAY_NAMES[slot.day_of_week]} · {slot.start_time}–{slot.end_time}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
