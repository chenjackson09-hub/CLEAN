# Cindy — Sign-up, Onboarding & Profile Review (Stage 1: recommendations only)

*Written 2026-10-26 from the actual code and database. **Nothing has been changed.** Every recommendation has an ID (C1…C28) in Part 10 so each can be approved, rejected, modified or deferred on its own.*

**How I checked:** I read both wizards (`register/cleaner`, `register/customer`), the account step (`register/page.tsx`), the Google path (`onboarding` + `completeOnboarding`), the signup trigger, both profile editors, both public profile components, the request/booking modals, the admin applications screen, the completeness helper, and I queried the live database (4 hosts, 1 cleaner, all test accounts). Where the product description and the code differ I say so.

---

## Part 1 — Overall assessment

### What is working
- **The core idea is right.** Matching only needs *where* (town + travel radius), *when* (availability calendar) and *what it costs* (rate). The wizards already capture those. Everything else is "help two strangers feel comfortable", which is the right job for a profile.
- The cleaner wizard (one question per screen, progress bar, "continue later") and host wizard (grouped steps) are both easy to follow on a phone.
- The town picker is strong: official list, Hebrew + English, and the host is never asked for a street at sign-up.
- Admin approval for both roles, the private chat for exact details, and ratings/cleans-completed are real trust signals that cost the user nothing.

### What is unnecessary or in the wrong place
- **Cleaner:** "Where are you available to work?" (17 regions) is **required** but nothing uses or shows it. "Times per week" is private planning data nobody reads. Car + gas return are three questions for one optional line on the profile.
- **Host:** most of "Your household" and "Preferences" describes *a cleaning request*, not a person: cleaning priorities, usual cleaning type, frequency, home instructions. The booking request card already asks for cleaning type, extras, pets-present and notes. Making someone describe their whole home before they can look at a single cleaner is the biggest drop-off risk in the host flow.

### What is missing
- **Languages for hosts are collected but never shown**, while cleaners' languages are shown. Hosts and cleaners coordinate by chat, so language is one of the most useful things to know on *both* sides.
- **Years of experience** exists on the cleaner profile but is never asked at sign-up.
- No guided introduction ("About me" is an empty box), which is why most bios will be empty or thin.
- No "profile ready to be listed" definition (photo, rate, availability) — today a cleaner can be approved with no location and be invisible to every host.

### What creates friction
1. **Nothing is saved until the very end.** The account is created only when the wizard finishes (or the user taps "Yes, continue later"). Answers live in browser memory only. Closing the tab, a phone call, or a crash loses everything, and no account exists. "Resume" today only works if the user chose the explicit exit button.
2. **The email + password sit in `localStorage` in plain text** (`pending_signup`) for the whole wizard. Acceptable for a smoke test, not for launch.
3. **Google sign-up is a different, thinner product** (role + name + phone, then a mostly empty profile). A Google cleaner has no town, so hosts can never see them.
4. The progress bar starts at 20% and jumps by "answered" counts, so it doesn't tell people how many screens are left.

### What creates trust (keep)
Photo, rating and cleans completed, a real "About me", the private chat for the exact address, admin approval, reviews from cleaners on host profiles.

### Privacy/safety concerns (verified in code)
1. **The exact street address reaches the cleaner at request time**, before they accept (`RequestGroupRow` shows `selected.address`).
2. **The host profile card prints `customer.address` under the name.** The wizard only stores the town, but the host's `/profile` editor can add a street, and then the cleaner sees it.
3. **"✓ Verified host" only means "an admin approved the signup"** (`customers.status = 'approved'`). Nothing about identity or contact is verified. That label will mislead real users.
4. The host wizard promises *"Kept private from cleaners where appropriate"* for the last name. **It is not enforced anywhere** — cleaners see the full name.
5. The host wizard says priorities are *"not shown on your profile"* — they **are** shown ("Usually clean").

