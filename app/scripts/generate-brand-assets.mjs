#!/usr/bin/env node
/**
 * Dev-only brand asset generator. Renders public/brand-master.svg in a headless
 * Chromium page and exports favicon-32.png, apple-touch-icon.png (180px) and
 * og-image.png (1200x630). Uses the Playwright devDependency only.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const svgPath = path.join(root, 'public', 'brand-master.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 700 }, deviceScaleFactor: 1 });

async function render(size, file) {
  await page.setContent(`<!doctype html><html><body style="margin:0">
    <div id="m" style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
  </body></html>`);
  await page.locator('#m').screenshot({ path: path.join(root, 'public', file) });
  console.log(`✓ public/${file} (${size}x${size})`);
}

await render(32, 'favicon-32.png');
await render(180, 'apple-touch-icon.png');

// og-image.png: scale the mark group to 0.375 and drop the wordmark.
{
  const mark = svg.replace(/<g transform="scale\(1\.375[^"]*">[\s\S]*?<\/g>\s*(?=<text)/, '').replace('<g transform="scale(1.375', '<g transform="scale(0.375');
  await page.setContent(`<!doctype html><html><body style="margin:0">
    <div id="m" style="width:1200px;height:630px">${mark}</div>
  </body></html>`);
  await page.locator('#m').screenshot({ path: path.join(root, 'public', 'og-image.png') });
  console.log('✓ public/og-image.png (1200x630)');
}

await browser.close();
