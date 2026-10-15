import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:3001';
const email = `e2e.${Date.now()}@veyra.test`;
const password = 'e2epassword123';
const name = 'E2E Runner';

const results = [];
function check(label, ok, extra = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) process.exitCode = 1;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push(String(err)));
page.on('response', async (r) => {
  if (r.url().includes('/api/') && r.status() >= 400) {
    let body = '';
    try { body = (await r.text()).slice(0, 200); } catch {}
    consoleErrors.push(`[api ${r.status()}] ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${body}`);
  }
});

try {
  // 1. Landing loads
  await page.goto(BASE, { waitUntil: 'networkidle' });
  check('landing loads', await page.locator('h1').first().isVisible());

  // 2. Click "Open monitoring console" while signed out → auth modal
  await page.getByRole('button', { name: /open monitoring console/i }).first().click();
  const modal = page.locator('.modal');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  check('auth modal opens from CTA', await modal.locator('#auth-modal-title').isVisible());

  // 3. Switch to register mode and create the account
  await page.getByRole('button', { name: 'Sign up' }).click();
  await modal.locator('input[name="name"]').fill(name);
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill(password);
  await modal.locator('input[name="confirmPassword"]').fill(password);
  await modal.getByRole('button', { name: /create account/i }).click();

  // 4. Dashboard should load with the signed-in workspace
  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 8000 });
  check('dashboard loads after register', await page.locator('.workspace-name').textContent().then(t => t.includes(email)));
  check('profile shows user name', await page.locator('.profile strong').textContent().then(t => t === name));

  // 5. Add a monitor through the modal
  await page.getByRole('button', { name: /add monitor/i }).first().click();
  const monitorModal = page.locator('.modal');
  await monitorModal.waitFor({ state: 'visible', timeout: 5000 });
  await monitorModal.locator('input[name="name"]').fill('E2E Target');
  await monitorModal.locator('input[name="url"]').fill('https://example.com');
  await monitorModal.locator('select[name="interval"]').selectOption('60');
  await monitorModal.getByRole('button', { name: /create monitor/i }).click();
  await page.locator('.toast').waitFor({ state: 'visible', timeout: 5000 });
  check('monitor created toast', await page.locator('.toast').textContent().then(t => t.includes('Monitor created')));

  // 6. Monitor appears in the list
  await page.locator('.monitor-row').first().waitFor({ state: 'visible', timeout: 5000 });
  const rowText = await page.locator('.monitor-row').first().textContent();
  check('new monitor in table', rowText.includes('E2E Target'), rowText.slice(0, 80));

  // 7. Open detail view — checks history panel loads from API
  await page.locator('.monitor-row .row-arrow').first().click();
  await page.locator('.detail-hero h2').waitFor({ state: 'visible', timeout: 5000 });
  check('detail view opens', await page.locator('.detail-hero h2').textContent().then(t => t === 'E2E Target'));
  check('detail stats render', await page.locator('.detail-stats .metric').count().then(c => c === 3));

  // 8. Public status section loads from the public API
  await page.locator('.nav-item', { hasText: 'Public status' }).click();
  await page.locator('.public-page').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(800);
  const publicBanner = await page.locator('.public-status-banner').textContent();
  check('public status renders', publicBanner.length > 0, publicBanner.trim().slice(0, 60));

  // 9. Sign out works
  await page.locator('.profile-more').click();
  await page.waitForTimeout(400);
  check('sign out returns to hero', await page.locator('.flow-art-landing, .pixel-hero').first().isVisible().catch(() => false));

  // 10. Log back in
  await page.getByRole('button', { name: /open monitoring console/i }).first().click();
  await page.locator('.modal').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.modal input[name="email"]').fill(email);
  await page.locator('.modal input[name="password"]').fill(password);
  await page.locator('.modal .form-actions button[type="submit"]').click();
  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 8000 });
  // Wait for the async monitors fetch to land (rows appear or empty state shows).
  await page.locator('.monitor-row, .empty-state').first().waitFor({ state: 'visible', timeout: 8000 });
  const rowsAfterLogin = await page.locator('.monitor-row').count();
  check('re-login shows persisted monitors', rowsAfterLogin >= 1, `${rowsAfterLogin} row(s)`);

  // 11. Wrong password shows an error
  await page.locator('.profile-more').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /open monitoring console/i }).first().click();
  await page.locator('.modal').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('.modal input[name="email"]').fill(email);
  await page.locator('.modal input[name="password"]').fill('wrongpassword');
  await page.locator('.modal .form-actions button[type="submit"]').click();
  await page.locator('.form-error').waitFor({ state: 'visible', timeout: 5000 });
  check('bad password shows error', await page.locator('.form-error').textContent().then(t => /invalid/i.test(t)));

  // The bad-password step intentionally produces a 401 on /auth/login (it is
  // what the UI error message test asserts). Exclude that expected failure.
  const relevantErrors = consoleErrors.filter((e) =>
    !/favicon|Download the React DevTools|Failed to load resource|\[api 401\] POST \/api\/v1\/auth\/login/i.test(e)
  );
  check('no console errors', relevantErrors.length === 0, relevantErrors.slice(0, 3).join(' | '));
} catch (err) {
  check('e2e run completed', false, String(err).slice(0, 200));
  console.log('--- failure diagnostics ---');
  console.log('consoleErrors:', consoleErrors.slice(0, 8).join('\n'));
  try {
    console.log('form-actions HTML:', await page.locator('.modal .form-actions').innerHTML().catch(() => 'n/a'));
    console.log('hash:', await page.evaluate(() => location.hash));
    console.log('token:', (await page.evaluate(() => localStorage.getItem('veyra_token')))?.slice(0, 20) ?? 'none');
  } catch {}
  await page.screenshot({ path: 'audit/e2e-failure.png' }).catch(() => {});
} finally {
  await browser.close();
}

console.log(results.join('\n'));