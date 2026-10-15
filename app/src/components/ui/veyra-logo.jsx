import React from 'react';

/**
 * Veyra brand system.
 *
 * LogoMark — the primary and ONLY brand character: a rounded-square tile in
 * brand purple containing a "V" whose second stroke kinks into a pulse tip,
 * plus a green status dot at the top-right. Two colours + the dot; stays
 * crisp at 16px.
 *
 * Logo — horizontal | icon | stacked lockups. Colours flow through CSS
 * variables (--veyra-tile, --veyra-pulse) and currentColor so the same markup
 * stays readable on ink, purple, cream and red backgrounds. Contexts that need
 * an inverted tile (red/purple backgrounds) override the variables in CSS.
 *
 * The mascot was removed in Phase 2 — the logo is the only brand character.
 */

// "V" whose two strokes meet at a tip that kinks into a pulse heartbeat:
// down-up beat, then the V arm ends with a small check-tip return.
export const VEYRA_PULSE_PATH = 'M14 12 v12 l10 12 10 -12 v-12 l-10 17 l-4.5 -6.5';

export function LogoMark({ className = '' }) {
  return (
    <svg className={`veyra-logo-mark ${className}`} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect className="veyra-logo-tile" x="2" y="2" width="44" height="44" rx="9.7" />
      <path
        className="veyra-logo-pulse"
        d={VEYRA_PULSE_PATH}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="veyra-logo-dot" cx="38.5" cy="9.5" r="4.5" />
    </svg>
  );
}

export function Logo({ variant = 'horizontal', className = '', as: Tag = 'span' }) {
  return (
    <Tag className={`veyra-logo veyra-logo-${variant} ${className}`} role="img" aria-label="Veyra">
      <LogoMark />
      {variant !== 'icon' && (
        <span className="veyra-logo-word" aria-hidden="true">
          <b>Veyra</b>
        </span>
      )}
    </Tag>
  );
}

export default Logo;
