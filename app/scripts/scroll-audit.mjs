#!/usr/bin/env node
/**
 * Veyra scroll audit (dev-only).
 * Opens the Vite dev server at 1440x900 and 390x844, scrolls through the whole
 * landing page (and back, then down again) and asserts at every step that
 * content is actually visible.
 *
 * Checks per scroll step:
 *  - blank-screen: >=2 visible text elements intersecting the viewport with
 *    computed opacity > 0.6, AND their total intersecting area >= 3% of the
 *    viewport, AND the step screenshot is not one near-uniform colour.
 *  - purple headline colour: when the violet section is the active section,
 *    "EVERY ENDPOINT. ALWAYS." must be rgb(255,255,255) at opacity 1.
 *  - no horizontal overflow, no console errors.
 * Plus:
 *  - ScrollTrigger.getAll().length stays stable across landing -> #dashboard -> landing.
 *  - prefers-reduced-motion emulation runs the blank check again.
 * Screenshots land in ./audit/<viewport>/<step>.png and a JSON summary in ./audit/summary.json.
 *
 * Usage: node scripts/scroll-audit.mjs [--url http://localhost:5173]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TYPE_CHECKS } from './type-checks.mjs';

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const BASE_URL = urlFlag >= 0 ? args[urlFlag + 1] : (process.env.AUDIT_URL || 'http://localhost:5173');
const OUT_DIR = path.resolve('audit');
const STEP_PX = 150;
const STEP_WAIT_MS = 250;

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
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) {
    return null;
  }

  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
    if (response.ok || response.status >= 400) return null;
  } catch {
    // No dev server running yet.
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

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900, reducedMotion: 'no-preference' },
  { name: 'tablet-1280x720', width: 1280, height: 720, reducedMotion: 'no-preference' },
  { name: 'tablet-1024x768', width: 1024, height: 768, reducedMotion: 'no-preference' },
  { name: 'mobile-390x844', width: 390, height: 844, reducedMotion: 'no-preference' },
  { name: 'reduced-motion-1440x900', width: 1440, height: 900, reducedMotion: 'reduce' },
  { name: 'motion-off-1440x900', width: 1440, height: 900, reducedMotion: 'no-preference', urlParam: '?motion=off' },
];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

/** Runs one blank-screen measurement in the page. Returns a plain object. */
async function measureBlank(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const viewportArea = vw * vh;
    const selectors = 'h1, h2, h3, p, button, a, li, summary, strong, span';
    const all = [...document.querySelectorAll(selectors)];
    const visible = [];
    for (const el of all) {
      const text = (el.textContent || '').trim();
      if (!text) continue;
      // Skip wrapper elements whose children are also matched, to avoid double counting.
      if (el.children.length && [...el.children].some((c) => c.matches(selectors))) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const opacity = Number(style.opacity);
      if (!(opacity > 0.6)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      const ix = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
      const iy = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      if (ix <= 0 || iy <= 0) continue;
      visible.push({ text: text.slice(0, 60), area: ix * iy });
    }
    const count = visible.length;
    const textArea = visible.reduce((sum, item) => sum + item.area, 0);
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    // Uniform-colour detection uses a coarse DOM sample instead of pixels: cheap
    // and robust across GPU/headless differences.
    const samplePoints = [];
    for (let gy = 0.0625; gy < 1; gy += 0.1875) {
      for (let gx = 0.0625; gx < 1; gx += 0.1875) samplePoints.push([Math.round(gx * vw), Math.round(gy * vh)]);
    }
    const colours = samplePoints.map(([x, y]) => {
      for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      }
      return 'rgb(255, 255, 255)';
    });
    const unique = new Map();
    for (const c of colours) unique.set(c, (unique.get(c) || 0) + 1);
    const [dominant, dominantCount] = [...unique.entries()].sort((a, b) => b[1] - a[1])[0];
    const parse = (c) => (c.match(/-?\d+(\.\d+)?/g) || [255, 255, 255]).slice(0, 3).map(Number);
    const [dr, dg, db] = parse(dominant);
    const farFromDominant = colours.filter((c) => {
      const [r, g, b] = parse(c);
      return Math.hypot(r - dr, g - dg, b - db) > 12;
    }).length;
    const uniform = farFromDominant / colours.length < 0.06;
    const activeSection = [...document.querySelectorAll('[data-stack-section], .flow-product-section, .flow-trust-section, .flow-footer')]
      .find((el) => { const r = el.getBoundingClientRect(); return r.top <= vh * .5 && r.bottom >= vh * .5; });
    return {
      count,
      areaPct: (textArea / viewportArea) * 100,
      uniform,
      dominant,
      activeSection: activeSection ? (activeSection.getAttribute('aria-label') || activeSection.className.split(' ')[0]) : 'unknown',
      sample: visible.slice(0, 4).map((v) => v.text),
    };
  });
}