### What to prioritise
Fix honesty and privacy first (small, safe), then make the wizard save as it goes and unify Google with the normal path (the one structural change), then shorten both wizards by moving "request-type" questions into the booking request.

---

## Part 2 — Field audit

### Cleaner (15 wizard questions + what's missing)

| # | Field | Today | Recommendation | Why |
|---|---|---|---|---|
| 1 | Name | required, public | **Keep** (merge with photo + birth date on one screen) | Core identity. |
| 2 | Photo | optional, public | **Keep, nudge hard; required to be *listed*** (Stage C), not to sign up | Strongest trust signal. |
| 3 | Birth date | required, shows age | **Keep** (same screen as name), copy "Only your age is shown" | Needed for the under-18 process. |
| 4 | Town | required | **Keep** | Matching + trust. |
| 5 | Travel radius | optional | **Combine** with town on one "Where you work" screen | One idea, two inputs. |
| 6 | Cleans per week | optional, private | **Move later** (Settings / availability setup) | Planning only; adds a screen for nobody. |
| 7 | Hourly rate | optional | **Keep; required to be listed** | Price clarity is what hosts compare first. |
| 8 | Min job length | optional | **Combine** with rate and max on one "Rate & hours" screen | |
| 9 | Max job length | optional | **Combine** (as above) | |
| 10 | Cleaning services | required, 16 options | **Improve:** fewer, grouped options (~11) | Long list = noise; "Pet-friendly" kept. |
| 11 | Recurring / occasional | required | **Improve:** optional, default "Either is fine" | Not needed to be useful; checking both = either. |
| 12 | Car | optional | **Combine** into a "Getting there" screen with radius + reimbursement | |
| 13 | Gas return | optional, conditional | **Keep** (conditional, same screen) | Already shown on the profile. |
| 14 | Work regions | **required, unused** | **Remove from sign-up and from the completeness bar** (keep column) | Blocks sign-up for nothing. |
| 15 | About me | optional | **Improve:** guided prompts (Part 3) | Empty box = empty profile. |
| – | **Languages** | profile edit only | **Add to the wizard** (chips) | Shown on profile already; matters for chat. |
| – | **Years of experience** | profile edit only | **Add** (5 cards) | Shown on profile already; cheap, credible. |
| – | Phone | profile edit only | **Don't ask now**; collect later with verification | Not shown, not used. |
| – | Availability | separate screen | **Keep separate**; wizard ends by sending them there with a checklist | It is what actually makes them bookable. |

### Host

| Field | Today | Recommendation | Why |
|---|---|---|---|
| Photo | optional | **Keep** | Trust, symmetrical with cleaners. |
| First / last name | required | **Keep.** Be honest about who sees what (C1) | Last-name privacy is promised but not built. |
| Phone | optional, "for Cindy" | **Remove from sign-up** (Settings, later, verification) | Not shown/used; reduces fear of sharing it. |
| Languages | collected, **not shown** | **Keep + show** (chips) | Cleaners need it. |
| About me / household | optional | **Improve:** guided prompt, 1–2 lines | |
| Town | required | **Keep** (no street ever at sign-up) | |
| Home type | optional | **Keep** | Core job-size info. |
| Bedrooms / bathrooms | optional | **Keep** | Core job-size info. |
| Floors, size m² | optional | **Move to "More details (optional)"** | Useful, not essential. |
| People in home | optional | **Move to "More details"** | |
| Pets (types) | optional | **Keep**, early | Allergy/comfort deal-breaker for some cleaners. |
| Pet count / note / photo | optional | **Collapse under pets** | Only when pets = yes. |
| Frequency | optional, **unused** | **Remove from sign-up** (ask in the request when relevant) | |
| Usual cleaning type | optional | **Remove from sign-up**; the request card defaults to Regular | Only used as a default. |
| Cleaning priorities | optional, shown | **Move to the booking request** ("what matters this time") | It's a request, not a profile. |
| Home instructions | optional, shown | **Move to "Home notes" shown only after a request is accepted** | Private booking detail. |
| Street address | profile edit | **Never on the profile card;** per-request, revealed after accept | Privacy. |

