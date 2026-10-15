/**
 * Phase 7 typography checks. Each check is an async function taking a
 * Playwright `page` already on the landing route, plus optional viewport
 * width/height, and returning { problems: string[], data?: object }.
 * Imported and merged into the scroll audit summary by scripts/scroll-audit.mjs.
 */

/** Contrast helpers (WCAG 2.1 relative luminance). */
export function relativeLuminance([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** True if the element or any descendant has an unfinished animation/transition
 *  (transform, opacity, clip). Mid-reveal sampling produced false clipping,
 *  opacity and contrast failures, so visual checks skip unsettled elements. */
export function isSettled(el) {
  try {
    const anims = [...el.getAnimations({ subtree: true })];
    return !anims.some((a) => a.playState === 'running' || a.playState === 'idle');
  } catch {
    return true;
  }
}

/** Check 1 — FONTS: document.fonts.check per family + computed families + forbidden families. */
export async function checkFonts(page) {
  return page.evaluate(() => {
    const problems = [];
    const specs = {
      display: ['Instrument Serif', '16px "Instrument Serif"'],
      displayItalic: ['Instrument Serif italic', 'italic 16px "Instrument Serif"'],
      sans: ['Geist Variable', '16px "Geist Variable"'],
      mono: ['Geist Mono Variable', '13px "Geist Mono Variable"'],
    };
    const loaded = {};
    for (const [role, [, spec]] of Object.entries(specs)) {
      loaded[role] = document.fonts.check(spec);
      if (!loaded[role]) problems.push(`document.fonts.check failed for ${role}: ${spec}`);
    }
    const grab = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontFamily : null;
    };
    const computed = {
      h1: grab('h1'),
      h2: grab('h2'),
      h3: grab('h3'),
      body: grab('p'),
      mono: grab('code, .mono, [class*="mono"]'),
    };
    const forbidden = ['Inter', 'Roboto', 'Arial', 'Space Grotesk', 'Space Mono'];
    for (const [role, family] of Object.entries(computed)) {
      if (!family) continue;
      const first = family.split(',')[0].replace(/"/g, '').trim();
      if (forbidden.some((f) => first.toLowerCase() === f.toLowerCase())) problems.push(`${role} uses forbidden primary family: ${first}`);
      if (['h1', 'h2', 'h3'].includes(role) && !/Instrument Serif/.test(family)) {
        problems.push(`${role} not in display serif (${first})`);
      }
      if (role === 'body' && !/Geist Variable/.test(family)) problems.push(`body not in sans (${first})`);
      if (role === 'mono' && family && !/Geist Mono/.test(family)) problems.push(`mono element not in Geist Mono (${first})`);
    }
    return { problems, loaded, computed };
  });
}

/** Check 2 — NO SHOUTING: uppercase headings, all-caps rendered headings,
 *  per-section eyebrow cap (at most one), mono styled card labels. */
export async function checkShouting(page) {
  return page.evaluate(() => {
    const problems = [];
    for (const h of document.querySelectorAll('h1, h2, h3')) {
      const style = getComputedStyle(h);
      const text = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (style.textTransform === 'uppercase') problems.push(`h1/h2/h3 has text-transform: uppercase: "${text.slice(0, 40)}"`);
      const words = text.split(' ').filter((w) => w.length > 2);
      if (words.length >= 3 && words.every((w) => w === w.toUpperCase() && /[A-Z]/.test(w))) {
        problems.push(`heading rendered all-caps (JS): "${text.slice(0, 40)}"`);
      }
    }
    const eyebrowSections = new Map();
    for (const el of document.querySelectorAll('.flow-eyebrow, .section-eyebrow, .type-eyebrow')) {
      const section = el.closest('section, main, footer') || document.body;
      const key = (section.getAttribute('aria-label') || section.className.split(' ')[0] || section.tagName).slice(0, 24);
      eyebrowSections.set(key, (eyebrowSections.get(key) || 0) + 1);
    }
    for (const [section, count] of eyebrowSections) {
      if (count > 1) problems.push(`section "${section}" has ${count} eyebrows (max 1)`);
    }
    const liveCard = document.querySelector('.flow-live-card-head');
    if (liveCard && getComputedStyle(liveCard).fontFamily.toLowerCase().includes('mono')) {
      problems.push('.flow-live-card-head still renders in mono');
    }
    return { problems, eyebrows: [...eyebrowSections.entries()].map(([section, count]) => ({ section, count })) };
  });
}

/** Check 3 — SIZES: no rendered text under 12.5px (12px allowed for legal only). */
export async function checkSizes(page) {
  return page.evaluate(() => {
    const problems = [];
    const small = [];
    const seen = new Set();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode())) {
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const size = parseFloat(style.fontSize);
      if (size >= 12.5) continue;
      const legal = el.closest('[data-legal]') || /legal|attività|copyright|©/i.test(node.textContent);
      if (legal && size >= 12) continue;
      small.push({ text: node.textContent.trim().slice(0, 30), size: Math.round(size * 100) / 100 });
      if (small.length >= 8) break;
    }
    for (const item of small) problems.push(`text below 12.5px: "${item.text}" at ${item.size}px`);
    return { problems, small };
  });
}

