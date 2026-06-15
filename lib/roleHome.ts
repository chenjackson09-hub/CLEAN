import type { UserRole } from '@/types/database'

export const ROLE_HOME: Record<UserRole, string> = {
  customer: '/browse',
  cleaner: '/dashboard',
  admin: '/admin/applications',
}
