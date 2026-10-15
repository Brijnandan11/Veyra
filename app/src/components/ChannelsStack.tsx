import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/* ────────────────────────────────────────────────────────────────────────
   ChannelsStack — "Use the channels your team already has"

   Pinned scroll sequence (Vite + React, no animation libs):
     p ∈ [0, 0.12]    deck rises into frame
     p ∈ [0.16, 0.30] cover card flips (rotateY 0→180); the 6 channel cards
                      flip in (rotateY -180→0) and settle into a tilted stack
     p ∈ [0.38, 1]    cards peel away upward one by one (Email first); the
                      card underneath straightens up and becomes the active
                      channel. The last card (Incident timeline) stays.

   The counter, channel name and description on the right follow whichever
   card is on top. Arrows + dots scroll the page to that card's segment.

   Fallback: below 1000px or with prefers-reduced-motion it becomes
   a plain horizontal snap carousel (no pin, no 3D).

   Theming hooks (optional, all have fallbacks):
     --accent        purple accent       (default #6d4aff)
     --font-display  serif display face  (default Instrument Serif/Georgia)
     --font-mono     mono face
   ──────────────────────────────────────────────────────────────────────── */

type Channel = {
  name: string;
  kicker: string;
  desc: string;
  sentWhen: string;
  preview: string[]; // 3 mono lines shown on the card
  bg: string; // card background
  fg: string; // card text / icon colour
  icon: string; // svg path data, 24 box, stroked
  offsetX: number; // % of card width the card sits off-centre while stacked
  offsetY: number; // % of card height
  flipTilt: number; // rotateZ (deg) while sitting in the stack
  dismissTilt: number; // rotateZ (deg) at the top of its exit
  dismissX: number; // % sideways drift during its exit
};

const CHANNELS: Channel[] = [
  {
    name: "Email",
    kicker: "Alert",
    desc: "A clear incident summary when a check changes state.",
    sentWhen: "A check changes state",
    preview: ["To oncall@acme.com", "Payments gateway failed", "Down since 14:02 UTC"],
    bg: "#6d4aff",
    fg: "#f5f2ff",
    icon: "M4 6h16v12H4z M4 7l8 6 8-6",
    offsetX: 0, offsetY: 0, flipTilt: 0, dismissTilt: -48, dismissX: -10,
  },
  {
    name: "Slack",
    kicker: "Chat",
    desc: "A message in the channel your team already watches, with the failing check linked.",
    sentWhen: "An incident opens or resolves",
    preview: ["#on-call", "Veyra · Payments gateway", "Failing · 10.0 s timeout"],
    bg: "#e9e3d6",
    fg: "#1a1813",
    icon: "M5 5h14v10H9l-4 4z",
    offsetX: 4, offsetY: 3, flipTilt: -12, dismissTilt: 54, dismissX: 12,
  },
  {
    name: "Webhook",
    kicker: "Event",
    desc: "A signed JSON payload posted to any endpoint you own.",
    sentWhen: "Any check changes state",
    preview: ["POST /hooks/veyra", "x-veyra-signature: sha256=…", '{ "event": "check.failed" }'],
    bg: "#1f6f5c",
    fg: "#f1f7f3",
    icon: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12",
    offsetX: -5, offsetY: 5, flipTilt: 8, dismissTilt: -58, dismissX: -14,
  },
  {
    name: "Public status page",
    kicker: "Page",
    desc: "Customers see the problem on your status page before they have to ask.",
    sentWhen: "An incident is published",
    preview: ["status.acme.com", "Payments gateway", "Investigating · 14:04 UTC"],
    bg: "#d9a441",
    fg: "#1a1813",
    icon: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
    offsetX: 6, offsetY: 2, flipTilt: -18, dismissTilt: 46, dismissX: 10,
  },
  {
    name: "REST API",
    kicker: "Data",
    desc: "Pull checks, results and incidents into your own tools.",
    sentWhen: "You query it",
    preview: ["GET /v1/incidents?status=open", "200 OK · 38 ms", '{ "open": 1 }'],
    bg: "#ef5b4f",
    fg: "#fff6f3",
    icon: "M4 5h16v14H4z M8 10l3 2-3 2 M13 15h3",
    offsetX: -3, offsetY: 6, flipTilt: 14, dismissTilt: -50, dismissX: -8,
  },
  {
    name: "Incident timeline",
    kicker: "Evidence",
    desc: "Every alert, status change and check result in one ordered history.",
    sentWhen: "An incident opens, changes or closes",
    preview: ["14:02  check failed", "14:02  alert sent to #on-call", "14:09  recovered"],
    bg: "#3b74e8",
    fg: "#f3f7ff",
    icon: "M6 4v16 M6 7h12 M6 12h8 M6 17h10",
    offsetX: 3, offsetY: 4, flipTilt: -7, dismissTilt: 0, dismissX: 0,
  },
];