---

## Part 3 — Recommended Cleaner wizard (≈ 3–4 minutes)

**Global rules (apply to every screen):** header shows "Step 3 of 9" plus a bar; **Continue** (primary) and **Back** (secondary) sit in a fixed bar at the bottom within thumb reach; optional screens show a text link "Skip for now" under Continue; every Continue saves that screen to the server (C6); answers are validated when the field loses focus; the only red text is next to the field with the problem; all copy exists in English and Hebrew (Hebrew produced on approval).

**Stage A — Account (before step 1):** *Email, Password, Confirm* (as today, duplicate-email check kept). Role already chosen on the previous screen. The account is created **here**, so everything after is saved.

| Step | Screen / supporting text | Questions & input | Required | Saved to → shown on |
|---|---|---|---|---|
| 1 | **"Let's start with you"** — *This is how hosts will first see you.* | Photo (camera / library / computer, with a live round preview; tip "A clear photo of your face"). Full name (text). Birth date (3 selects: day/month/year). Note: *"Only your age is shown, never your date of birth."* | Name ✔, birth date ✔, photo optional (needed to be *listed*) | profile name/photo, birth date → name, photo, **age** on profile |
| 2 | **"Where do you work?"** — *Hosts near you will find you.* | Town (the existing picker, Hebrew/English). "Can't find it — type it" fallback stays. | ✔ | address, town link, coordinates → town on profile |
| 3 | **"Getting there"** — *How far will you travel?* | Travel radius slider (1–50 km by road, default 10, live sentence "Hosts within 10 km of {town} can find you"). **Do you have a car?** two cards (Yes / No). *If yes:* **"Do you ask hosts to cover fuel?"** cards (Yes / No); *if yes:* amount per km (default ₪1). | radius default ok; rest optional | radius → matching only. Car + fuel → "Travel reimbursement" line |
| 4 | **"What do you clean?"** — *Pick everything you're happy to do.* | Chips, grouped: *Home:* Regular cleaning, Deep cleaning, Windows, Laundry & ironing, Move-in / move-out, Post-renovation, Pesach & holidays. *Other places:* Airbnb & guesthouses, Offices & commercial. *Also:* Pet-friendly, Organizing. "Other" opens a one-line field. | ✔ at least one | cleaning categories → "Cleaning services" pills |
| 5 | **"Your rate and hours"** — *Hosts see this before they ask.* | Hourly rate (₪, numeric keypad, hint "Most cleaners in your area charge ₪X–Y" once we have data; for now a plain hint). Shortest job you'll take (stepper, default 3 h). Longest job (stepper, default 5 h) + checkbox "No limit". | Rate required to be listed | rate, min/max hours → rate tile + "Job duration" |
| 6 | **"Your experience"** — *Helps hosts know what to expect.* | Years cleaning: 5 cards (*New to cleaning · Under 1 year · 1–3 · 3–5 · 5+*). Languages: chips (Hebrew, English, Russian, Arabic, Amharic, French, Spanish) + "Other". | both optional | years of experience, languages → "Experience", "Languages" |
| 7 | **"What kind of work do you prefer?"** | 3 cards, multi-select: *A regular family I keep coming back to · Jobs once in a while · Either is fine* (default). | optional | match preferences → "Looking for" |
| 8 | **"Tell hosts about yourself"** | Three optional prompts, each a short field with a tap-to-use starter: ① *"How long have you been cleaning, and what are you known for?"* ② *"What should a host know about how you work?"* ③ *"A little about you outside work (study, hobbies)…"*. Below, one editable box that assembles the answers in order; the user can edit freely. Character counter, 500 max. **No AI**: starters are fixed sentences like "I take pride in…", the user completes them, so nothing is invented. | optional (strongly encouraged) | bio → "About me" |
| 9 | **"Your profile"** (preview) | Exactly what hosts will see (Part 5). A tap on any section jumps back to its step. Button: **"Submit for review"**. Under it: *"You'll be able to set your available days next."* | – | submits application |