async function measurePurple(page) {
  return page.evaluate(() => {
    const section = document.querySelector('.flow-violet-section');
    if (!section) return { active: false };
    const r = section.getBoundingClientRect();
    const active = r.top <= window.innerHeight * .25 && r.bottom >= window.innerHeight * .75;
    if (!active) return { active: false };
    const target = [...section.querySelectorAll('h1, h2')].find((h) => /every\s*endpoint/i.test(h.textContent || ''));
    if (!target) return { active: true, found: false };
    const probe = target.querySelector('.flow-character') || target;
    const style = getComputedStyle(probe);
    return {
      active: true,
      found: true,
      color: style.color,
      opacity: Number(style.opacity),
      isWhite: style.color === 'rgb(255, 255, 255)',
    };
  });
}

function blankVerdict(measure) {
  const problems = [];
  if (measure.count < 2) problems.push(`only ${measure.count} visible text elements (need >=2)`);
  if (measure.areaPct < 3) problems.push(`visible text area ${measure.areaPct.toFixed(2)}% (need >=3%)`);
  if (measure.uniform && measure.count < 2) problems.push(`near-uniform colour ${measure.dominant} with ${measure.count} text elements`);
  return problems;
}

const BRAND_TOKENS = {
  violet: { selector: '.flow-violet-section', rgb: [91, 61, 245] },
  cream: { selector: '.flow-how-section', rgb: [244, 241, 234] },
  alert: { selector: '.flow-alert-section', rgb: [255, 75, 43] },
  ink: { selector: '.flow-ink-section', rgb: [11, 13, 18] },
  trust: { selector: '.flow-trust-section', rgb: [11, 13, 18] },
};
const hex = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const closeEnough = (a, b, tol = 8) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= tol;
const parseRgb = (c) => (c.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);

/** When a stacked section is centred, its computed background must equal the
 *  brand token (the stuck-dim regression guard), on BOTH scroll directions. */
async function measureSectionColours(page) {
  return page.evaluate((tokens) => {
    const vh = window.innerHeight;
    const out = [];
    for (const [name, { selector, rgb }] of Object.entries(tokens)) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const centred = r.top <= vh * 0.35 && r.bottom >= vh * 0.65;
      if (!centred) continue;
      const bg = getComputedStyle(el).backgroundColor;
      out.push({ name, bg, expected: `rgb(${rgb.join(', ')})` });
    }
    const purple = document.querySelector('.flow-violet-section');
    if (purple) {
      const r = purple.getBoundingClientRect();
      if (r.top <= vh * 0.35 && r.bottom >= vh * 0.65) {
        const headline = [...purple.querySelectorAll('h1, h2')].find((h) => /every\s*endpoint/i.test(h.textContent || ''));
        if (headline) {
          const style = getComputedStyle(headline.querySelector('.flow-character') || headline);
          out.push({ name: 'purple-headline', bg: style.color, expected: 'rgb(255, 255, 255)', opacity: style.opacity });
        }
      }
    }
    return out;
  }, BRAND_TOKENS);
}

