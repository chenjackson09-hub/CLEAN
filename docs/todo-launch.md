# To-do list before the pilot — updated 2026-11-11

## Done
- GitHub: pushing works through GitHub Desktop (repo folder `~/Documents/CLEAN`, NOT the old `~/Documents/GitHub/CLEAN`). Live site deploys from `main` on Vercel.
- Auto-refresh every 2 minutes on host and cleaner pages.
- Pushing now works over SSH (I can push when you say so). Migration 0045 applied. All fake hosts/cleaners deleted (only the admin account remains).
- Hebrew pass: "מארח" is the single word for host everywhere; plural/gender/terminology fixes across the app (still needs a native read, see A3).
- Improved host profile: household and cleaning-needs questions, generated "About us" paragraph (EN/HE), Typical needs block, 7-screen host wizard, bell notification asking existing hosts to fill in the new answers.

- Email-code sign-up is LIVE (Supabase Confirm email ON, Gmail SMTP, sender "Cindy") and tested end to end by the owner. Google sign-in tested on the live site. New host flow tested in a browser.
- "Cancel registration" in the sign-up wizards (deletes your own unfinished account, back to /register).
- `scripts/delete-test-users.mjs --only <email>` removes one unfinished account (refuses admins and submitted sign-ups). The unfinished test account taibh050@gmail.com was deleted.

## A. Needs you
3. **Hebrew review:** a native speaker should read all new Hebrew text (host questions, generated paragraph, notifications, the email-code and cancel-registration text, legal pages).
6. **Attach the final agreement** — send the real Terms / Privacy text (lawyer-reviewed) → replace `lib/legal/content.ts` and set `LEGAL_DRAFT = false`.
7. **Reset the owner's password** (it was shared in chat earlier).
8. **Delete the GitHub Personal Access Tokens** created earlier (GitHub → Settings → Developer settings → Personal access tokens). Not needed any more.

## B. Not built yet — decide
- **Reset password** (issues #8 / #28, marked "!!" and "wontfix"): people need it for a real launch.
- **Email sender:** the code emails currently go out through the owner's own Gmail. Before real users: move to a dedicated sender (a Gmail account made for the app, or a domain + Resend). SMS not built (needs Twilio).
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