**After submit:** land on the availability calendar with a 3-item checklist — *Photo added · Rate set · At least one available day* — which is the definition of "listed" (Stage C). Existing welcome bubble stays.

**Removed from the wizard:** work regions, cleans per week (move to Settings), phone, separate "car/gas/rate gas" screens. Result: **9 screens instead of 15 questions**, with languages and experience added.

**Resume:** because every Continue saves, a returning user lands on the first unfinished step with the banner "Finish your profile — 4 of 9 done".

---

## Part 4 — Recommended Host wizard (≈ 2 minutes)

**Minimum viable host profile = a name, a town, the size of the job, and whether there are pets.** Everything else is optional or belongs to a booking.

| Step | Screen / supporting text | Questions & input | Required | Saved → shown to cleaners |
|---|---|---|---|---|
| A | Account | Email, password, confirm (as today) | ✔ | – |
| 1 | **"About you"** — *Cleaners see this when you send a request.* | Photo (optional, recommended). First name ✔, Last name ✔. Languages (chips + Other). One-line intro (optional), starter *"We're a family of … who need help with …"*. Honest note under last name: *"Cleaners see your full name once you send a request."* (or "first name and initial" if C23 is approved). | names ✔ | profile + customer → name, photo, languages, About |
| 2 | **"Where is your home?"** — *Cleaners see only your town until you confirm a booking.* | Town picker. **No street field anywhere in the wizard.** | ✔ | town link → town |
| 3 | **"Your home"** | Home type: 5 cards (Apartment · House · Villa · Guesthouse/Airbnb · Office). Bedrooms and bathrooms: steppers. A collapsed row **"More details (optional)"**: floors, size m², people living there. | type + bedrooms + bathrooms recommended, not blocking | home details → "Home at a glance" |
| 4 | **"Pets"** | 4 cards: *No pets · Dog · Cat · Other* (multi). *If any pet:* how many; "Anything cleaners should know?"; photo (optional). | optional | pets → "Pets" |
| 5 | **"Your profile"** (preview) | What cleaners will see (Part 5); per-section "Edit". Button: **"Start finding cleaners"**. | – | submits for approval (as today) |

**Moved out of sign-up:**
- *Cleaning priorities, usual cleaning type, frequency* → the **request card** ("What matters this time" chips next to the existing extras). Frequency is dropped (unused).
- *Home instructions* → stored as **Home notes**, editable in the profile, **shown to the cleaner only after they accept** (private booking detail).
- *Phone* → Settings, later, with verification.

**Does the cleaner get enough to decide?** Before accepting they see: first name + photo + town, rating/cleans, home size, pets, languages, intro, and the request itself (date, time, duration, extras, cleaning type, notes). That is enough to decide; the street and home notes are the only things held back.

---

## Part 5 — Final profiles (structure only, mobile)

### Cleaner profile — what the host sees
```
┌ [Photo]  Name, age                    ┐
│ 📍 Town        ★ 4.8 · 23 cleans      │
│ ₪80 / hour                            │
├ KEY FACTS (one row, wraps) ───────────┤
│ 3 years · Hebrew, English · 3–5 h jobs│
├ ABOUT ME  (4 lines, "Read more") ─────┤
├ WHAT I CLEAN (pills) ─────────────────┤
├ GOOD TO KNOW ─────────────────────────┤
│ Looking for … · Fuel ₪1/km · 2.4 km   │
├ PHOTOS (gallery) ─────────────────────┤
├ REVIEWS (when they exist) ────────────┤
└ [ Request a clean ] (sticky) ─────────┘
```
Shown first: face, price, rating — what decides a click. **Hidden:** birth date, radius, weekly target, phone, email, coordinates.