const N = CHANNELS.length;

/* ── timeline ── */
const ENTER_END = 0.12;
const FLIP_START = 0.16;
const FLIP_END = 0.3;
const DISMISS_START = 0.38;
const WINDOW = (1 - DISMISS_START) / (N - 1); // scroll share per peeled card
const INFO_IN_START = 0.2;
const INFO_IN_END = 0.32;
const SETTLED_P = (FLIP_END + DISMISS_START) / 2; // stack settled, nothing peeled

/* ── helpers ── */
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mapRange = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// a touch of overshoot so the flip lands with a little spring
const easeOutBack = (t: number) => {
  const c = 1.7;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const pad2 = (n: number) => String(n).padStart(2, "0");
// scroll progress at which channel k is the active (top) card
const targetP = (k: number) =>
  k === 0 ? SETTLED_P : Math.min(DISMISS_START + k * WINDOW, 0.999);

const wantsCarousel = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(max-width: 1000px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

export default function ChannelsStack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);

  const [active, setActive] = useState(0);
  const [carousel, setCarousel] = useState<boolean>(wantsCarousel);

  const commit = useCallback((i: number) => {
    if (activeRef.current !== i) {
      activeRef.current = i;
      setActive(i);
    }
  }, []);

  /* keep layout mode in sync with viewport / motion preference */
  useEffect(() => {
    const mqW = window.matchMedia("(max-width: 1000px)");
    const mqR = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCarousel(mqW.matches || mqR.matches);
    sync();
    mqW.addEventListener("change", sync);
    mqR.addEventListener("change", sync);
    return () => {
      mqW.removeEventListener("change", sync);
      mqR.removeEventListener("change", sync);
    };
  }, []);

  /* ── desktop: scroll-driven stack ── */
  useEffect(() => {
    if (carousel) return;
    const track = trackRef.current;
    if (!track) return;

    const apply = (p: number) => {
      // 1 — deck rises in
      const enter = smooth(mapRange(0, ENTER_END, p));
      const deckY = lerp(55, 0, enter);

      // 2 — cover flips away, stack flips in (with a little overshoot)
      const flip = easeOutBack(mapRange(FLIP_START, FLIP_END, p));
      const flipT = clamp01(flip);
      if (frontRef.current) {
        frontRef.current.style.transform =
          `translate(-50%,calc(-50% + ${deckY}%)) rotateY(${lerp(0, 180, flip)}deg)`;
      }

      // side info + nav fade in once the stack is revealed
      if (infoRef.current) {
        const a = smooth(mapRange(INFO_IN_START, INFO_IN_END, p));
        infoRef.current.style.opacity = `${a}`;
        infoRef.current.style.transform = `translateY(${(1 - a) * 18}px)`;
      }
      if (navRef.current) {
        navRef.current.style.opacity = `${enter}`;
        navRef.current.style.pointerEvents = enter > 0.6 ? "auto" : "none";
      }

      // 3 — peel cards in order: Email leaves first, last card stays
      const d: number[] = new Array(N).fill(0);
      let dismissed = 0; // continuous "how many cards have left"
      for (let i = 0; i < N - 1; i++) {
        const s = DISMISS_START + i * WINDOW;
        d[i] = smooth(mapRange(s, s + WINDOW, p));
        dismissed += d[i];
      }

      CHANNELS.forEach((c, i) => {
        const el = cardRefs.current[i];
        if (!el) return;
        const depth = Math.max(0, i - dismissed); // 0 = on top
        const near = smooth(clamp01(depth)); // 0 on top → 1 once buried
        const ry = lerp(-180, 0, flip);
        const x = c.offsetX * near * flipT + c.dismissX * d[i];
        const y = deckY + c.offsetY * near * flipT + lerp(0, -240, d[i]);
        const rz = lerp(c.flipTilt * near * flipT, c.dismissTilt, d[i]);
        el.style.transform =
          `translate(calc(-50% + ${x}%),calc(-50% + ${y}%)) rotateY(${ry}deg) rotateZ(${rz}deg)`;
        el.style.opacity = `${1 - d[i] * d[i]}`;
      });

      commit(clamp(Math.round(dismissed), 0, N - 1));
    };

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const span = track.offsetHeight - window.innerHeight;
      apply(clamp01(span > 0 ? -rect.top / span : 0));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      // hand layout back to CSS (carousel mode)
      cardRefs.current.forEach((el) => {
        if (el) {
          el.style.transform = "";
          el.style.opacity = "";
        }
      });
      if (frontRef.current) frontRef.current.style.transform = "";
      if (infoRef.current) {
        infoRef.current.style.opacity = "";
        infoRef.current.style.transform = "";
      }
      if (navRef.current) {
        navRef.current.style.opacity = "";
        navRef.current.style.pointerEvents = "";
      }
    };
  }, [carousel, commit]);

  /* ── carousel: active card follows the horizontal scroll ── */
  const onDeckScroll = () => {
    if (!carousel) return;
    const deck = deckRef.current;
    if (!deck) return;
    const mid = deck.scrollLeft + deck.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    commit(best);
  };

  /* ── arrows + dots ── */
  const goTo = (k: number) => {
    const i = clamp(k, 0, N - 1);
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    if (carousel) {
      const deck = deckRef.current;
      const el = cardRefs.current[i];
      if (!deck || !el) return;
      deck.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - deck.clientWidth / 2, behavior });
      commit(i);
      return;
    }

    const track = trackRef.current;
    if (!track) return;
    const span = track.offsetHeight - window.innerHeight;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + targetP(i) * span, behavior });
  };

  const ch = CHANNELS[active];

  return (
    <section className={`vc-root${carousel ? " vc-carousel" : ""}`} aria-label="Alert channels">
      <style>{css}</style>

      <div className="vc-track" ref={trackRef}>
        <div className="vc-stage">
          {/* left — headline */}
          <header className="vc-head">
            <p className="vc-eyebrow">How alerts reach you</p>
            <h2 className="vc-title">Use the channels your team already has</h2>
          </header>

          {/* centre — the deck */}
          <div className="vc-deck-col">
            <div className="vc-deck" ref={deckRef} onScroll={onDeckScroll}>
              <div
                className="vc-card vc-front"
                ref={frontRef}
                aria-hidden="true"
                style={{ background: "#fbfaf6", color: "#13141b" }}
              >
                <span className="vc-kicker">Start here</span>
                <h3 className="vc-front-title">Six ways to get the alert</h3>
                <div className="vc-front-foot">
                  <p>Scroll to open the stack.</p>
                  <span className="vc-ring">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 10l4 4 4-4" />
                    </svg>
                  </span>
                </div>
              </div>

              {CHANNELS.map((c, i) => (
                <div
                  key={c.name}
                  className="vc-card vc-back"
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  aria-hidden={!carousel}
                  style={{ zIndex: 10 + (N - i), background: c.bg, color: c.fg } as CSSProperties}
                >
                  <div className="vc-card-top">
                    <span className="vc-chip">
                      <svg viewBox="0 0 24 24">
                        <path d={c.icon} />
                      </svg>
                    </span>
                    <span className="vc-kicker">{c.kicker}</span>
                  </div>
                  <h3 className="vc-card-title">{c.name}</h3>
                  <div className="vc-preview">
                    {c.preview.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="vc-nav" ref={navRef}>
              <button
                type="button"
                className="vc-btn"
                aria-label="Previous channel"
                disabled={active === 0}
                onClick={() => goTo(active - 1)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <div className="vc-dots">
                {CHANNELS.map((c, i) => (
                  <button
                    type="button"
                    key={c.name}
                    className={`vc-dot${i === active ? " is-on" : ""}`}
                    aria-label={`Show ${c.name}`}
                    aria-current={i === active}
                    onClick={() => goTo(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="vc-btn"
                aria-label="Next channel"
                disabled={active === N - 1}
                onClick={() => goTo(active + 1)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* right — follows the top card */}
          <div className="vc-info-col">
            <div className="vc-info" ref={infoRef} aria-live="polite">
              <div className="vc-swap" key={active}>
                <p className="vc-count">
                  {pad2(active + 1)} / {pad2(N)}
                </p>
                <h3 className="vc-name">{ch.name}</h3>
                <p className="vc-desc">{ch.desc}</p>
                <dl className="vc-when">
                  <dt>Sent when</dt>
                  <dd>{ch.sentWhen}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const css = `
  .vc-root{
    --vc-accent:var(--accent,#6d4aff);
    --vc-pad:clamp(1.5rem,8vw,8rem);
    --vc-text:#f1efe9;
    --vc-muted:rgba(241,239,233,.62);
    --vc-line:rgba(255,255,255,.1);
    --vc-display:var(--font-display,"Instrument Serif","Newsreader",Georgia,serif);
    --vc-mono:var(--font-mono,ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace);
    position:relative;width:100%;background:#0b0c10;color:var(--vc-text);
    font-family:var(--font-sans,"Inter","DM Sans","Helvetica Neue",Arial,sans-serif);
  }

  /* tall scroll track; the sticky stage stays pinned while you scroll it */
  .vc-track{position:relative;width:100%;height:300svh;}
  .vc-stage{position:sticky;top:0;width:100%;height:100svh;overflow:hidden;
    background:radial-gradient(38% 52% at 52% 52%,rgba(109,74,255,.16),transparent 72%),#0b0c10;}

  /* headline */
  .vc-head{position:absolute;left:var(--vc-pad);top:0;bottom:0;
    width:calc(36% - var(--vc-pad));display:flex;flex-direction:column;
    justify-content:center;gap:1.4rem;}
  .vc-eyebrow{margin:0;font-size:.82rem;font-weight:500;color:var(--vc-text);}
  .vc-title{margin:0;font-family:var(--vc-display);font-weight:400;
    font-size:clamp(2.6rem,5.2vw,6rem);line-height:.95;letter-spacing:-.012em;}

  /* deck column */
  .vc-deck-col{position:absolute;left:36%;width:32%;top:0;bottom:0;}
  .vc-deck{position:absolute;inset:0;perspective:1200px;}

  .vc-card{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    width:clamp(250px,21vw,380px);aspect-ratio:4/5;padding:1.5rem;
    border-radius:1.4rem;display:flex;flex-direction:column;gap:1rem;
    border:1px solid rgba(255,255,255,.09);color:var(--vc-text);
    backface-visibility:hidden;-webkit-backface-visibility:hidden;
    will-change:transform,opacity;pointer-events:none;
    box-shadow:0 30px 60px -26px rgba(0,0,0,.65);}
  .vc-back{transform:translate(-50%,-50%) rotateY(-180deg);}

  .vc-card-top{display:flex;align-items:center;gap:.7rem;}
  .vc-chip{width:2.5rem;height:2.5rem;border-radius:.75rem;display:flex;
    align-items:center;justify-content:center;color:currentColor;
    background:color-mix(in srgb,currentColor 14%,transparent);
    border:1px solid color-mix(in srgb,currentColor 28%,transparent);}
  .vc-chip svg,.vc-btn svg,.vc-ring svg{width:1.2rem;height:1.2rem;fill:none;stroke:currentColor;
    stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  .vc-kicker{font-size:.82rem;font-weight:500;color:currentColor;opacity:.72;}

  .vc-card-title{margin:0;font-family:var(--vc-display);font-weight:400;color:inherit;
    font-size:clamp(1.9rem,2.9vw,3.1rem);line-height:.98;letter-spacing:-.01em;}

  .vc-preview{margin-top:auto;display:flex;flex-direction:column;gap:.2rem;
    padding:.8rem .9rem;border-radius:.85rem;background:color-mix(in srgb,currentColor 12%,transparent);
    border:1px solid color-mix(in srgb,currentColor 20%,transparent);font-family:var(--vc-mono);
    font-size:.72rem;line-height:1.55;color:currentColor;}
  .vc-preview span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.78;}
  .vc-preview span:first-child{opacity:1;}

  /* cover card */
  .vc-front{z-index:5;justify-content:space-between;background:#fbfaf6;border-color:rgba(19,20,27,.08);color:#13141b;
    box-shadow:0 30px 60px -26px rgba(0,0,0,.65);}
  .vc-front .vc-kicker{color:currentColor;opacity:.72;}
  .vc-front-title{margin:0;font-family:var(--vc-display);font-weight:400;color:inherit;
    font-size:clamp(2.1rem,3.3vw,3.6rem);line-height:.96;letter-spacing:-.01em;}
  .vc-front-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;}
  .vc-front-foot p{margin:0;font-size:.95rem;color:currentColor;opacity:.75;}
  .vc-ring{flex:none;width:2.8rem;height:2.8rem;border-radius:50%;display:flex;
    align-items:center;justify-content:center;border:1px solid currentColor;}

  /* arrows + dots */
  .vc-nav{position:absolute;left:50%;bottom:clamp(1.5rem,7svh,3.6rem);
    transform:translateX(-50%);display:flex;align-items:center;gap:.9rem;
    opacity:0;pointer-events:none;z-index:30;}
  .vc-btn{width:2.75rem;height:2.75rem;border-radius:.8rem;display:flex;
    align-items:center;justify-content:center;cursor:pointer;color:var(--vc-text);
    background:transparent;border:1px solid rgba(255,255,255,.14);
    transition:background .2s,opacity .2s;}
  .vc-btn:hover:not(:disabled){background:rgba(255,255,255,.07);}
  .vc-btn:disabled{opacity:.35;cursor:default;}
  .vc-dots{display:flex;align-items:center;gap:.6rem;}
  .vc-dot{width:.4rem;height:.4rem;padding:0;border:0;border-radius:99px;cursor:pointer;
    background:rgba(255,255,255,.22);transition:width .28s,background .28s;}
  .vc-dot.is-on{width:1.2rem;background:var(--vc-accent);}
  .vc-btn:focus-visible,.vc-dot:focus-visible{outline:2px solid var(--vc-accent);outline-offset:3px;}

  /* right info block */
  .vc-info-col{position:absolute;left:70%;right:0;top:0;bottom:0;display:flex;
    align-items:center;padding-right:var(--vc-pad);}
  .vc-info{width:100%;max-width:26rem;opacity:0;will-change:transform,opacity;}
  .vc-swap{animation:vc-swap .32s cubic-bezier(.2,.7,.2,1);}
  @keyframes vc-swap{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .vc-count{margin:0 0 .6rem;font-family:var(--vc-mono);font-size:.8rem;
    letter-spacing:.06em;color:var(--vc-muted);}
  .vc-name{margin:0 0 1.2rem;font-family:var(--vc-display);font-weight:400;
    font-size:clamp(2.3rem,3.8vw,4.2rem);line-height:.98;letter-spacing:-.012em;}
  .vc-desc{margin:0;font-size:1.05rem;line-height:1.55;color:var(--vc-muted);max-width:30ch;}
  .vc-when{margin:1.6rem 0 0;padding-top:1.1rem;border-top:1px solid var(--vc-line);}
  .vc-when dt{font-size:.82rem;color:var(--vc-muted);margin-bottom:.25rem;}
  .vc-when dd{margin:0;font-size:1rem;font-weight:500;}

  /* ── carousel mode: <1000px or reduced motion ── */
  .vc-carousel .vc-track{height:auto;}
  .vc-carousel .vc-stage{position:relative;height:auto;overflow:visible;display:flex;
    flex-direction:column;gap:2rem;padding:4.5rem 0 4rem;}
  .vc-carousel .vc-head,
  .vc-carousel .vc-deck-col,
  .vc-carousel .vc-info-col{position:static;width:auto;padding:0 var(--vc-pad);}
  .vc-carousel .vc-deck-col{padding:0;}
  .vc-carousel .vc-head{gap:1rem;}
  .vc-carousel .vc-title{font-size:clamp(2.6rem,11vw,4.4rem);}
  .vc-carousel .vc-deck{position:relative;inset:auto;perspective:none;display:flex;gap:1rem;
    overflow-x:auto;scroll-snap-type:x mandatory;padding:.6rem var(--vc-pad) 1.2rem;
    scrollbar-width:none;}
  .vc-carousel .vc-deck::-webkit-scrollbar{display:none;}
  .vc-carousel .vc-card{position:relative;top:auto;left:auto;width:auto;flex:0 0 min(76%,320px);
    transform:none !important;opacity:1 !important;scroll-snap-align:center;
    pointer-events:auto;backface-visibility:visible;-webkit-backface-visibility:visible;}
  .vc-carousel .vc-front{display:none;}
  .vc-carousel .vc-nav{position:static;transform:none;justify-content:center;opacity:1 !important;
    pointer-events:auto !important;margin-top:.4rem;}
  .vc-carousel .vc-info{opacity:1 !important;transform:none !important;max-width:none;}

  @media (prefers-reduced-motion: reduce){
    .vc-swap{animation:none;}
    .vc-dot,.vc-btn{transition:none;}
  }
`;
