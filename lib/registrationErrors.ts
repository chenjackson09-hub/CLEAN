// Supabase hides what a database trigger said and answers "Database error saving new user".
// Our own sign-up block (migration 0050) is one cause of that; a real outage is another. The
// person must never be told WHY (a blocked person learns nothing), so both read the same.
export function isNewUserRejected(message: string | null | undefined): boolean {
  return /database error (saving|creating) new user|registration_not_allowed/i.test(message ?? '')
}