### Host profile — what the cleaner sees
**Before accepting (request open):**
```
┌ [Photo]  First name (+ initial)       ┐
│ 📍 Town        ★ 4.9 · 12 cleans      │
│ "Approved by Cindy" (honest label)    │
├ THIS REQUEST ─────────────────────────┤
│ date · start time · about 3 h · extras│
├ ABOUT US (intro, languages) ──────────┤
├ HOME AT A GLANCE ─────────────────────┤
│ Apartment · 3 bedrooms · 2 bathrooms  │
├ PETS (types, note, photo) ────────────┤
├ REVIEWS FROM CLEANERS ────────────────┤
├ 🔒 Exact address and home notes are   │
│    shared once you accept             │
└ [ Accept ]   [ Decline ] ─────────────┘
```
**After accepting:** full name, street address (for this booking only), Home notes, and a one-tap link to the private chat.
**Never shown on any profile:** phone, email, date of birth, coordinates, a street address on the profile itself.

---

## Part 6 — Trust strategy

### Phase 1 — smoke test (no verification)
- **Honest labels.** Replace "✓ Verified host" with **"Approved by Cindy"** (what it actually means), or hide it. Never show a "verified" mark on a test account.
- **Trust from real behaviour:** rating, cleans completed, member-since, a real About, photo, languages, experience. These are earned, not claimed.
- **A short, plain note** on the first wizard screen: *"You're using the Cindy test version — details can be sample data."* Honest about test data, no friction.
- **Visibility tiers** (Part 7 table) so strangers see only what they need at each stage.
- **Profile completeness is not trust:** the bar only says "ready to be listed"; it is never worded as "trusted".

### Phase 2 — production
Add, in this order: email verification → phone verification (SMS, WhatsApp where supported, user chooses) → identity check *only if* the market needs it. Each shows as its own small, accurate badge ("Email confirmed", "Phone confirmed"). Statuses are separate (Part 7).

---

## Part 7 — Technical architecture

### What exists today (verified)
- `auth.users` (email, password, Google identity) → trigger `handle_new_user` creates `profiles` + `customers`, or `cleaners` + `cleaner_applications`, **at the moment of sign-up**. Role is stored on `profiles.role`; one account = one role.
- Today the wizards call `signUp` **at the end**, and write with the browser's own database client (no server validation).
- Email confirmation is **off**; `phone` is just a text column on `profiles`; nothing is marked verified; there is no "test account" marker.
- `cleaner_applications.id_document_url` exists and the admin screen links to it, but **no wizard ever collects an ID** — a dead link.

### Immediate safeguards (cheap, now)
1. **Create the account at the start of onboarding** and save each step (C6). This removes data loss and the plaintext password in `localStorage`.
2. **One wizard, two doors:** the same wizard runs for an already-signed-in user (Google) — so Google and email sign-ups converge (C7).
3. **`onboarding_completed_at`** (nullable timestamp, filled when the user submits) so the admin Applications screen can hide or tab "unfinished" sign-ups instead of listing every abandoned one (C16, C18). Existing test accounts are backfilled as completed. *Additive, safe.*
4. **Server-side validation** for wizard saves (one `saveOnboardingStep` action) so required rules aren't only in the browser (C17).
5. **Ship behind a flag** (`ONBOARDING_V2`): the old wizard route stays until the new one is tested on test accounts.
6. Don't assume an email or phone is real anywhere in new UI; never display "verified" from `email_confirmed_at`.

### Future verification (designed now, built later)
Keep four ideas **separate** (they are not interchangeable):

