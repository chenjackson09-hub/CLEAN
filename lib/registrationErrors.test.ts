import { isNewUserRejected } from './registrationErrors'

describe('isNewUserRejected', () => {
  it('recognises the generic Supabase message for a rejected new user', () => {
    expect(isNewUserRejected('Database error saving new user')).toBe(true)
    expect(isNewUserRejected('database error creating new user')).toBe(true)
    expect(isNewUserRejected('registration_not_allowed')).toBe(true)
  })
  it('leaves other errors alone', () => {
    expect(isNewUserRejected('Password should be at least 8 characters')).toBe(false)
    expect(isNewUserRejected(null)).toBe(false)
    expect(isNewUserRejected(undefined)).toBe(false)
  })
})
