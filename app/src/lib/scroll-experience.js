import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const MOTION_CLASS = 'js-motion';

function splitCharacters(node) {
  if (!node || node.dataset.splitReady) return;
  // Type system: preserve inline italic accents (<em>) instead of flattening
  // them to plain text — the serif italic is a designed part of the headline.
  const parts = [...node.childNodes].map((child) =>
    child.nodeType === Node.ELEMENT_NODE && child.tagName === 'EM'
      ? { italic: true, text: child.textContent }
      : { italic: false, text: child.textContent || '' },
  );
  node.textContent = '';
  let index = 0;
  parts.forEach((part) => {
    let target = node;
    if (part.italic) {
      target = document.createElement('em');
      node.appendChild(target);
    }
    [...part.text].forEach((character) => {
      const span = document.createElement('span');
      span.textContent = character === ' ' ? '\u00a0' : character;
      span.className = 'flow-character';
      span.style.setProperty('--char-index', index);
      span.setAttribute('aria-hidden', 'true');
      target.appendChild(span);
      index += 1;
    });
  });
  node.dataset.splitReady = 'true';
}

function motionDisabledReason() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('motion') === 'off') return '?motion=off';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'prefers-reduced-motion';
  if (!window.matchMedia('(min-width: 768px)').matches) return 'viewport under 768px';
  if (window.matchMedia('(pointer: coarse)').matches) return 'coarse pointer';
  return null;
}

