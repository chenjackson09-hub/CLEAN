import { CONTACT_NOT_VERIFIED_MESSAGE, contactVerificationBlock } from './verification'

type Result = { data: unknown; error: unknown }
const admin = (profile: Result, contacts: Result) =>
  ({
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not']) q[m] = () => q
      q.maybeSingle = async () => profile
      q.limit = async () => contacts
      return table === 'profiles' ? q : q
    },
  }) as never

describe('contactVerificationBlock', () => {
  it('lets everyone through while the switch is off (and reads nothing)', async () => {
    const boom = { from: () => { throw new Error('should not be read') } } as never
    expect(await contactVerificationBlock(boom, 'u1', false)).toBeNull()
  })
  it('never locks out a test account, even with the switch on', async () => {
    expect(await contactVerificationBlock(admin({ data: { is_test_account: true }, error: null }, { data: [], error: null }), 'u1', true)).toBeNull()
  })
  it('a real account needs a verified contact when the switch is on', async () => {
    expect(await contactVerificationBlock(admin({ data: { is_test_account: false }, error: null }, { data: [{ id: 'c1' }], error: null }), 'u1', true)).toBeNull()
    expect(await contactVerificationBlock(admin({ data: { is_test_account: false }, error: null }, { data: [], error: null }), 'u1', true)).toBe(CONTACT_NOT_VERIFIED_MESSAGE)
  })
  it('fails closed: if the contacts cannot be read, the person is asked to verify', async () => {
    expect(await contactVerificationBlock(admin({ data: { is_test_account: false }, error: null }, { data: null, error: { message: 'no table' } }), 'u1', true)).toBe(CONTACT_NOT_VERIFIED_MESSAGE)
  })
})
