import React, { useEffect, useState } from 'react';
/* Pairing B and C fonts — loaded ONLY on the /type specimen route. */
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';

/**
 * Dev-only type specimen (#type route).
 *
 * Renders the same real product content — hero headline, lead, section
 * heading, body, eyebrow, buttons, nav, stat block, table row, code/URL and
 * FAQ question — in three selectable font pairings (A/B/C), switchable with
 * the toggle, and viewable on all four brand backgrounds at any viewport.
 *
 * Pairing state lives on the .theme-root wrapper as data-type="a|b|c" and
 * swaps --font-ui-* variables defined in styles.css. /type loads the extra
 * font CSS via type-pairings.css; no other route pulls those files.
 */

const PAIRINGS = [
  { key: 'a', label: 'A — Instrument Serif + Geist', note: 'default candidate' },
  { key: 'b', label: 'B — Fraunces + Instrument Sans', note: 'opsz 144, SOFT/WONK off' },
  { key: 'c', label: 'C — Newsreader + Hanken Grotesk', note: 'display opsz' },
];

const BACKGROUNDS = [
  { key: 'ink', label: 'Ink', className: 'type-bg-ink' },
  { key: 'blue', label: 'Blue', className: 'type-bg-blue' },
  { key: 'paper', label: 'Paper', className: 'type-bg-paper' },
  { key: 'red', label: 'Red', className: 'type-bg-red' },
];

function SpecimenRow({ label, children }) {
  return (
    <section className="type-spec-row">
      <p className="type-spec-label">{label}</p>
      <div className="type-spec-body">{children}</div>
    </section>
  );
}

function SpecimenContent() {
  return (
    <>
      <SpecimenRow label="Eyebrow">
        <p className="type-eyebrow">Website and API monitoring</p>
      </SpecimenRow>

      <SpecimenRow label="Hero headline (step-5, hero leading)">
        <h1 className="type-display type-hero">
          Know which endpoint broke, and <em>why</em>, before your users{' '}
          <em>tell you</em>
        </h1>
      </SpecimenRow>

      <SpecimenRow label="Lead / subcopy (52–58ch)">
        <p className="type-lead">
          Veyra watches every endpoint, keeps the evidence, and tells your team
          what to do next while the signal is still small.
        </p>
      </SpecimenRow>

      <SpecimenRow label="Section heading (step-3)">
        <h2 className="type-display type-h2">Failures become explainable</h2>
      </SpecimenRow>

      <SpecimenRow label="Sub-heading (step-1)">
        <h3 className="type-display type-h3">Add a monitor in under a minute</h3>
      </SpecimenRow>

      <SpecimenRow label="Body paragraph (step-0, 60–66ch)">
        <p className="type-body">
          When a check drops, the signal carries its timestamp, response time,
          and error through to the incident view. Your team sees what failed,
          since when, and who already knows — so recovery starts from evidence
          instead of guesswork, and the public status page answers customers
          before they have to ask.
        </p>
      </SpecimenRow>

      <SpecimenRow label="Buttons + nav">
        <div className="type-controls-row">
          <span className="type-btn type-btn-primary">Open monitoring console</span>
          <span className="type-btn type-btn-secondary">View public status</span>
          <nav className="type-nav" aria-label="Specimen nav">
            <span>Monitoring</span>
            <span>Public status</span>
            <span>Pricing</span>
          </nav>
        </div>
      </SpecimenRow>

      <SpecimenRow label="Stat block (step-4 serif, tabular figures)">
        <div className="type-stats">
          <div className="type-stat">
            <strong className="type-stat-value" data-number="true">
              99.98<small>%</small>
            </strong>
            <span className="type-stat-label">Uptime, 30 days</span>
          </div>
          <div className="type-stat">
            <strong className="type-stat-value" data-number="true">
              142<small>ms</small>
            </strong>
            <span className="type-stat-label">Avg. response</span>
          </div>
          <div className="type-stat">
            <strong className="type-stat-value" data-number="true">
              12,842
            </strong>
            <span className="type-stat-label">Checks run</span>
          </div>
        </div>
      </SpecimenRow>

      <SpecimenRow label="Table row (mono only where data lives)">
        <div className="type-table">
          <div className="type-table-head">
            <span>Endpoint</span>
            <span>Status</span>
            <span>Response</span>
            <span>Last check</span>
          </div>
          <div className="type-table-row">
            <span className="type-cell-name">
              <i className="type-dot type-dot-down" /> Payments gateway
            </span>
            <span className="type-cell-status is-down">Down</span>
            <span className="type-cell-mono">10.0 s</span>
            <span className="type-cell-mono">10:42:18</span>
          </div>
          <div className="type-table-row">
            <span className="type-cell-name">
              <i className="type-dot type-dot-up" /> Public API
            </span>
            <span className="type-cell-status is-up">Up</span>
            <span className="type-cell-mono">120 ms</span>
            <span className="type-cell-mono">10:42:18</span>
          </div>
        </div>
      </SpecimenRow>

      <SpecimenRow label="Code / URL (mono, slashed zero if present)">
        <p className="type-code">
          GET https://api.veyra.dev/v1/monitors/pay.veyra.dev/ping/checks →{' '}
          <b>503</b> · timeout after 10.0 s
        </p>
      </SpecimenRow>

      <SpecimenRow label="FAQ question">
        <p className="type-faq-q">What happens when a check fails?</p>
      </SpecimenRow>
    </>
  );
}

