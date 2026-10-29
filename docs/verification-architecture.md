# Verification — design note (not built)

*Written 2026-10-29 as part of onboarding overhaul phase 5 (C20, C21). Nothing here changes how the app behaves today: the only code is a switch that is **off** and a check that does nothing while it is off.*

## Where we are

- Every account is a **test account** (`profiles.is_test_account = true`). Email confirmation is off; `profiles.phone` is just text; nothing about a contact is verified.
- A person is "approved" by an admin (cleaner application / host `status`). **Approved is not verified** and is never labelled that way.
- **Cindy Verified** is a separate, manual badge set only by an admin (`setCindyVerified`). It is a human decision, not a contact check.
- Sign-up is saved step by step on the server (phases 3–4), so a verification step can be added to the wizard later without redesigning it.

## Keep these apart

| State | Meaning | Where it lives |
|---|---|---|
| Account exists | someone can sign in | `auth.users` |
| Contact verified | an email / phone proved to be theirs | `contact_methods.verified_at` (to build) |
| Approved | an admin let them in | cleaner application / `customers.status` (today) |
| Cindy Verified | an admin vouches for them | `cindy_verified_at` (today, manual) |
| Identity verified | a real-world check passed | later, only if the market needs it |
| Profile complete / listed | the profile is usable | computed (`lib/listing.ts`), not stored |
| Eligible to book / accept | the rules are met | computed (`lib/verification.ts`) |

## Model to build later

`contact_methods(id, user_id, type 'email'|'phone'|'whatsapp', value_normalized, verified_at, is_primary, provider_ref, created_at)`

- Many per account. A **unique index on the normalised value where `verified_at is not null`**, so one real phone/email cannot be verified on two accounts.
- RLS: a person reads their own rows; writes only through server code (service role).
- Backfill: one row per existing account's email with `verified_at = null`. No sign-in changes.

Provider interface, one adapter per channel so they are swappable:

```ts
interface ContactVerifier {
  sendCode(type: 'email' | 'phone' | 'whatsapp', to: string): Promise<{ ref: string }>
  checkCode(ref: string, code: string): Promise<boolean>
}
```

Codes: short-lived, single use, attempt-limited, and rate-limited per account **and** per destination (SMS/WhatsApp cost money and can be abused).

## Order of work

1. Email: confirm the address a person signed up with (Supabase can send the link) and record it in `contact_methods`.
2. Phone: SMS code; WhatsApp where supported, the person chooses.
3. Show each as its own small, accurate badge ("Email confirmed", "Phone confirmed") — never a generic "verified".
4. Only then flip the switch below.
5. Identity checks only if the market demands them.

## The switch (built, off)

`REQUIRE_VERIFIED_CONTACT` in `lib/features.ts` (default `false`). `lib/verification.ts` → `contactVerificationBlock` is called when a host **sends** a request (`createBooking`) and when a cleaner **accepts** one (`respondToBooking`).

- **Off:** nothing is read; everyone is eligible.
- **On:** test accounts stay eligible (so the smoke-test users are not locked out); a real account needs a verified `contact_methods` row. **It fails closed** — if the table cannot be read, the person is asked to verify. So do not turn it on before `contact_methods` exists and the wizard can verify.
- Existing bookings, chat, cancellation and declining a request are never gated.

## Rules to keep

- Never show "verified" from `email_confirmed_at` or from approval.
- Do **not** enable account linking by email in Supabase Auth until emails are verified (an unverified address could otherwise be linked to someone else's Google identity).
- Before launch: flip the `is_test_account` default to false for new accounts and decide what to do with existing test users.
- Messages and notifications must not reveal whether a phone/email is registered to someone else.