| State | Meaning | Where it will live |
|---|---|---|
| Account exists | someone can sign in | `auth.users` (today) |
| Contact verified | an email/phone proved to be theirs | new `contact_methods` rows with `verified_at` |
| Identity verified | a real-world check passed | separate, later, only if justified |
| Profile complete | the required fields are filled | **computed**, not stored |
| Eligible to book / accept | rules met | **computed** from the above + a config switch |

Conceptual model (not building it):
- `contact_methods(user_id, type = email | phone | whatsapp, value_normalized, verified_at, primary, provider_ref)` — many per account; unique on *verified* normalized value to prevent duplicate accounts.
- `profiles.is_test_account` (boolean, default **true** for all current rows, set false for real launch users). Test accounts can never be shown a verified badge.
- A small provider interface `sendCode(method, to) / checkCode(...)` with one adapter per channel, so email, SMS and WhatsApp are swappable.
- A single switch `REQUIRE_VERIFIED_CONTACT` (**off** during the smoke test) consulted by the "eligible to book/accept" check. Turning it on later cannot lock out existing test accounts unless you choose to.
- Migration path: backfill `contact_methods` from existing emails with `verified_at = null`, mark everything `is_test_account = true`. No existing sign-in changes. Don't enable Supabase account-linking by email until emails are verified (otherwise an unverified email could be linked to someone else's Google identity).

**Defer:** `contact_methods`, providers, gating, identity checks. **Do now:** C6, C7, C16, C17, plus keeping phone/email out of new assumptions.

### Risks and how to avoid them
| Risk | Mitigation |
|---|---|
| Breaking existing test accounts | All DB changes additive/nullable; backfill; old wizard behind the flag |
| Duplicate profile creation | The trigger already creates skeleton rows; the wizard only *updates* them (as `upsert` does today) |
| Half-finished accounts clutter admin | `onboarding_completed_at` + admin filter |
| Required-field drift between wizard and profile editor | Share the option lists (services, languages, home types) in one place; don't over-abstract |
| Invalid "required" assumptions (work regions) | Remove from required and from the completeness bar |
| Exposing private info | Visibility tiers in the profile components; tests assert street/phone/birth date never render |
| Google regressions | Covered by tests for: email sign-up, Google new user, Google returning user, resume mid-wizard |

---

## Part 8 — Priorities

| P | Change | User impact | Complexity | Risk | Depends on | When |
|---|---|---|---|---|---|---|
| **P0** | C1 honest copy fixes | Medium | Very low | None | – | Now |
| **P0** | C2 "Verified host" → "Approved host" | Medium | Very low | None | – | Now |
| **P0** | C3 host card shows town only | High (privacy) | Low | Low | – | Now |
| **P0** | C5 drop work regions from required + completeness | Medium | Low | Low | – | Now |
| **P1** | C4 address revealed after accept | High (privacy) | Medium | Medium (touches request flow) | – | Before real users |
| **P1** | C6 account at start + save per step + resume | **Very high** | High | Medium | – | Next big build |
| **P1** | C7 Google joins the same wizard | High | Medium | Medium | C6 | After C6 |
| **P1** | C8 cleaner wizard (9 screens) | High | Medium | Low–Med | C6 | With C6 |
| **P1** | C9 host wizard (4 screens) + move request-type questions | High | Medium | Low–Med | C6 | With C6 |
| **P1** | C10 languages both sides | Medium | Low | Low | – | With C8/C9 |
| **P1** | C11 phone out of sign-up | Low–Med | Very low | Low | – | With C9 |
| **P1** | C12 guided About me | Medium | Low | Low | – | With C8 |
| **P1** | C13 progress, bottom bar, skip, inline errors | High | Low–Med | Low | – | With C8/C9 |
| **P1** | C14 preview with per-section edit | Medium | Medium | Low | C8/C9 | With C8/C9 |
| **P1** | C15 host profile tiers (locked section) | Medium | Low | Low | C4 | After C4 |
| **P1** | C16 `onboarding_completed_at` + "Finish your profile" banner | High | Low–Med | Low | C6 | With C6 |
| **P1** | C25 "ready to be listed" checklist (photo, rate, availability) | High | Low–Med | Low | – | With C8 |
| **P1** | C27 services list 16 → ~11 grouped | Low–Med | Low | Low | – | With C8 |
| **P1** | C17 server-side validation action | Medium | Medium | Low | C6 | With C6 |
| **P1** | C18 admin: unfinished sign-ups tab | Medium | Low | Low | C16 | With C16 |
| **P2** | C19 `is_test_account` + test banner | Medium (honesty) | Low | Low | – | Before first real user |
| **P2** | C20 contact methods + providers (design only) | – | High | – | C19 | Plan, don't build |
| **P2** | C21 `REQUIRE_VERIFIED_CONTACT` gate (off) | – | Low | Low | C20 | With C20 |
| **P2** | C28 shared option lists | Low | Low | Low | – | Anytime |
| **P3** | C22 host text reviews of cleaners | Medium | Medium | Low | – | Later |
| **P3** | C23 first name + initial until confirmed | Medium | Medium | Low | – | You deprioritised; keep parked |
| **P3** | C24 one person, two roles | Low | High | Med | – | Later |
| **P3** | C26 remove/define the ID-document link | Low | Low | Low | – | Later |