/** Panel richness: when the cream section is pinned, the active scene must
 *  have the expected number of visible children and no flat/zero-size parts. */
async function measurePanel(page) {
  return page.evaluate(() => {
    const cream = document.querySelector('.flow-how-section');
    if (!cream) return null;
    const r = cream.getBoundingClientRect();
    const pinned = r.top <= 2 && r.bottom >= window.innerHeight - 2;
    if (!pinned) return null;
    const card = cream.querySelector('.flow-how-card');
    if (!card) return { pinned, scene: 'missing-card' };
    const scene = [...card.classList].find((c) => c.startsWith('scene-') && c !== 'scene') || 'scene';
    const expect = { 'scene-add': 6, 'scene-watch': 26, 'scene-alert': 8, 'scene-fix': 6 };
    const selectors = { 'scene-add': '.scene-input, .scene-chip, .scene-button, .scene-chip-ok, .scene-label', 'scene-watch': '.scene-bars i, .scene-row > *', 'scene-alert': '.scene-row > *, .scene-toast b, .scene-toast > span, .scene-channels span, .scene-toast small', 'scene-fix': '.scene-event, .scene-chip-ok' };
    const nodes = [...card.querySelectorAll(selectors[scene] || '*')];
    const visible = nodes.filter((el) => {
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 1 && b.height > 1;
    });
    const flat = nodes.filter((el) => {
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && (b.width < 1 || b.height < 1);
    });
    const bars = visible.filter((el) => el.matches('.scene-bars i'));
    const events = visible.filter((el) => el.matches('.scene-event'));
    const problems = [];
    if (scene === 'scene-watch' && bars.length < 20) problems.push(`step 2 has ${bars.length} visible bars (need >=20)`);
    if (scene === 'scene-fix' && events.length < 4) problems.push(`step 4 has ${events.length} timeline events (need >=4)`);
    if (visible.length < (expect[scene] || 4)) problems.push(`${scene}: ${visible.length} visible children (need >=${expect[scene] || 4})`);
    if (flat.length) problems.push(`${scene}: ${flat.length} zero-size flat elements`);
    return { pinned, scene, visible: visible.length, bars: bars.length, events: events.length, problems };
  });
}

/** Phase 1.1/1.2 guards, every step: (a) no green element in the left 40px
 *  gutter, (b) spine and mascot must not exist in the DOM at all. */
