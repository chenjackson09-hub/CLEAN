# To-do list before the pilot — updated 2026-11-09

## Done
- GitHub: pushing works through GitHub Desktop (repo folder `~/Documents/CLEAN`, NOT the old `~/Documents/GitHub/CLEAN`). Live site deploys from `main` on Vercel.
- Auto-refresh every 2 minutes on host and cleaner pages.
- Pushing now works over SSH (I can push when you say so). Migration 0045 applied. All fake hosts/cleaners deleted (only the admin account remains).
- Hebrew pass: "מארח" is the single word for host everywhere; plural/gender/terminology fixes across the app (still needs a native read, see A3).
- Improved host profile: household and cleaning-needs questions, generated "About us" paragraph (EN/HE), Typical needs block, 7-screen host wizard, bell notification asking existing hosts to fill in the new answers.

## A. Needs you
2. **Test the new host flow in a browser:** fresh host sign-up (7 screens, close the tab and sign in again to resume), edit an existing host's profile, "Write it for me" paragraph in English and Hebrew, the bell notification for an existing host.
3. **Hebrew review:** a native speaker should read all new Hebrew text (host questions, generated paragraph, notifications, legal pages).
5. **Make sure Google sign-in works on the live site** — Supabase Google provider on; Google Cloud OAuth redirect URI `https://<project>.supabase.co/auth/v1/callback`; `https://clean-roan.vercel.app/auth/callback` in Supabase Auth → Redirect URLs; Vercel `NEXT_PUBLIC_SITE_URL` = the real site address. Then test a brand-new Google account end to end (role screen with the agreement box → wizard).
6. **Attach the final agreement** — send the real Terms / Privacy text (lawyer-reviewed) → replace `lib/legal/content.ts` and set `LEGAL_DRAFT = false`.
7. **Delete the GitHub Personal Access Tokens** created earlier (GitHub → Settings → Developer settings → Personal access tokens). Not needed any more.

## B. Not built yet — decide
- **Reset password** (issues #8 / #28, marked "!!" and "wontfix"): people need it for a real launch.
- **Email check with a code when registering:** needs Supabase "Confirm email" ON with a code (OTP) in the email template, a real email sender (Resend + verified domain), and a new "enter the code" screen in /register before the wizard. Today email confirmation is OFF, so these must be done together.
- **Areas:** do NOT open the Northern Hula Valley region without an explicit go-ahead.

## C. Open GitHub issues — what they are
Still real:
- #8 / #28 Reset password (see B).
- #12 Legality of the website — terms/privacy are a DRAFT; a lawyer / Israeli-law check is still needed.
- #11 Translate — Hebrew exists everywhere new; needs native review (A3).
- #41 Gallery on the customer profile too — gallery is off for now (`GALLERY_ENABLED=false`); host home photos exist (private).
- #33 Languages in the filter, #29 Update filter — the browse filters were removed in the one-calendar redesign; decide if wanted.
- #23 "Talked / haven't yet talked" on the cleaner home — not built.
- #20 CLEANER – HOME (2 of 3 sub-issues done) — #23 is the open one.
Probably can be closed: #40 (written reviews exist on both sides), #25 (marked invalid), #1–#4 (old "Foundation / Cleaner domain / Customer domain" epics).

## D. On hold
- **Cancellation emails** (and the email part of Google Calendar) — on hold while testing with fake email addresses. Decide again once real emails are in use.