export function initScrollExperience(root) {
  // Exposed for the automated scroll audit even when motion is disabled.
  window.__getVeyraTriggerCount = () => ScrollTrigger.getAll().length;
  if (import.meta.env.DEV) window.__veyraST = ScrollTrigger;

  if (!root) return () => {};
  const disabledReason = motionDisabledReason();
  if (disabledReason) {
    if (import.meta.env.DEV) console.info(`[Veyra] Motion disabled (${disabledReason}). Content is fully visible without it.`);
    return () => {};
  }

  const html = document.documentElement;
  let lenis = null;
  let tickerFn = null;
  let lenisScrollHandler = null;
  let lenisVelocityHandler = null;
  let resizeHandler = null;
  let ctx = null;
  let disposed = false;
  const disposables = [];

  const killMotion = () => {
    disposables.splice(0).forEach((fn) => { try { fn(); } catch { /* keep cleaning */ } });
    if (ctx) { try { ctx.revert(); } catch { /* already reverted */ } ctx = null; }
    if (lenis) {
      if (lenisScrollHandler) lenis.off('scroll', lenisScrollHandler);
      if (lenisVelocityHandler) lenis.off('scroll', lenisVelocityHandler);
      lenis.destroy();
      lenis = null;
    }
    if (tickerFn) { gsap.ticker.remove(tickerFn); tickerFn = null; }
    gsap.ticker.lagSmoothing(500, 33);
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); resizeHandler = null; }
    root.querySelectorAll('.flow-marquee-track.is-gsap-marquee').forEach((track) => track.classList.remove('is-gsap-marquee'));
    root.classList.remove('is-incident');
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  };

  try {
    lenis = new Lenis({ autoRaf: false, smoothWheel: true, syncTouch: false });
    tickerFn = (time) => lenis.raf(time * 1000);
    lenisScrollHandler = () => ScrollTrigger.update();
    lenis.on('scroll', lenisScrollHandler);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    // Hidden initial states are gated behind this class. It is only added after
    // GSAP and Lenis started successfully, and removed on cleanup or error.
    html.classList.add(MOTION_CLASS);

    // The context object is assigned BEFORE any tween code runs (empty context,
    // then the build is added to it), so a failure mid-build can always be
    // fully reverted by killMotion.
    ctx = gsap.context(() => {}, root);
    ctx.add(() => {
      root.querySelectorAll('[data-split-chars="true"] .flow-headline-line').forEach(splitCharacters);

      const sections = [...root.querySelectorAll('[data-stack-section]')];

      // Live document-space top of an element. Pin spacers change layout AFTER
      // triggers are created, so string positions ('top bottom') can go stale;
      // function-based start/end are re-evaluated on every ScrollTrigger
      // refresh, which keeps the dim and corner tweens aligned with reality.
      const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;

      // Safety net: if the CSS intro reveal has not finished within 2.5s (tab
      // throttling, slow fonts), force the final state: full opacity, exact
      // colour, no leftover transform.
      const introTimer = window.setTimeout(() => html.classList.add('intro-done'), 2500);
      disposables.push(() => window.clearTimeout(introTimer));

      // Hero: gentle parallax only. Values stay far from anything that could hide content.
      const hero = root.querySelector('.flow-ink-section');
      const heroHeadline = hero?.querySelector('.flow-headline');
      if (hero && heroHeadline) {
        gsap.fromTo(heroHeadline, { yPercent: 0, scale: 1 }, {
          yPercent: -8,
          scale: 0.94,
          transformOrigin: 'left bottom',
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .6, invalidateOnRefresh: true },
        });
      }

      // Purple section: no pin. Character reveal starts as the section enters the
      // viewport and always lands at opacity 1, with clearProps on completion.
      const purple = root.querySelector('.flow-violet-section');
      if (purple) {
        purple.querySelectorAll('[data-split-chars="true"] .flow-headline-line').forEach((node) => {
          const chars = node.querySelectorAll('.flow-character');
          if (!chars.length) return;
          gsap.fromTo(chars, { opacity: .15, yPercent: 30 }, {
            opacity: 1,
            yPercent: 0,
            stagger: .02,
            ease: 'none',
            scrollTrigger: {
              trigger: purple,
              start: 'top bottom',
              end: 'top 25%',
              scrub: .5,
              invalidateOnRefresh: true,
              onComplete: () => gsap.set(chars, { clearProps: 'opacity,transform' }),
            },
          });
        });
      }

      // Cream section: ONE mechanism — a single pinned master timeline.
      // Content is visible at progress 0 (step 1 active); each step gets ~60vh.
      const cream = root.querySelector('.flow-how-section');
      if (cream) {
        const stepRows = [...cream.querySelectorAll('.flow-step')];
        let currentStep = 0;
        const syncStep = (self) => {
          const next = clamp(Math.floor(self.progress * 4), 0, 3);
          if (next !== currentStep) {
            currentStep = next;
            cream.dispatchEvent(new CustomEvent('flowstep', { detail: next }));
          }
        };

        // With pinSpacing: false, the section's natural height (280vh) provides
        // the scroll distance. The pin duration is set to ~250vh via end parameter.
        const master = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: cream,
            start: 'top top',
            end: () => '+=' + Math.round(window.innerHeight * 2.5),
            pin: true,
            pinSpacing: false,
            anticipatePin: 1,
            scrub: .5,
            invalidateOnRefresh: true,
            onUpdate: syncStep,
            onRefresh: syncStep,
          },
        });
        // Pad the timeline to a total duration of 4 so quarter marks of the
        // pin progress line up exactly with the step labels.
        master.to({ t: 0 }, { t: 1, duration: 4 }, 0);
        stepRows.forEach((row, index) => {
          if (index === 0) return;
          master.fromTo(row, { opacity: .38, x: -18 }, { opacity: 1, x: 0, duration: .5 }, index);
        });
      }

      // Red section: pinned master timeline, ~180vh.
      const red = root.querySelector('.flow-alert-section');
      if (red) {
        const card = red.querySelector('.flow-break-demo');

        // With pinSpacing: false, the section's natural height (200vh) provides
        // the scroll distance. The pin duration is set to ~180vh via end parameter.
        const incident = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: red,
            start: 'top top',
            end: () => '+=' + Math.round(window.innerHeight * 1.8),
            pin: true,
            pinSpacing: false,
            anticipatePin: 1,
            scrub: .5,
            invalidateOnRefresh: true,
            onToggle: (self) => root.classList.toggle('is-incident', self.isActive),
          },
        });
        if (card) incident.fromTo(card, { scale: 1, yPercent: 0 }, { scale: 1.05, yPercent: -2, duration: 1.6 }, 0);
      }

      // Rounded top corners while the next chapter slides in. Cosmetic only:
      // it never touches opacity, filter or background, and is fully reversible.
      // Created AFTER the pinned triggers and with refreshPriority -1 so every
      // refresh computes their positions from the final pin-spacer layout.
      sections.forEach((section) => {
        gsap.fromTo(section, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }, {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: () => topOf(section) - window.innerHeight,
            end: () => topOf(section),
            scrub: true, invalidateOnRefresh: true, refreshPriority: -1,
          },
        });
      });

      // Outgoing "dim" lives on a pseudo-element overlay capped at 15% black.
      // The section's own background and text are never tweened.
      // Root-cause history: (1) the previous tween animated the section AFTER
      // the outgoing one using default immediateRender, leaving stale --outgoing-dim
      // behind; (2) even with function-based positions, triggers created BEFORE
      // the pin triggers measured pre-pin-spacer offsets on refresh, so the dim
      // completed ~2200px early (grey cream while pinned). Pins are created
      // first, these after, with refreshPriority -1: the dim now scrubs 0 ->
      // 0.15 exactly while the NEXT section slides over, and reverse/refresh
      // callbacks force the exact neutral value so it can never stick.
      const NEUTRAL_DIM = { '--outgoing-dim': 0 };
      const forceNeutral = (section) => () => gsap.set(section, NEUTRAL_DIM);
      sections.forEach((section, index) => {
        if (index === sections.length - 1) return;
        const next = sections[index + 1];
        gsap.fromTo(section, NEUTRAL_DIM, {
          '--outgoing-dim': 0.15,
          ease: 'none',
          scrollTrigger: {
            trigger: next,
            start: () => topOf(next) - window.innerHeight,
            end: () => topOf(next),
            scrub: true,
            invalidateOnRefresh: true,
            refreshPriority: -1,
            onEnterBack: forceNeutral(section),
            onLeaveBack: forceNeutral(section),
            onRefresh: forceNeutral(section),
          },
        });
      });

      // Marquee: GSAP-driven with scroll-velocity link; CSS fallback stays intact.
      const track = root.querySelector('.flow-marquee-track');
      if (track) {
        track.classList.add('is-gsap-marquee');
        const marquee = gsap.to(track, { xPercent: -50, duration: 24, repeat: -1, ease: 'none' });
        // Speed reacts to scroll velocity within clamped limits and reverses while scrolling up.
        lenisVelocityHandler = ({ velocity }) => {
          const magnitude = clamp(1 + Math.abs(velocity || 0) * .04, .65, 2.2);
          marquee.timeScale(velocity < -0.5 ? -magnitude : magnitude);
        };
        lenis.on('scroll', lenisVelocityHandler);
        // Pause while hovered; CSS animation is already paused by :hover.
        const marqueeHost = track.closest('.flow-marquee');
        if (marqueeHost) {
          const pause = () => marquee.pause();
          const resume = () => marquee.resume();
          marqueeHost.addEventListener('pointerenter', pause);
          marqueeHost.addEventListener('pointerleave', resume);
          disposables.push(() => {
            marqueeHost.removeEventListener('pointerenter', pause);
            marqueeHost.removeEventListener('pointerleave', resume);
          });
        }
      }

      root.querySelectorAll('[data-magnetic]').forEach((button) => {
        const move = (event) => {
          const bounds = button.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width - .5) * 16;
          const y = ((event.clientY - bounds.top) / bounds.height - .5) * 16;
          gsap.to(button, { x: clamp(x, -8, 8), y: clamp(y, -8, 8), duration: .3, overwrite: true });
        };
        const reset = () => gsap.to(button, { x: 0, y: 0, duration: .45, overwrite: true });
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerleave', reset);
        disposables.push(() => {
          button.removeEventListener('pointermove', move);
          button.removeEventListener('pointerleave', reset);
        });
      });
    });

    // Refresh after fonts, images and responsive galleries settle, on resize
    // (debounced), and once now that the js-motion class is applied.
    const refresh = () => { if (!disposed) ScrollTrigger.refresh(); };
    document.fonts?.ready.then(refresh);
    const images = [...root.querySelectorAll('img')];
    const onImageLoad = () => refresh();
    images.forEach((image) => image.addEventListener('load', onImageLoad, { once: true }));
    let resizeTimer = 0;
    resizeHandler = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 150);
    };
    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('fan:layout', resizeHandler);
    disposables.push(() => {
      images.forEach((image) => image.removeEventListener('load', onImageLoad));
      window.removeEventListener('fan:layout', resizeHandler);
      window.clearTimeout(resizeTimer);
    });
    refresh();

    if (import.meta.env.DEV) {
      const count = ScrollTrigger.getAll().length;
      if (typeof window.__veyraTriggerCount === 'number' && count > window.__veyraTriggerCount) {
        console.warn('[Veyra] ScrollTrigger count increased after re-entry:', window.__veyraTriggerCount, '->', count);
      }
      window.__veyraTriggerCount = count;
      console.info('[Veyra] ScrollTrigger count:', count);
    }
  } catch (error) {
    console.error('[Veyra] Scroll experience failed to initialise. Falling back to fully visible static content.', error);
    killMotion();
    html.classList.remove(MOTION_CLASS);
    return () => {};
  }

  return () => {
    disposed = true;
    killMotion();
    html.classList.remove(MOTION_CLASS);
    delete window.__veyraTriggerCount;
  };
}