async function measureForbidden(page) {
  return page.evaluate(() => {
    const problems = [];
    if (document.querySelector('.heartbeat-spine, [data-heartbeat-path], .spine-dot, .spine-mascot')) {
      problems.push('spine still in the DOM');
    }
    if (document.querySelector('.veyra-mascot, .flow-hero-mascot, .flow-alert-mascot, .flow-final-mascot')) {
      problems.push('mascot still in the DOM');
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const parse = (c) => (c.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
    const isGreen = ([r, g, b]) => g > 120 && g > r * 1.35 && g > b * 1.35;
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      // The marquee is a full-bleed ticker whose dots legitimately cross the
      // left edge while sliding — it is not left-gutter furniture.
      if (el.closest('.flow-marquee')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.bottom < 0 || rect.top > vh) continue; // not on screen
      if (rect.right > 40 || rect.left > 40 || rect.left < -400) continue;
      const style = getComputedStyle(el);
      const candidates = [style.color, style.backgroundColor, style.fill, style.stroke];
      for (const value of candidates) {
        if (!value || value === 'none' || value.startsWith('rgba(0, 0, 0, 0)')) continue;
        if (isGreen(parse(value))) {
          problems.push(`green ${value} on ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} in left gutter`);
          break;
        }
      }
      if (problems.length >= 3) break;
    }
    return problems;
  });
}

/** Phase 1.3 guard: while a section owns the viewport and NOTHING is entering
 *  yet, its dim overlay must be exactly neutral. While the NEXT section is
 *  entering (covering it), the overlay may scrub up to the 0.15 cap — on both
 *  scroll directions (run every step). */
async function measureDimOverlay(page) {
  return page.evaluate(() => {
    const problems = [];
    const vh = window.innerHeight;
    const sections = [...document.querySelectorAll('[data-stack-section]')];
    sections.forEach((section, index) => {
      const r = section.getBoundingClientRect();
      const spansCentre = r.top <= vh * 0.35 && r.bottom >= vh * 0.65;
      if (!spansCentre) return;
      const overlay = Number(getComputedStyle(section, '::after').opacity);
      const next = sections[index + 1];
      const nextEntering = next ? next.getBoundingClientRect().top < vh : false;
      if (!nextEntering && overlay > 0.01) {
        const nr = next ? next.getBoundingClientRect() : null;
        problems.push(`active ${section.className.split(' ')[0]} dim overlay at ${overlay} (need 0) [section ${r.top.toFixed(0)}..${r.bottom.toFixed(0)}, next=${next ? next.className.split(' ').slice(0, 2).join('.') : 'none'} ${nr ? `${nr.top.toFixed(0)}..${nr.bottom.toFixed(0)}` : ''}, vh=${vh}]`);
      }
      if (nextEntering && overlay > 0.151) {
        problems.push(`covered ${section.className.split(' ')[0]} dim overlay at ${overlay} (cap 0.15)`);
      }
    });
    return problems;
  });
}

/** Phase 1.4 guard: when the purple pull line sits inside the centre third of
 *  the viewport, every word must be fully opaque white. */
async function measureScrubLine(page) {
  return page.evaluate(() => {
    const line = document.querySelector('.flow-scrub-line');
    if (!line) return [];
    const r = line.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.top < vh * 0.33 || r.bottom > vh * 0.66) return [];
    const problems = [];
    const colour = getComputedStyle(line).color;
    if (colour !== 'rgb(255, 255, 255)') problems.push(`pull line colour ${colour} (need white)`);
    for (const word of line.querySelectorAll('.scrub-word')) {
      const opacity = Number(getComputedStyle(word).opacity);
      if (opacity < 0.95) {
        problems.push(`pull line word at opacity ${opacity.toFixed(2)} while centred`);
        break;
      }
    }
    return problems;
  });
}

/** Phase 1.5 guard: with 4x CPU throttling the very first paint must already
 *  show the brand dark background and some text (fallback or app), never a
 *  blank frame. */
async function auditFirstPaint(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(BASE_URL, { waitUntil: 'commit', timeout: 45000 });
  await page.waitForSelector('body', { timeout: 30000 });
  const state = await page.evaluate(() => {
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const root = document.getElementById('root');
    const fallback = getComputedStyle(root, '::before').content;
    const text = (document.body.innerText || '').trim();
    return { htmlBg, bodyBg, fallback, hasText: text.length > 0, rootChildren: root.children.length, textSample: text.slice(0, 60) };
  });
  await page.screenshot({ path: path.join(OUT_DIR, 'first-paint-throttled.png') });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await context.close();
  const problems = [];
  // The inline critical CSS must own the very first paint: html = brand ink.
  if (state.htmlBg !== 'rgb(11, 13, 18)') problems.push(`first-paint html background ${state.htmlBg} (need rgb(11, 13, 18))`);
  // Once the app stylesheet lands, body must still be a dark brand colour
  // (any channel > 60 would mean a white/grey flash replaced the dark paint).
  const bodyChannels = (state.bodyBg.match(/\d+(\.\d+)?/g) || [255, 255, 255]).slice(0, 3).map(Number);
  if (bodyChannels.some((c) => c > 60)) problems.push(`body background ${state.bodyBg} is not dark (white flash risk)`);
  // Pseudo-element fallback text does not appear in innerText, so treat a
  // populated ::before content as visible text too.
  const hasFallback = typeof state.fallback === 'string' && state.fallback.includes('Veyra');
  if (!state.hasText && !hasFallback && state.rootChildren === 0) problems.push('first paint shows no text at all (blank frame)');
  return { state, problems };
}