export function TypeSpecimen({ theme = 'dark', onBack }) {
  const [pairing, setPairing] = useState(() => {
    const hashPair = window.location.hash.match(/#\/type\/([abc])/);
    return hashPair ? hashPair[1] : 'a';
  });
  const [background, setBackground] = useState('ink');

  useEffect(() => {
    document.title = 'Veyra — Type specimen (dev only)';
    return () => { document.title = 'Veyra // Website and API monitoring'; };
  }, []);

  // Keep the pairing in sync when the hash changes (deep links, back/forward,
  // tooling) — the specimen stays mounted across #/type/a -> #/type/b hops.
  useEffect(() => {
    const syncFromHash = () => {
      const match = window.location.hash.match(/#\/type\/([abc])/);
      if (match) setPairing(match[1]);
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  function selectPairing(key) {
    setPairing(key);
    window.history.replaceState({}, '', `#/type/${key}`);
  }

  return (
    <div className={`type-page ${BACKGROUNDS.find((b) => b.key === background)?.className || ''}`} data-type-page={pairing}>
      <header className="type-toolbar">
        <button className="type-back" onClick={onBack}>← Back to site</button>
        <span className="type-toolbar-title">Veyra type specimen — dev only</span>
        <div className="type-toggle" role="radiogroup" aria-label="Font pairing">
          {PAIRINGS.map((p) => (
            <button
              key={p.key}
              role="radio"
              aria-checked={pairing === p.key}
              className={`type-toggle-btn ${pairing === p.key ? 'is-active' : ''}`}
              onClick={() => selectPairing(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="type-toggle type-bg-toggle" role="radiogroup" aria-label="Background">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.key}
              role="radio"
              aria-checked={background === b.key}
              className={`type-toggle-btn ${background === b.key ? 'is-active' : ''}`}
              onClick={() => setBackground(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </header>

      <main className={`theme-root type-canvas`} data-theme={theme} data-type={pairing}>
        <div className="type-canvas-inner">
          <p className="type-canvas-note">
            Pairing {pairing.toUpperCase()} · {PAIRINGS.find((p) => p.key === pairing)?.note} · background: {background} · current viewport {window.innerWidth}×{window.innerHeight}px
          </p>
          <SpecimenContent />
        </div>
      </main>
    </div>
  );
}

export default TypeSpecimen;
