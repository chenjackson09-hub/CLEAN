# To-do list before the pilot — written 2026-11-03

## A. GitHub (do first — nothing else can go live until this is done)
1. Create a Personal Access Token: github.com → profile picture → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → tick **repo** → copy it.
2. In the Terminal tab "git check" (it is waiting at `Username for 'https://github.com':`): type `chenjackson09-hub`, then paste the token at `Password:`.
3. Check https://github.com/chenjackson09-hub/CLEAN/commits/main — the top commit should be "feat: 'Add to Google Calendar' on the cleaner's 'Request accepted' panel". (7 commits are waiting.)
4. Vercel → project → Deployments: the newest deployment should become **Ready** within a few minutes. If it says **Error**, open the build log and send it to Claude.
5. Optional: `git config --global credential.helper osxkeychain` (already run) so the Mac remembers the token.

## B. Open GitHub issues (15) — what they are
Still real:
- #8 / #28 **Reset password** (marked "!!" and also "wontfix" — decide: for a real launch people need it). NOT built.
- #12 **Legality of the website** — terms/privacy drafted (DRAFT); a lawyer / Israeli-law check is still needed.
- #11 **Translate** — Hebrew exists everywhere new, but a native speaker must review it.
- #41 **Gallery on the customer profile too** — gallery is switched off for now (GALLERY_ENABLED=false); home photos exist (private).
- #33 **Languages in the filter**, #29 **Update filter** — the browse filters were removed in the one-calendar redesign; decide if wanted.
- #23 **"Talked / haven't yet talked"** on the cleaner home — not built.
- #20 **CLEANER – HOME** (2 of 3 sub-issues done) — home page re-ordered this week; #23 is the open one.
Probably can be closed: #40 (notes on reviews — written reviews exist on both sides), #25 (duration mechanism — marked invalid), #1–#4 (old "Foundation / Cleaner domain / Customer domain" epics).

## C. Reminders / next items
1. **Improve host profile** — paste your prepared prompt to Claude.
2. **Auto-refresh every 2 minutes** — options explained; waiting for a decision (see chat).
3. **Attach the final agreement** — send the real Terms / Privacy text (lawyer-reviewed) → replace `lib/legal/content.ts` and set `LEGAL_DRAFT = false`.
4. **Delete all existing hosts and cleaners (they are not real)** — keep the admin account(s). The admin "delete" soft-suspends cleaners and adds people to the blocked list, so it is better done from Supabase (Authentication → Users + related rows/storage) or with a script that has a dry-run. Also at launch: make new accounts `is_test_account = false`.
5. **Make sure Google sign-in works on the live site** — Supabase Google provider on; Google Cloud OAuth redirect URI `https://<project>.supabase.co/auth/v1/callback`; `https://clean-roan.vercel.app/auth/callback` in Supabase Auth → Redirect URLs; Vercel `NEXT_PUBLIC_SITE_URL` = the real site address. Then test a brand-new Google account end to end (role screen with the agreement box → wizard).
6. **Email check with a code when registering** — not built. Needs: Supabase "Confirm email" ON with a code (OTP) in the email template, a real email sender (Resend + a verified domain; Supabase's built-in sender is rate-limited), and a new "enter the code" screen in /register before the wizard. Today email confirmation is OFF, so the two must be done together.
7. **Cancellation emails** — still on hold (decide again once real emails exist).