/** Check 4 — MEASURE: paragraphs longer than 120 chars average 45-75 chars per
 *  line (Range.getClientRects). Single-line layout artifacts (split-word
 *  wrappers) fall back to a tracking-adjusted capacity estimate with a
 *  generous 90-cpl gate. */
export async function checkMeasure(page) {
  return page.evaluate(() => {
    const problems = [];
    const results = [];
    for (const p of document.querySelectorAll('p')) {
      const text = (p.textContent || '').trim();
      if (text.length < 120) continue;
      const style = getComputedStyle(p);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = p.getBoundingClientRect();
      if (rect.width < 2 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
      const range = document.createRange();
      range.selectNodeContents(p);
      let rects = [...range.getClientRects()].filter((r) => r.width > 8 && r.height > 4);
      const fontSize = parseFloat(style.fontSize) || 16;
      let lines;
      if (rects.length >= 2 && rect.height / rects[0].height >= 1.7) {
        lines = Math.round(rect.height / rects[0].height);
      } else {
        // Layout artifact (one rect per word/fragment or a stray inline span):
        // estimate capacity as available width over per-character advance with
        // letter-spacing removed from the ink estimate.
        const tracking = parseFloat(style.letterSpacing) || 0;
        const advance = (rect.width / Math.max(text.length, 1)) * Math.max(0, 1 - tracking / (fontSize * 0.55));
        lines = Math.max(1, Math.round(rect.height / (fontSize * (parseFloat(style.lineHeight) || 1.5))));
        if (lines <= 1) {
          const effCpl = Math.round(p.clientWidth / Math.max(advance, 1));
          results.push({ text: text.slice(0, 28), lines: 1, cplEff: effCpl, est: true });
          if (effCpl > 90) problems.push(`measure: "${text.slice(0, 32)}…" estimated ${effCpl} cpl (need <=90)`);
          continue;
        }
      }
      const cpl = text.length / lines;
      results.push({ text: text.slice(0, 28), lines, cpl: Math.round(cpl) });
      if (cpl < 45 || cpl > 75) problems.push(`measure: "${text.slice(0, 32)}…" runs ${Math.round(cpl)} cpl over ${lines} lines (need 45-75)`);
    }
    return { problems, results: results.slice(0, 12) };
  });
}

/** Check 5 — HEADLINE SHAPE: natural-wrap line counts, orphans, masked
 *  descender clipping. Headings built from authored line spans
 *  (.flow-headline-line) are the designed rag and skip the orphan rule;
 *  mid-reveal animations are skipped entirely. */
export async function checkHeadlineShape(page, width) {
  return page.evaluate((width) => {
    const problems = [];
    const settled = (el) => {
      try { return ![...el.getAnimations({ subtree: true })].some((a) => a.playState === 'running' || a.playState === 'idle'); }
      catch { return true; }
    };
    const maxLines = width >= 1280 ? 3 : width >= 768 ? 4 : 5;
    const check = (heading, tag) => {
      if (!settled(heading)) return;
      const text = (heading.textContent || '').trim();
      if (!text) return;
      if (heading.querySelector('.flow-headline-line')) return; // authored line spans — designed rag
      const style = getComputedStyle(heading);
      const fontSize = parseFloat(style.fontSize) || 16;
      const lh = parseFloat(style.lineHeight) || fontSize;
      const rect = heading.getBoundingClientRect();
      const lines = Math.max(1, Math.round(rect.height / (lh * 0.92)));
      if (lines > maxLines) problems.push(`${tag} has ${lines} lines (max ${maxLines} at ${width}px): "${text.slice(0, 32)}"`);
      const range = document.createRange();
      range.selectNodeContents(heading);
      const rects = [...range.getClientRects()].filter((r) => r.width > 4 && r.height > 4);
      const lastRect = rects[rects.length - 1];
      const words = text.split(/\s+/);
      if (lastRect && words.length > 1 && lastRect.width < fontSize * 1.6) {
        problems.push(`${tag} ends with a single-word orphan line: "${words[words.length - 1]}"`);
      }
    };
    document.querySelectorAll('h1').forEach((h) => check(h, 'h1'));
    document.querySelectorAll('h2').forEach((h) => check(h, 'h2'));
    for (const mask of document.querySelectorAll('.flow-headline-mask')) {
      // GSAP-driven reveal/y-parallax legitimately translates the masked line;
      // measured at rest (JS motion off / reduced motion / motion=off).
      if (!document.documentElement.classList.contains('js-motion') && !settled(mask)) continue;
      if (mask.scrollHeight > mask.clientHeight + 2) {
        problems.push(`masked line clipped: scrollHeight ${mask.scrollHeight} vs clientHeight ${mask.clientHeight}`);
      }
      if (mask.scrollWidth > mask.clientWidth + 2) {
        problems.push('masked line clipped horizontally');
      }
    }
    return { problems };
  }, width).then((outcome) => ({ ...outcome, data: { maxLines: width >= 1280 ? 3 : width >= 768 ? 4 : 5 } }));
}

/** Check 6 — CONTRAST: AA for visible text on its composited, effective
 *  background (glass panes and translucent overlays are folded down the stack
 *  until an opaque colour is reached). */
export async function checkContrast(page) {
  return page.evaluate(() => {
    const problems = [];
    const parse = (raw) => {
      const m = (raw || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
      return { rgb: parts.slice(0, 3), a: parts.length >= 4 ? parts[3] : 1 };
    };
    const lum = ([r, g, b]) => {
      const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const settled = (el) => {
      try { return ![...el.getAnimations({ subtree: true })].some((a) => a.playState === 'running' || a.playState === 'idle'); }
      catch { return true; }
    };
    const composeBg = (el) => {
      const layers = [];
      for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
        const parsed = parse(getComputedStyle(node).backgroundColor);
        if (parsed) layers.push(parsed);
        if (parsed && parsed.a >= 1) break;
      }
      if (!layers.length) return null;
      const html = parse(getComputedStyle(document.documentElement).backgroundColor) || { rgb: [11, 13, 18], a: 1 };
      layers.push(html);
      let out = layers[layers.length - 1].rgb.slice();
      for (let i = layers.length - 2; i >= 0; i--) {
        const { rgb, a } = layers[i];
        out = [rgb[0] * a + out[0] * (1 - a), rgb[1] * a + out[1] * (1 - a), rgb[2] * a + out[2] * (1 - a)];
      }
      return Math.round(out[0]) + ', ' + Math.round(out[1]) + ', ' + Math.round(out[2]);
    };
    const seen = new Set();
    for (const el of document.querySelectorAll('h1, h2, h3, p, li, summary, strong, b, small, span, button, a, td, th, dt, dd')) {
      if ([...el.children].some((c) => c.matches('h1, h2, h3, p, li, summary, strong, b, small, span, button, a, td, th, dt, dd'))) continue;
      const text = (el.textContent || '').trim();
      if (!text) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
      // During entrance transitions the element may still be fading/sliding, so
      // skip it here; contrast is re-measured on a later audit step.
      if (!document.documentElement.classList.contains('js-motion') && !settled(el)) continue;
      let fg = parse(style.color).rgb;
      const bgComposite = composeBg(el);
      if (!bgComposite) continue;
      const op = getComputedStyle(el).opacity;
      if (op && Number(op) < 1) {
        const bg = bgComposite.split(', ').map(Number);
        const alpha = Number(op);
        fg = fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
      }
      const key = fg.map((c) => Math.round(c)) + '|' + bgComposite;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = ratio(fg, bgComposite.split(', ').map(Number));
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 600);
      const need = large ? 3 : 4.5;
      if (r < need) {
        problems.push(`contrast ${r.toFixed(2)}:1 (need ${need}:1) for "${text.slice(0, 32)}" on bg rgb(${bgComposite})`);
      }
      if (problems.length >= 6) break;
    }
    return { problems, checked: seen.size };
  });
}

/** Check 7 — NUMBERS: data-number elements use tabular figures and keep width
 *  while counting. */
export async function checkNumbers(page) {
  const collect = () => page.evaluate(() => [...document.querySelectorAll('[data-number="true"]')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.bottom > 0 && r.top < window.innerHeight; })
    .map((el) => {
      const style = getComputedStyle(el);
      const tnum = style.fontVariantNumeric.includes('tabular-nums') || (style.fontFeatureSettings || '').includes('tnum');
      return { text: (el.textContent || '').trim().slice(0, 16), width: el.getBoundingClientRect().width, tnum };
    }));
  const initial = await collect();
  await page.waitForTimeout(900);
  const afterWait = await collect();
  const problems = [];
  for (const item of initial) {
    if (!item.tnum) problems.push(`[data-number] "${item.text}" does not use tabular-nums`);
  }
  for (const after of afterWait) {
    const before = initial.find((b) => b.text === after.text);
    if (before && Math.abs(before.width - after.width) > 2) {
      problems.push(`[data-number] "${after.text}" width changed ${before.width.toFixed(0)} -> ${after.width.toFixed(0)} while counting`);
    }
  }
  return { problems, counted: initial.length };
}

/** Check 8 — LAYOUT: hero h1 + subcopy + CTAs fully inside the first viewport. */
export async function checkHeroFold(page, width, height) {
  return page.evaluate(({ height }) => {
    const problems = [];
    const hero = document.querySelector('.flow-ink-section');
    if (!hero) return { problems: ['no .flow-ink-section hero found'], data: null };
    const h1 = hero.querySelector('h1');
    const lead = hero.querySelector('.flow-lead');
    const actions = hero.querySelector('.flow-actions');
    for (const [label, el] of [['h1', h1], ['subcopy', lead], ['CTAs', actions]]) {
      if (!el) { problems.push(`hero ${label} missing`); continue; }
      const r = el.getBoundingClientRect();
      if (r.bottom > height + 1) problems.push(`hero ${label} bottom at ${Math.round(r.bottom)} (fold at ${height})`);
    }
    return { problems, data: { height } };
  }, { height });
}

export const TYPE_CHECKS = [
  ['fonts', checkFonts],
  ['shouting', checkShouting],
  ['sizes', checkSizes],
  ['measure', checkMeasure],
  ['shape', checkHeadlineShape],
  ['contrast', checkContrast],
  ['numbers', checkNumbers],
  ['fold', checkHeroFold],
];
