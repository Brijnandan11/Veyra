# Veyra Design System

<!-- impeccable:design-schema 1 -->

## Direction

Veyra is a monitoring control room: a precise, high-contrast operations surface that makes service health scannable under pressure. The visual language borrows the discipline of a crisis wall without turning operational data into spectacle.

## Palette

- Light canvas: `#f5f1e8` with white panels, deep navy ink, and cobalt action blue.
- Dark canvas remains the original black-green system: `#070908` canvas, `#0c100e` panels, and `#f3f5e8` ink.
- Dark semantic colors remain green `#b9f34b`, red `#ff5f56`, and blue `#88d9e8`.
- The dark-mode action color is the only dark role changed: orange becomes electric violet `#8f82ff`.
- Light mode uses high-contrast cobalt `#1d4ed8`, teal `#087f70`, vermilion `#c12f4b`, and measurement blue `#075985`.

## Typography

- Pairing A (chosen in Phase 1): Instrument Serif (regular + italic, never faux bold) for display headlines, Geist (variable) for interface and body, Geist Mono for data — URLs, status codes, timestamps, latency, code.
- All sizes flow through the fluid token scale in `styles.css` (`--step--1` … `--step-5`, clamp-based, ~1.25 ratio); no stray pixel sizes.
- Headlines are sentence case in the serif with at most one italic accent phrase per section; line-height and tracking come from `--lh-*` / `--track-*` tokens.
- Big stats are serif with tabular figures (`tnum`); units render at ~45% size at 60% opacity.
- Eyebrows are sans 13px/500 with 0.04em tracking (small caps capable); mono is never used for decorative labels.
- Minimum text sizes: 12.5px tags, 13px everything else; light-on-dark body gains +0.01em tracking.

## Composition

- Sidebar plus dense work surface on desktop; the sidebar collapses into a compact top navigation on narrow screens.
- Structural 1px rules organize the page; panels are framed tools, not decorative nested cards.
- The first viewport leads with system status, four operational metrics, and live endpoints.
- Status is always named in text and reinforced with a colored signal.
- Color has explicit roles: action color for interaction, green/teal for healthy state, red/vermilion for incidents, and blue for measurements.

## Interaction

- Primary action is explicit and theme-specific: electric violet in dark mode, cobalt in light mode.
- Monitor rows are direct entry points to detail and check history.
- Enabling/disabling is an immediate compact toggle with a status toast.
- New monitors open in a protected dialog with endpoint, name, and interval fields.
- Public status is a separate, quieter read surface using the same operational vocabulary.

## Responsive Behavior

- Desktop preserves scan columns for status, response, and last check.
- Tablet removes secondary timestamps before collapsing the layout.
- Mobile uses single-column panels, compact metric pairs, and stacked history rows.

## States

The frontend must represent loading, success, error, empty, UP, DOWN, active, inactive, open incident, and resolved incident states. Illustrative data in the current prototype is clearly framed as monitoring output rather than product claims.

## Brand / Logo

The mark is a rounded-square tile (22% corner radius) in brand purple `#5b3df5` containing a "V" whose two strokes meet at a tip that kinks into a pulse/checkmark heartbeat, plus a green status dot `#3ddc97` at the top-right. Two colours plus the dot; crisp at 16px.

- Source: `src/components/ui/veyra-logo.jsx` — `<Logo variant="horizontal|icon|stacked" />`.
- Wordmark: "Veyra" in Geist (500), slightly tight optical spacing (-0.01em).
- Contexts: on purple/red backgrounds the tile inverts via `--veyra-tile`/`--veyra-pulse` (cream-on-purple, ink-on-red) for AA contrast.
- Usage: navbar (28px), dashboard sidebar, public status header, footer (icon), favicon (`public/favicon.svg` + `public/favicon-32.png`), `public/apple-touch-icon.png` (180px), `public/og-image.png` (1200x630, regenerated from `public/brand-master.svg` via `scripts/generate-brand-assets.mjs`).
- Hover: the V pulse tip draws once (stroke-dashoffset) and the dot pulses once. Disabled under reduced motion.
- The mascot has been removed entirely (Phase 2). The logo is the only brand character — no robot, blob or spine rider anywhere.
- Dev-only preview: open `#brand` (in-app route) for the 16/24/32/64px renders on all four backgrounds with a live contrast table, or run `npm run audit:scroll` which saves `audit/logo-*.png` renders.