---

## Part 9 — My preferred solution

*If I were responsible for Cindy's product experience, this is what I'd build:*

1. **Create the account on screen one, then save as you go.** It's the single change that removes the most frustration (lost answers), the biggest security smell (password in the browser), and the Google/email split — because everyone, however they arrive, ends up in the *same* signed-in wizard.
2. **Make sign-up about the person, and the booking about the job.** Cleaners: 9 short screens, ending at their calendar. Hosts: 4 short screens, and the cleaning-specific questions appear when they actually send a request.
3. **Reveal by stage.** Strangers see a first name, a photo, a town and the facts that matter. The street address and home notes unlock when a cleaner accepts. Nothing says "verified" until something actually is.
4. **Prepare, don't build, verification.** Add the cheap markers now (completion timestamp, test-account flag), keep email/phone out of every assumption, and write the verification tables only when you're ready to launch.

**Trade-offs I'm accepting:** per-step saving creates more partial accounts, which I handle with a completion timestamp and an admin filter; moving questions into the booking request makes the first request slightly longer, but only for people who actually send one; hiding the street until accept means a cleaner judges travel by town only (usually enough, and the radius already limits it).

---

## Part 10 — Changes for your approval

*Reply with the IDs and your choice (Approve / Reject / Modify / Defer).* "DB?" = whether a database change is likely.

