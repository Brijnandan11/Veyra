#!/usr/bin/env node
/**
 * Phase 1 typography screenshots (dev-only).
 * Opens the /type specimen (#/type/a|b|c) at 1440x900, 1024x768 and 390x844,
 * on all four backgrounds, for pairings A, B and C, and saves full-page
 * screenshots to ./audit/type/. Also verifies document.fonts.check for every
 * family the pairing needs (fail = exit 1) and records computed families.
 *
 * Usage: node scripts/type-audit.mjs [--url http://localhost:5173]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const BASE_URL = urlFlag >= 0 ? args[urlFlag + 1] : (process.env.AUDIT_URL || 'http://localhost:5173');
const OUT_DIR = path.resolve('audit/type');
const PAIRINGS = ['a', 'b', 'c'];
const BACKGROUNDS = ['ink', 'blue', 'paper', 'red'];
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
];

const REQUIRED_FONTS = {
  a: ['17px "Instrument Serif"', 'italic 17px "Instrument Serif"', '17px "Geist Variable"', '13px "Geist Mono Variable"'],
  b: ['17px "Fraunces Variable"', 'italic 17px "Fraunces Variable"', '17px "Instrument Sans Variable"', '13px "JetBrains Mono Variable"'],
  c: ['17px "Newsreader Variable"', 'italic 17px "Newsreader Variable"', '17px "Hanken Grotesk Variable"', '13px "DM Mono"'],
};

async function waitForServer(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
      if (response.ok || response.status >= 400) return true;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureViteServer(url) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) return null;
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
    if (response.ok || response.status >= 400) return null; // already running
  } catch {
    // No dev server running yet — spawn one.
  }
  const viteCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const server = spawn(viteCommand, ['vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  const ready = await waitForServer(url, 45000);
  if (!ready) {
    server.kill('SIGTERM');
    throw new Error(`Vite dev server did not become ready at ${url}.`);
  }
  return server;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const server = await ensureViteServer(BASE_URL);
if (!server) console.log('[type-audit] Reusing dev server already running at', BASE_URL);

const browser = await chromium.launch();
const results = { url: BASE_URL, generatedAt: new Date().toISOString(), pairings: {} };
let failed = false;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  for (const pairing of PAIRINGS) {
    results.pairings[pairing] = { fonts: {}, screenshots: [], errors: [] };
    await page.goto(`${BASE_URL}/#/type/${pairing}`, { waitUntil: 'networkidle' });
    // Hash-only hops do not reload the document; force a fresh load per pairing
    // so font availability reflects exactly what this pairing pulls in.
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    // 1. Font availability checks.
    for (const spec of REQUIRED_FONTS[pairing]) {
      const ok = await page.evaluate((spec) => document.fonts.check(spec), spec);
      results.pairings[pairing].fonts[spec] = ok;
      if (!ok) { failed = true; console.error(`[type-audit] FAIL: fonts.check('${spec}') = false for pairing ${pairing.toUpperCase()}`); }
      else console.log(`[type-audit] fonts.check OK: ${spec}`);
    }

    // 2. Computed families on key elements.
    const families = await page.evaluate(() => {
      const grab = (selector) => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).fontFamily : null;
      };
      return {
        hero: grab('.type-hero'),
        body: grab('.type-body'),
        mono: grab('.type-cell-mono'),
        stats: grab('.type-stat-value'),
      };
    });
    results.pairings[pairing].computed = families;

    // 3. Screenshots: every background x viewport, full page.
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(200);
      for (const background of BACKGROUNDS) {
        await page.click(`.type-bg-toggle button:has-text("${background}")`);
        await page.waitForTimeout(150);
        const file = path.join(OUT_DIR, `pairing-${pairing}-${background}-${viewport.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        results.pairings[pairing].screenshots.push(path.relative(process.cwd(), file));
      }
    }
    results.pairings[pairing].errors = consoleErrors.splice(0);
  }
} catch (error) {
  failed = true;
  console.error('[type-audit] crashed:', error);
} finally {
  fs.writeFileSync(path.join(OUT_DIR, 'type-summary.json'), JSON.stringify(results, null, 2));
  await browser.close();
  if (server) server.kill('SIGTERM');
}

console.log(failed ? '[type-audit] RESULT: FAIL' : '[type-audit] RESULT: PASS');
process.exit(failed ? 1 : 0);