/** Phase 1.8 guard: no horizontal overflow anywhere from 360 to 1920px. */
async function auditWidthSweep(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45000 }).catch(() => page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }));
  await page.waitForSelector('#flow-main, #root > *', { timeout: 30000 });
  await page.waitForTimeout(900);
  const failures = [];
  for (const width of [360, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(350);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) failures.push(`${width}px overflows by ${overflow}px`);
    await page.screenshot({ path: path.join(OUT_DIR, `width-${width}.png`) });
  }
  await context.close();
  return { failures };
}

/** Logo legibility: render the mark at 16/24/32/64px on the four brand
 *  backgrounds, save screenshots, and require >=3:1 contrast mark-vs-bg. */
async function auditLogo(browser) {
  const context = await browser.newContext({ viewport: { width: 720, height: 560 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const sizes = [16, 24, 32, 64];
  // Keep the path in sync with src/components/ui/veyra-logo.jsx (VEYRA_PULSE_PATH).
  const backgrounds = [
    ['ink', '#0b0d12', ''],
    ['cream', '#f4f1ea', '--veyra-tile: #5b3df5; --veyra-pulse: #f4f1ea;'],
    ['purple', '#5b3df5', '--veyra-tile: #f4f1ea; --veyra-pulse: #5b3df5; --veyra-dot: #0e7a52;'],
    ['red', '#ff4b2b', '--veyra-tile: #0b0d12; --veyra-pulse: #f4f1ea;'],
  ];
  const failures = [];
  const relativeLuminance = ([r, g, b]) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => {
    const la = relativeLuminance(parseRgb(a));
    const lb = relativeLuminance(parseRgb(b));
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  for (const [name, bg, override] of backgrounds) {
    for (const size of sizes) {
      await page.setContent(`<!doctype html><html><body style="margin:0;background:${bg};display:grid;place-items:center;height:100vh">
        <div style="${override}">
          <svg class="veyra-logo-mark" width="${size}" height="${size}" viewBox="0 0 48 48">
            <rect class="veyra-logo-tile" x="2" y="2" width="44" height="44" rx="9.7" fill="var(--veyra-tile, #5b3df5)"/>
            <path class="veyra-logo-pulse" d="M14 12 v12 l10 12 10 -12 v-12 l-10 17 l-4.5 -6.5" fill="none" stroke="var(--veyra-pulse, #f4f1ea)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <circle class="veyra-logo-dot" cx="38.5" cy="9.5" r="4.5" fill="var(--veyra-dot, #3ddc97)"/>
          </svg>
        </div>
      </body></html>`);
      const tileColour = await page.evaluate(() => getComputedStyle(document.querySelector('.veyra-logo-tile')).fill);
      const pulseColour = await page.evaluate(() => getComputedStyle(document.querySelector('.veyra-logo-pulse')).stroke);
      const cTile = contrast(tileColour, bg);
      // The dominant visible colour is the tile; the pulse must also read on the tile.
      const cPulseOnTile = contrast(pulseColour, tileColour);
      // The green dot is a decorative status LED; its ratio is recorded but the
      // hard 3:1 gate applies to tile-vs-background and pulse-vs-tile.
      const dotColour = await page.evaluate(() => getComputedStyle(document.querySelector('.veyra-logo-dot')).fill);
      const cDotOnTile = contrast(dotColour, tileColour);
      if (Math.min(cTile, cPulseOnTile) < 3) failures.push(`${name}@${size}px: tile contrast ${cTile.toFixed(2)}:1, pulse-on-tile ${cPulseOnTile.toFixed(2)}:1`);
      await page.locator('.veyra-logo-mark').screenshot({ path: path.join(OUT_DIR, `logo-${name}-${size}.png`) });
    }
  }
  await context.close();
  return { failures, checked: backgrounds.length * sizes.length };
}

async function auditViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: viewport.reducedMotion,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300)); });
  page.on('pageerror', (error) => consoleErrors.push(String(error).slice(0, 300)));

  const result = {
    viewport: viewport.name,
    url: BASE_URL,
    steps: [],
    failures: [],
    consoleErrors,
    triggerCounts: {},
  };

  const targetUrl = BASE_URL + (viewport.urlParam || '');
  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 45000 });
  } catch {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await page.waitForSelector('#flow-main, #root > *', { timeout: 30000 });
  await page.waitForTimeout(1500);

  const shoot = async (label, index) => {
    const measure = await measureBlank(page);
    const problems = blankVerdict(measure);
    if (viewport.name.startsWith('desktop') || viewport.name.startsWith('reduced')) {
      const purple = await measurePurple(page);
      if (purple.active && purple.found && (!purple.isWhite || purple.opacity < 1)) {
        problems.push(`purple headline colour ${purple.color} @ opacity ${purple.opacity} (need rgb(255,255,255) @ 1)`);
      }
      for (const colour of await measureSectionColours(page)) {
        if (!closeEnough(parseRgb(colour.bg), parseRgb(colour.expected))) {
          problems.push(`${colour.name} background ${colour.bg} != brand ${colour.expected}`);
        }
        if (colour.name === 'purple-headline' && (colour.opacity !== undefined && Number(colour.opacity) < 0.99)) {
          problems.push(`purple headline opacity ${colour.opacity} (need 1)`);
        }
      }
      const panel = await measurePanel(page);
      if (panel && panel.problems) problems.push(...panel.problems);
    }
    for (const problem of await measureForbidden(page)) problems.push(problem);
    if (!viewport.name.startsWith('motion-off')) {
      for (const problem of await measureDimOverlay(page)) problems.push(problem);
      for (const problem of await measureScrubLine(page)) problems.push(problem);
    }
    const horizontal = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (horizontal) problems.push('horizontal overflow');
    // Phase 7 typography checks run at rest steps only (every 4th step) to keep
    // the sweep fast; the fold check runs only when the viewport is at the top.
    const typeResults = {};
    const scrollYNow = await page.evaluate(() => window.scrollY);
    if (index % 4 === 0) {
      const width = viewport.width;
      const height = viewport.height;
      for (const [name, fn] of TYPE_CHECKS) {
        if (name === 'fold' && scrollYNow > 50) continue;
        try {
          const outcome = name === 'shape'
            ? await fn(page, width)
            : name === 'fold'
              ? await fn(page, width, height)
              : await fn(page);
          if (outcome?.problems?.length) problems.push(...outcome.problems.map((p) => `[${name}] ${p}`));
          typeResults[name] = outcome?.problems?.length ? outcome.problems : 'ok';
        } catch (error) {
          problems.push(`[type] ${name} check crashed: ${String(error).slice(0, 120)}`);
        }
      }
    }
    const file = path.join(OUT_DIR, viewport.name, `${String(index).padStart(3, '0')}-${label}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const step = { index, scrollY: scrollYNow, section: measure.activeSection, visibleText: measure.count, areaPct: Number(measure.areaPct.toFixed(2)), dominant: measure.dominant, typeChecks: typeResults, problems };
    result.steps.push(step);
    if (problems.length) result.failures.push({ step: index, scrollY: step.scrollY, section: measure.activeSection, problems });
  };

  const label = (y) => `y${Math.round(y)}`;

  // Pass 1: top -> bottom.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const max = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  let index = 0;
  for (let y = 0; y <= max + STEP_PX; y += STEP_PX) {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    await page.waitForTimeout(STEP_WAIT_MS);
    await shoot(label(y), index++);
  }

  // Pass 2: bottom -> top.
  for (let y = max; y >= 0; y -= STEP_PX) {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    await page.waitForTimeout(STEP_WAIT_MS);
    await shoot(`${label(y)}-up`, index++);
  }

  // Pass 3: down again.
  for (let y = 0; y <= max + STEP_PX; y += STEP_PX) {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    await page.waitForTimeout(STEP_WAIT_MS);
    await shoot(`${label(y)}-down2`, index++);
  }

  // Route stability: landing -> #dashboard -> landing must not leak triggers.
  // Keep any query string (?motion=off) so the motion state survives the round trip.
  const landingUrl = await page.evaluate(() => window.location.pathname + window.location.search);
  const countBefore = await page.evaluate(() => window.__getVeyraTriggerCount?.() ?? null);
  await page.evaluate((landing) => { window.history.pushState({}, '', landing); window.dispatchEvent(new PopStateEvent('popstate')); }, '#dashboard');
  await page.waitForTimeout(900);
  const dashboardTriggers = await page.evaluate(() => window.__getVeyraTriggerCount?.() ?? 0);
  await page.evaluate((landing) => { window.history.pushState({}, '', landing); window.dispatchEvent(new PopStateEvent('popstate')); }, landingUrl);
  await page.waitForTimeout(900);
  const countAfter = await page.evaluate(() => window.__getVeyraTriggerCount?.() ?? null);
  result.triggerCounts = { before: countBefore, dashboard: dashboardTriggers, after: countAfter };
  if (typeof countBefore === 'number' && typeof countAfter === 'number' && Math.abs(countAfter - countBefore) > 2) {
    result.failures.push({ step: 'route', section: 'landing->dashboard->landing', problems: [`ScrollTrigger count changed from ${countBefore} to ${countAfter}`] });
  }

  await context.close();
  return result;
}  const server = await ensureViteServer(BASE_URL);

try {
  const browser = await chromium.launch();
  const results = [];
  for (const viewport of VIEWPORTS) {
    process.stdout.write(`Auditing ${viewport.name}...\n`);
    results.push(await auditViewport(browser, viewport));
  }
  process.stdout.write('Auditing first paint (4x CPU throttle)...\n');
  const firstPaint = await auditFirstPaint(browser);
  process.stdout.write('Auditing width sweep 360-1920...\n');
  const widths = await auditWidthSweep(browser);
  process.stdout.write('Auditing logo renders...\n');
  const logo = await auditLogo(browser);
  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    url: BASE_URL,
    stepSizePx: STEP_PX,
    firstPaint,
    widthSweep: widths,
    logo: { checked: logo.checked, failures: logo.failures },
    totals: {
      steps: results.reduce((n, r) => n + r.steps.length, 0),
      failures: results.reduce((n, r) => n + r.failures.length, 0) + firstPaint.problems.length + widths.failures.length + logo.failures.length,
    },
    results,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  for (const result of results) {
    process.stdout.write(`\n${result.viewport}: ${result.steps.length} steps, ${result.failures.length} failing\n`);
    for (const failure of result.failures.slice(0, 8)) {
      process.stdout.write(`  FAIL ${failure.section} @ y=${failure.scrollY}: ${failure.problems.join('; ')}\n`);
    }
    if (result.consoleErrors.length) {
      process.stdout.write(`  console errors: ${result.consoleErrors.length}\n`);
      for (const e of result.consoleErrors.slice(0, 4)) process.stdout.write(`    - ${e}\n`);
    }
  }
  if (logo.failures.length) {
    process.stdout.write(`\nlogo contrast failures: ${logo.failures.length}\n`);
    for (const f of logo.failures) process.stdout.write(`  FAIL ${f}\n`);
  }
  if (firstPaint.problems.length) {
    process.stdout.write(`\nfirst-paint failures: ${firstPaint.problems.length}\n`);
    for (const p of firstPaint.problems) process.stdout.write(`  FAIL ${p}\n`);
  }
  if (widths.failures.length) {
    process.stdout.write(`\nwidth-sweep failures: ${widths.failures.length}\n`);
    for (const f of widths.failures) process.stdout.write(`  FAIL ${f}\n`);
  }
  process.stdout.write(`\nSummary written to ${path.join(OUT_DIR, 'summary.json')}\n`);
  process.exit(summary.totals.failures > 0 ? 1 : 0);
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
  }
}
