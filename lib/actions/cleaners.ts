'use server'
import { createClient } from '@/lib/supabase/server'
import type { CleanerFilters, CleanerResult } from '@/lib/types/cleaner'

export async function getCleaners(
  filters: CleanerFilters,
  customerLat: number,
  customerLng: number
): Promise<{ data: CleanerResult[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_available_cleaners', {
    p_lat: customerLat,
    p_lng: customerLng,
    p_day: filters.day,
    p_start: filters.start,
    p_end: filters.end,
    p_service_type: filters.type,
  })

  if (error) {
    console.error('getCleaners error:', error)
    return { data: null, error: 'Failed to fetch cleaners' }
  }

  return { data, error: null }
}

export async function getCustomerLocation(
  userId: string
): Promise<{ lat: number; lng: number } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('lat, lng')
    .eq('id', userId)
    .single()

  if (error) console.error('getCustomerLocation error:', error)
  if (!data?.lat || !data?.lng) return null
  return { lat: data.lat, lng: data.lng }
}