| ID | Current → Recommended | Why | P | Complexity | Risk | Affects | DB? |
|---|---|---|---|---|---|---|---|
| **C1** | Host wizard promises last-name privacy and "priorities not shown", both false → reword both to match reality | Honesty | P0 | Very low | None | host wizard copy (EN+HE) | No |
| **C2** | "✓ Verified host" → "Approved by Cindy" | It only means admin-approved | P0 | Very low | None | `HostProfileCard` | No |
| **C3** | Host card prints `address` (can include a street) → show town only | Privacy | P0 | Low | Low | `HostProfileCard`, `/profile` | No |
| **C4** | Cleaner sees street at request time → town only until accept; street + home notes after | Privacy | P1 | Medium | Medium | request modal, `BookingRequestSummary`, dashboard modal | No |
| **C5** | Work regions required + in completeness → not asked, not counted (column kept) | Blocks sign-up for nothing | P0 | Low | Low | cleaner wizard, `profileCompleteness`, profile form | No |
| **C6** | Account created at the end; answers only in memory → account at start, save each step, resume | Data loss, plaintext password | P1 | High | Medium | `register/*`, new save action | No (maybe) |
| **C7** | Google = thin separate path → same wizard in signed-in mode | One experience, Google cleaners become visible | P1 | Medium | Medium | `onboarding`, callback, wizards | No |
| **C8** | 15 cleaner questions → 9 screens; add languages + experience; match optional | Shorter, more useful | P1 | Medium | Low–Med | cleaner wizard | No |
| **C9** | 5 host steps → 4 + preview; priorities/frequency/type/instructions leave sign-up | Host onboarding is a request, not a profile | P1 | Medium | Low–Med | host wizard, `BookingRequestForm`, `HostProfileCard` | No |
| **C10** | Host languages hidden → asked (chips) and shown to cleaners; cleaner languages as chips | Chat coordination | P1 | Low | Low | both wizards/profiles | No |
| **C11** | Host phone asked at sign-up → removed (Settings later) | Not used or shown | P1 | Very low | Low | host wizard | No |
| **C12** | Empty About box → three guided prompts + editable result (no AI) | Better intros | P1 | Low | Low | both wizards | No |
| **C13** | % bar, inline buttons → "Step X of N", fixed Back/Continue bar, Skip links, field-level errors | Mobile usability | P1 | Low–Med | Low | both wizards | No |
| **C14** | Host preview step only → both roles: exact public preview with per-section Edit | Confidence before submit | P1 | Medium | Low | both wizards | No |
| **C15** | Host profile all-or-nothing → request-stage vs after-accept sections with a locked placeholder | Staged reveal | P1 | Low | Low | `HostProfileCard`, modals | No |
| **C16** | No notion of "finished" → `onboarding_completed_at` + "Finish your profile" banner + resume at first unfinished step | Resume | P1 | Low–Med | Low | profiles, layouts | **Yes** (nullable column, backfilled) |
| **C17** | Wizard writes straight from the browser → server action validates each step | Safety | P1 | Medium | Low | new action | No |
| **C18** | Admin Applications lists everything → unfinished sign-ups in their own tab | Admin clarity | P1 | Low | Low | admin applications | No (uses C16) |
| **C19** | No test-account marker → `is_test_account` (default true) + honest note on first screen | Future-proof, honesty | P2 | Low | Low | profiles, wizard copy | **Yes** |
| **C20** | Verification not designed → `contact_methods` + provider adapters (design only now) | Email/SMS/WhatsApp later | P2 | High | – | – | Later |
| **C21** | – → `REQUIRE_VERIFIED_CONTACT` switch, off | Safe gating | P2 | Low | Low | config | No |
| **C22** | Hosts leave numeric ratings only → short written review of a cleaner | Trust asymmetry | P3 | Medium | Low | host rating UI, profile | Maybe |
| **C23** | Full names shown → first name + initial until confirmed (both roles) | Privacy (parked per you) | P3 | Medium | Low | many surfaces | Maybe |
| **C24** | One role per account → allow a second role later | Rare need | P3 | High | Med | auth | Yes |
| **C25** | Cleaner can be approved with no photo/rate/availability → checklist; "listed" = all three | A listing hosts can act on | P1 | Low–Med | Low | cleaner dashboard, browse | No |
| **C26** | Dead "ID document" link in admin → remove, or define with future identity checks | Cleanliness | P3 | Low | Low | admin applications | No |
| **C27** | 16 service options → ~11 grouped | Less noise | P1 | Low | Low | cleaner wizard/profile | No |
| **C28** | Option lists defined twice (wizard + profile editor) → one shared list | Prevent drift | P2 | Low | Low | both | No |

### Questions I need you to decide
1. **C4:** OK for the cleaner to see only the town until they accept?
2. **C2:** "Approved by Cindy", or hide the badge entirely during testing?
3. **C9:** OK to move cleaning priorities/frequency out of host sign-up and into the request?
4. **C6:** Comfortable with per-step saving (and the unfinished-sign-ups tab for admin)?
5. **C12:** Fixed sentence starters for About me (my recommendation), or leave it free-text for now?
