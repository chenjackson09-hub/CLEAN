# Two-phone test script — the whole Clean flow, start to finish

*Written 2026-11-02. About 60–90 minutes. Goal: find what breaks when two real people use the app, before anyone else does.*

**How to use it:** do the steps in order. Tick each box. When something is wrong, write the step number, what you expected, what happened, and take a screenshot. "Expected" is what should happen — if it doesn't, that's a finding.

---

## 0. Setup (10 min)

**You need**
- **Phone A = Host.** **Phone B = Cleaner.** **A laptop = Admin** (your admin account).
- If you only have one phone: use a second browser or a private window for the other person. Two people signed in to the same browser will log each other out.
- Site: `https://clean-roan.vercel.app` (check the address with the latest deploy).
- Two **new** email addresses you invent, e.g. `host.test+1@gmail.com` and `cleaner.test+1@gmail.com` (they don't need to be real inboxes — email confirmation is off). Use a password you'll remember.
- A real photo on each phone (a face for the cleaner, anything for the host).

**Before you start (admin laptop)**
- [ ] All migrations up to **0044** have been run.
- [ ] **Admin → Locations**: the town you'll use for the host (e.g. Beit Hillel) shows **Open**. If it shows Closed, the host will see "coming soon" and no cleaners — that is the rule working, not a bug. Open it for the test (do **not** open other areas).
- [ ] You know your admin login.

**Time every "Continue" in the wizards roughly** (instant / about a second / slow). Slowness was a complaint — note any screen that feels slow.

---

## 1. Cleaner signs up — Phone B (15 min)

Open the site → **Register** → choose **Cleaner**, enter the email + password (twice).

- [ ] **1.1** Wrong confirm-password shows a message and does not continue. An email that already exists is blocked with a link to log in.
- [ ] **1.1b** The **Continue** button stays grey until you tick *"I agree to the Terms of Use and the Privacy Policy"*. Tap the two links: each opens its page in a **new tab** (English and Hebrew both readable, with a "test version" note), and your sign-up form is still filled in when you come back.
- [ ] **1.2** After "Continue" you land on **Step 1 of 9** (no long wait).

**Step 1 – You.** Add a photo (try the camera or library). Type a name. Pick a birth date.
- [ ] **1.3** Leaving the name empty and tapping out shows a red message under the field. A birth date under 14 years ago shows an error; 14+ is accepted. Under 18 shows the "different verification" note. The line "Only your age is shown" is visible.
- [ ] **1.4** Continue moves on **immediately**.

**Step 2 – Where.** Type your town and pick it from the list (try Hebrew and English spellings).
- [ ] **1.5** Suggestions appear as you type; "can't find my place — type it" works as a fallback.

**Step 3 – Getting there.** Move the radius slider. Answer the car question; with "Yes", answer the fuel question; with fuel "Yes", an amount box appears.
- [ ] **1.6** The sentence "Hosts within N km of <town> can find you" updates as you slide. Fuel questions appear only after "Yes".

**Step 4 – What you clean.** Pick a few chips.
- [ ] **1.7** Chips are grouped (Homes / Other places / Also), and you can't continue with none picked.

**Step 5 – Rate and hours.** Set a rate (e.g. 85). Use the +/− on shortest and longest job; try "No limit".
- [ ] **1.8** Steppers move in half hours; "No limit" hides the longest-job stepper.

**Step 6 – Experience.** Pick a range; tick a few language chips; type another language.
- [ ] **1.9** Language chips show real names (Hebrew, English, …) — **not** text like `auth.registerCleaner...`.

**Step 7 – Kind of work.**
- [ ] **1.10** "Either is fine" is already selected and **shows both options under it** (a regular family / jobs once in a while).

**Step 8 – About me.** Tap a sentence start, finish the sentence in each box.
- [ ] **1.11** Your sentences appear joined in the big box underneath, which you can still edit freely. Max 500 characters.

**Step 9 – Preview.**
- [ ] **1.12** Every answer shows. Tap **Edit** on "What I clean", change something, tap **Back to preview** — you're back on the preview with the change. "Looking for" lists **both** options (not the word "either").
- [ ] **1.13** Tap **Submit for review** → a thank-you screen → **Set my available days**.

**Resume test (do it now, with a second cleaner account or a fresh start):**
- [ ] **1.14** Start another cleaner sign-up, answer up to step 4, then **close the browser tab**. Open the site again and **log in**. Expected: you land back in the wizard at step 4 with your earlier answers filled in. A "Finish your profile" banner shows if you open the app elsewhere.
- [ ] **1.15** (Admin, later) that unfinished person appears under **Applications → Unfinished**, **not** in "Pending review", and has no Approve button.

---

## 2. Admin approves the cleaner — laptop (3 min)

**Admin → Applications.**
- [ ] **2.1** The cleaner is in **Pending review** (sidebar badge showed a number). The unfinished one from 1.14 is **not** counted.
- [ ] **2.2** Click **Approve**. The row moves to Approved.
- [ ] **2.3** On Phone B the **bell** shows a notification that the account was approved (may need a refresh).

---

## 3. Cleaner becomes "listed" — Phone B (5 min)

Go to **Schedule**.
- [ ] **3.1** You see the amber card "To be shown to hosts, add:" with ticks for photo and rate, and an empty box for **an available day**. The welcome note is dismissible and the **calendar is not squashed** (you can scroll down to it).
- [ ] **3.2** Tap a day next week → **+** → add 09:00–15:00 → Add. The day turns blue and the checklist card **disappears**.
- [ ] **3.3** Open your profile (round picture, top right). Check: the age, town, rate, experience range, languages, services, and **both** "looking for" lines look right. Note anything that looks off.

---

## 4. Host signs up — Phone A (15 min)

**Register → Host**, new email.

**Step 1 – About you.** Add a photo, first and last name, a phone number (optional), tick languages.
- [ ] **4.1** Language chips show **real names** and wrap into rows. "Cleaners see your full name once you send a request" is visible. There is **no intro box** on this screen any more (it moved to the About us screen).

**Step 2 – Where.** Pick the same town as the cleaner.
- [ ] **4.2** The text says cleaners see only your town on your profile, and your street is shared when you send a request.

**Step 3 – Your home.** Pick a home type, use +/− for bedrooms and bathrooms, and **floors in the home**. Tap a few words for **what your home is like** (e.g. Large, Newly renovated). Open "More details" and set **people living in the home**. Scroll to **Photos of your home** and add one or two photos.
- [ ] **4.3** The photos section says **Optional · recommended** and, clearly, *"Only a cleaner you send a request to can see these photos. They are not public…"*. A photo appears right after you add it; ✕ removes it.
- [ ] **4.4** Pressing "+" on an empty counter goes to **1** (not 2).

**Step 4 – Your household and pets.** At the top choose **who lives in your home** (e.g. A family with kids) and add a short line. Then try "No pets", then Dog; with a pet a count, a note and a photo field appear.

**Step 5 – Your cleaning needs** (every question optional; "Skip for now" works). Pick how often (Weekly), cleaning type, a few tasks (include **Dishes**), set the hours with +/− (goes in half hours), pick two days, choose how flexible you are, and type something in "anything else".
- [ ] **4.9** The "anything else" box warns: cleaners can read this, keep door codes out of it.

**Step 6 – About us.** The box is already filled with a paragraph in your own voice.
- [ ] **4.10** The paragraph mentions **only what you answered** (no pets if you said none, no days if you picked none). Hours shows as "about N hours", days as "Tuesdays and Thursdays work best for us".
- [ ] **4.11** Edit a few words, go **Back**, change an answer, come forward again: your edited words are still there. Press **Write it again**: it asks before replacing your edit. Say No → unchanged; Yes → rewritten from the answers.
- [ ] **4.12** Switch the app to **Hebrew** (language toggle) and press **Write it again**: the paragraph is in Hebrew and reads naturally (note anything that sounds wrong — the Hebrew is unreviewed).

**Step 7 – Preview.**
- [ ] **4.5** Shows your home line including the number of floors, pets, languages, an **About us** block and a **Cleaning needs** line. **Edit** on each jumps to the right screen and returns.
- [ ] **4.6** Tap **Start finding cleaners** → you land on the **Schedule** page.
- [ ] **4.7** Before the admin approves you, you see the **waitlist message** instead of the calendar.

**Admin laptop:**
- [ ] **4.8** **Applications**: the host is in Pending review (customer). **Approve**. On Phone A refresh: the calendar appears.

**Existing host (an account made before this feature):** open **Profile → edit**.
- [ ] **4.13** The new household / cleaning-needs questions and a **Your introduction** box are there; the old About text is still in the box. Press **Write it for me** (it asks before replacing the old text), then **Save**. The profile view shows the paragraph under "About us" and a **Typical needs** block.
- [ ] **4.14** Changing the profile does **not** change a request already sent.

---

## 5. Host sends a request — Phone A (10 min)

**Schedule** tab.
- [ ] **5.1** The calendar shows blue dots on the day the cleaner is free (next week). Tap that day.
- [ ] **5.2** The day sheet lists the cleaner as a card with their **photo, rate and rating area**. (If the cleaner has no photo or rate they should **not** appear — you can test that later by removing the photo.)
- [ ] **5.3** Tap **Schedule a clean**. The form has: date, start time, duration, cleaning type, **"What matters most this time"** chips, extras, your address, notes, pets/host-present. Some chips may be pre-ticked.
- [ ] **5.4** Fill it in and send. The card turns into a read-only "sent" summary. Try sending the **same** request again → it should refuse ("already have a pending request").

---

## 6. Cleaner answers — Phone B (10 min)

(When you open the host's profile from the request, check: **About us** paragraph at the top, then **Typical needs** — how often, per visit, days, task pills, and "Each request may differ from this profile." Floors show with the home details.)

- [ ] **6.1** The **bell** shows "new request"; the **Requests** tab shows a badge. The row shows the host's name, day, time and **time left to answer**.
- [ ] **6.2** Open it. The summary shows date, start time (no made-up end time), "about N h", extras/focus, home + pets.
- [ ] **6.3** Tap **View profile** on the host. Check:
  - **Only the town** is shown (no street), plus floors, bedrooms, languages, pets.
  - **Photos of the home** are visible, with the note "Shared by the host with you because you have a request…".
  - There is a "home notes are shared once you accept" lock line.
- [ ] **6.4** Go back and tap **Accept** (one tap, no second confirmation). You see "Request accepted ✓" and **Open chat**.
- [ ] **6.5** On the **Schedule** the day is now **green**, and the whole availability slot is used up for that day.

---

## 7. After the match — both phones (10 min)

**Host (Phone A):**
- [ ] **7.1** Bell: "request accepted". **Bookings** shows it under Upcoming (with a countdown). **Home** shows it too.
- [ ] **7.2** Open the booking: details match what you sent; the street address is there; there is an **Add to Google Calendar** button — tap it: Google opens with the title "Cleaning Booked – <name>", the **town only** (no street), and a link back to the chat/booking.
- [ ] **7.3** Open **Chat**. Send a message.

**Cleaner (Phone B):**
- [ ] **7.4** The message arrives **without refreshing**; the bell/Chat shows an unread count; opening the chat clears it. Reply; it appears on Phone A the same way.
- [ ] **7.5** Cleaner's **Home** and the booking detail show the same booking; the Google Calendar button works here too.

---

## 8. Cancellation and a second request (10 min)

- [ ] **8.1** Host sends a **second** request to the cleaner for another free day. Cleaner **Declines** it (confirm). Host sees it under closed requests with the reason.
- [ ] **8.2** Host **cancels** the confirmed clean from its detail (pick a reason, add a note, confirm).
  - Cleaner gets a bell notification; the chat shows a "Cleaning cancelled by <name>" entry; the cleaner's day is **blue (free) again** with the **whole** slot restored.
  - Host's **Bookings** → Cancelled tab keeps it as a record.
- [ ] **8.3** Host sends a fresh request for the restored day and the cleaner accepts it (so you have a confirmed clean for the next steps).
- [ ] **8.4** (Optional) The cleaner cancels instead; the host gets "Find another cleaner" and the request form is pre-filled.

---

## 9. Completing and rating (needs the clean's time to pass)

A clean can only be marked complete after its time has passed. Easiest: make one extra request for **today** with an early start, or finish this section the day after.

- [ ] **9.1** Cleaner: **Past cleans** → **Complete** on the clean.
- [ ] **9.2** Host gets a "tap to rate" notification. Host opens the booking: stars appear; give 5. **A review box appears** — write a sentence, **Save review**.
- [ ] **9.3** Cleaner's public profile (and the host's view of the cleaner) shows the rating and a **"Reviews from hosts"** section with "<First name> <initial>." and the text.
- [ ] **9.4** Cleaner rates the host with a review. The host's profile shows **"Reviews from cleaners"**. "Cleans completed" counts went up on both.
- [ ] **9.5** Home notes: **not testable right now** — see "Known gaps" below.

---

## 10. Admin checks — laptop (10 min)

- [ ] **10.1** **Matches** lists the booking with names, status and the detail popup.
- [ ] **10.2** **Dashboard**: counts look sane (booking requests, matches, ratings).
- [ ] **10.3** **Cleaners → expand the cleaner → Verify (Cindy Verified)**. The cleaner gets a bell notification and a **"Cindy Verified"** badge appears on their public profile and browse card. Remove it (confirm) — badge goes.
- [ ] **10.4** From the host's phone, tap the **help bubble** (bottom right, draggable) and send a message → it appears in **Admin → Support**.
- [ ] **10.5** **Locations** shows your town with the right customer/cleaner counts; nothing else opened itself.

---

## 11. Quick extra checks (10 min)

- [ ] **11.1** **Hebrew:** toggle the language in both wizards and on a few screens. Layout mirrors right-to-left; nothing shows `auth.xxx` or other raw keys; note any awkward Hebrew wording.
- [ ] **11.2** No page scrolls sideways on a phone; the fixed Back/Continue bar never covers an input.
- [ ] **11.3** **Google sign-in** (optional): "Continue with Google" with a brand-new Google account → choose a role → you end up in the same wizard.
- [ ] **11.4** Log out and in again on both phones; you land on the right home screen for each role. Visiting a host-only page as the cleaner sends you away.
- [ ] **11.5** Try the **calendar link** from step 7.2 while logged out: you're asked to sign in, then sent to the booking.

---

## Known gaps to expect (not bugs in this script)

- **Home notes can't be entered anywhere right now.** They were removed from the sign-up, and the profile editor has no field for them, so the "shared once you accept" lock has nothing behind it for new hosts. (Fix: add a "Home notes — private until a cleaner accepts" box to the host profile editor.)
- **No emails** are sent about cancellations (on hold); notifications are in-app only.
- **Verified contact** is not required (switch is off); any email works.
- A clean can't be marked complete before its time.

---

## What to send back

For each problem: **step number · what you expected · what happened · screenshot · which phone and browser.** Also tell me:
1. Which screens felt **slow**, and roughly how long.
2. Anything that confused you even though it "worked".
3. Anything you'd want a host or cleaner to know that the app doesn't say.

**Clean-up afterwards:** the test accounts stay in the system. Admin can delete them from Cleaners / Customers, or keep them for the next round.
