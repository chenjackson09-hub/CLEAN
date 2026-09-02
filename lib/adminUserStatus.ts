// Shared "Active / Inactive / Blocked" classification used by the admin
// Cleaners/Customers/Admins list filters. "Inactive" mirrors the existing
// /admin/inactive page's "no login in 30 days" rule (falling back to
// account age so brand-new users aren't flagged); that page's separate
// "no requests" bucket (customers only) is intentionally not folded in here
// — this filter uses one consistent definition across all three roles.

export type UserStatus = 'active' | 'inactive' | 'blocked'

const INACTIVE_CUTOFF_MS = 30 * 24 * 60 * 60 * 1000

export function isInactiveSince(lastSignInAt: string | null, createdAt: string): boolean {
  const ref = lastSignInAt ?? createdAt
  return new Date(ref).getTime() < Date.now() - INACTIVE_CUTOFF_MS
}

export function classifyUserStatus(input: {
  isBlocked: boolean
  lastSignInAt: string | null
  createdAt: string
}): UserStatus {
  if (input.isBlocked) return 'blocked'
  if (isInactiveSince(input.lastSignInAt, input.createdAt)) return 'inactive'
  return 'active'
}
