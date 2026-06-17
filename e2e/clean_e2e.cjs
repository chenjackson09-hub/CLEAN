// Try local install first, fall back to global Windows npm path
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('C:/Users/developer/AppData/Roaming/npm/node_modules/playwright'));
}

const BASE = 'http://localhost:3000';
const CLEANER_EMAIL  = 'cleaner.test@clean.test';
const CLEANER_PASS   = 'CleanTest1234!';
const CUSTOMER_EMAIL = 'customer.test@clean.test';
const CUSTOMER_PASS  = 'CustTest1234!';
const ADMIN_EMAIL    = 'admin.test@clean.test';
const ADMIN_PASS     = 'AdminTest1234!';
const CLEANER_ID     = '1ff83421-696e-4d1b-9ee7-6cbc5bed1804';

const log = [];
function step(e, msg, detail='') {
  const l = `${e} ${msg}${detail ? '  |  '+detail : ''}`;
  log.push(l); console.log(l);
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextWeekday(targetDay) {
  const d = new Date();
  const diff = ((targetDay - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

async function logout(page) {
  try {
    const btn = page.locator('button, a').filter({ hasText: /sign out|logout|התנתק/i }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(600);
      const yesBtn = page.locator('button').filter({ hasText: /^Yes|^yes|sure/i }).first();
      if (await yesBtn.count()) { await yesBtn.click(); await page.waitForTimeout(600); }
      try { await page.waitForURL(u => u.toString().includes('/login'), { timeout: 6000 }); } catch {}
      return;
    }
  } catch {}
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(800);
}

async function login(page, email, pass) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded');
  try { await page.waitForSelector('input[type="email"]', { state: 'visible', timeout: 8000 }); }
  catch { return false; }
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  try { await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 }); return true; }
  catch { return false; }
}

async function switchUser(page, email, pass) {
  await logout(page);
  await page.waitForTimeout(400);
  return login(page, email, pass);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const monday  = nextWeekday(1);
  const tuesday = nextWeekday(2);
  step('📆', `Next Monday: ${monday} (day=${new Date(monday+'T12:00:00').getDay()})`, `Tuesday: ${tuesday} (day=${new Date(tuesday+'T12:00:00').getDay()})`);

  try {
    // ─── Login customer ───
    step('🔐', 'Login as customer');
    const custOk = await login(page, CUSTOMER_EMAIL, CUSTOMER_PASS);
    step(custOk ? '✅' : '❌', 'Customer login', custOk ? page.url() : 'FAILED');

    if (custOk) {
      // ─── STEP 5 — customer sees cleaner on Monday ───
      await page.goto(`${BASE}/browse?dates=${monday}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
      const t5 = await page.locator('body').innerText();
      const onMon = t5.includes('Cleaner Test Agent');
      step(onMon ? '✅' : '❌', `STEP 5 — Cleaner visible on Monday (${monday})`, onMon ? 'VISIBLE ✓' : 'NOT VISIBLE');

      // ─── STEP 6 — hidden on Tuesday ───
      await page.goto(`${BASE}/browse?dates=${tuesday}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
      const t6 = await page.locator('body').innerText();
      const onTue = t6.includes('Cleaner Test Agent');
      step(!onTue ? '✅' : '❌', `STEP 6 — Cleaner hidden on Tuesday (${tuesday})`, !onTue ? 'HIDDEN ✓' : 'STILL VISIBLE (bug)');

      // ─── STEP 7 — Navigate directly to cleaner profile and book ───
      step('📋', 'STEP 7 — Booking cleaner on Monday');
      await page.goto(`${BASE}/cleaners/${CLEANER_ID}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Click the "Request Booking" button (opens booking form)
      const reqBtn = page.locator('button').filter({ hasText: /request|book|הזמן/i }).first();
      step('ℹ️', `Request btn found: ${await reqBtn.count()}`);
      if (await reqBtn.count()) { await reqBtn.click(); await page.waitForTimeout(800); }

      // Fill date
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.count()) {
        await dateInput.fill(monday);
        await page.waitForTimeout(800);  // wait for available times to compute
      }

      // Select a time from the startTime select (NOT the first select on page)
      const timeSel = page.locator('select#startTime');
      if (await timeSel.count()) {
        const opts = await timeSel.locator('option').allTextContents();
        step('ℹ️', `Available time slots: ${opts.join(', ')}`);
        const validOpts = opts.filter(o => o !== 'Select time' && o !== 'Not available');
        if (validOpts.length > 0) {
          await timeSel.selectOption(validOpts[0]);
          step('✅', `Selected time: ${validOpts[0]}`);
        } else {
          step('❌', 'No valid time slots available');
        }
      } else {
        step('⚠️', 'startTime select not found');
      }

      // Fill address
      const addrInput = page.locator('#address');
      if (await addrInput.count()) await addrInput.fill('Test Street 1, Tel Aviv');

      // Submit
      const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /send|submit|שלח/i }).first();
      if (await submitBtn.count()) {
        await submitBtn.click();
      } else {
        await page.locator('button[type="submit"]').last().click();
      }
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const errEl = await page.locator('[class*="text-red-6"]').allTextContents();
      const confirmed = await page.locator('text=request has been sent').count() > 0
        || await page.locator('[class*="text-green"]').count() > 0;
      step((errEl.length === 0 || confirmed) ? '✅' : '❌', 'STEP 7 — Booking result',
        errEl.length ? `Error: ${errEl[0].slice(0,100)}` : confirmed ? 'Confirmed ✓' : page.url());
    }

    // ─── Admin ───
    step('🔐', 'Switch to admin');
    const adminOk = await switchUser(page, ADMIN_EMAIL, ADMIN_PASS);
    step(adminOk ? '✅' : '❌', 'Admin login', adminOk ? page.url() : 'FAILED');

    if (adminOk) {
      // STEP 8 — bookings
      await page.goto(`${BASE}/admin/bookings`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      const t8 = await page.locator('body').innerText();
      const bSeen = t8.includes('Cleaner Test Agent') || t8.includes('Customer Tester') || t8.includes('Test Street');
      step(bSeen ? '✅' : '❌', 'STEP 8 — Admin sees booking', bSeen ? 'FOUND ✓' : `Body first 400: ${t8.slice(0,400)}`);

      // STEP 9 — cleaners
      await page.goto(`${BASE}/admin/cleaners`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      const t9 = await page.locator('body').innerText();
      const cSeen = t9.includes('Cleaner Test Agent');
      step(cSeen ? '✅' : '❌', 'STEP 9 — Admin sees cleaner', cSeen ? 'FOUND ✓' : `Body first 400: ${t9.slice(0,400)}`);

      // STEP 10 — admin note (UI only)
      if (cSeen) {
        const cleanerCard = page.locator('.bg-white.rounded-xl.p-4').filter({ hasText: 'Cleaner Test Agent' });
        const ta = cleanerCard.locator('textarea').first();
        if (await ta.count()) {
          await ta.fill('Great cleaner — E2E verified');
          const saveBtn = cleanerCard.locator('button').filter({ hasText: /save|שמור/i }).first();
          if (await saveBtn.count()) { await saveBtn.click(); await page.waitForTimeout(1500); }
          const savedEl = await cleanerCard.locator('text=Saved').count() > 0;
          step('⚠️', 'STEP 10 — Admin note (UI-only, not in DB)', savedEl ? 'Saved ✓' : 'Clicked Save');
        } else {
          step('⚠️', 'STEP 10 — No textarea found');
        }
      }

      // Bonus — availability
      await page.goto(`${BASE}/admin/availability`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const tAv = await page.locator('body').innerText();
      const avOk = tAv.includes('Cleaner Test Agent') || tAv.includes('Monday') || tAv.includes('09:00');
      step(avOk ? '✅' : '❌', 'BONUS — /admin/availability shows schedule', avOk ? 'FOUND ✓' : 'NOT FOUND');
    }

    // ─── STEP 11 — customer sees note ───
    step('🔐', 'Customer checks cleaner profile for note');
    await switchUser(page, CUSTOMER_EMAIL, CUSTOMER_PASS);
    await page.goto(`${BASE}/cleaners/${CLEANER_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const t11 = await page.locator('body').innerText();
    const noteVis = t11.includes('Great cleaner');
    step(noteVis ? '⚠️' : '✅', 'STEP 11 — Admin note on customer view', noteVis ? 'Visible (unexpected)' : 'Not visible (expected — notes UI-only)');

    // ─── STEP 12 — cleaner sees booking ───
    step('🔐', 'Switch to cleaner');
    const cleanerOk = await switchUser(page, CLEANER_EMAIL, CLEANER_PASS);
    step(cleanerOk ? '✅' : '❌', 'Cleaner login', cleanerOk ? page.url() : 'FAILED');
    if (cleanerOk) {
      await page.goto(`${BASE}/cleaner/requests`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      const t12 = await page.locator('body').innerText();
      const rSeen = t12.includes('Test Street') || t12.includes('Customer Tester') || t12.includes(monday);
      step(rSeen ? '✅' : '❌', 'STEP 12 — Booking visible in /cleaner/requests', rSeen ? 'FOUND ✓' : `First 400: ${t12.slice(0,400)}`);

      await page.goto(`${BASE}/cleaner/availability`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const t12b = await page.locator('body').innerText();
      const aSeen = t12b.includes('Monday') || t12b.includes('09:00') || t12b.includes('Wednesday');
      step(aSeen ? '✅' : '❌', 'STEP 12b — Weekly availability visible', aSeen ? 'FOUND ✓' : `First 300: ${t12b.slice(0,300)}`);
    }

    // ─── STEP 13 — admin deletes customer ───
    step('🔐', 'Admin deletes customer');
    await switchUser(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto(`${BASE}/admin/customers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    const t13 = await page.locator('body').innerText();
    const custFound = t13.includes('Customer Tester') || t13.includes('customer.test@');
    step(custFound ? '✅' : '❌', 'STEP 13a — Customer in /admin/customers',
      custFound ? 'FOUND ✓' : `Body length: ${t13.length}, includes "Tester": ${t13.includes('Tester')}`);

    if (custFound) {
      const custCard = page.locator('.bg-white.rounded-xl.p-4').filter({ hasText: 'Customer Tester' });
      page.once('dialog', d => { step('ℹ️', `Confirm: "${d.message().slice(0,60)}"`); d.accept(); });
      const delBtn = custCard.locator('button').filter({ hasText: /delete|מחק/i }).first();
      if (await delBtn.count()) {
        await delBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);
        // Navigate back to page to get definitive fresh-data confirmation
        await page.goto(`${BASE}/admin/customers`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        const t13b = await page.locator('body').innerText();
        const gone = !t13b.includes('Customer Tester') && !t13b.includes('customer.test@');
        step(gone ? '✅' : '❌', 'STEP 13b — Customer removed after delete', gone ? 'REMOVED ✓' : 'STILL IN LIST');
      } else {
        step('❌', 'STEP 13b — Delete button not found on customer card');
      }
    }

    // ─── STEP 14 — deleted customer blocked ───
    step('🔐', 'Testing deleted customer login');
    await logout(page);
    await page.waitForTimeout(500);
    const deletedIn = await login(page, CUSTOMER_EMAIL, CUSTOMER_PASS);
    step(!deletedIn ? '✅' : '❌', 'STEP 14 — Deleted customer login blocked',
      !deletedIn ? `Blocked ✓ at: ${page.url()}` : `GOT IN at: ${page.url()} — SECURITY BUG`);

  } catch(e) {
    step('💥', 'ERROR', e.message);
    console.error(e.stack);
  } finally {
    console.log('\n════════════════════════════════════════');
    console.log('         E2E TEST FINAL REPORT');
    console.log('════════════════════════════════════════');
    log.forEach(l => console.log(l));
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

main();
