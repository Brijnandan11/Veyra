import React, { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PixelBackground from './components/ui/PixelBackground';
import { CreepyButton } from '@/components/ui/creepy-button';
import { TextGlitch } from '@/components/ui/text-glitch-effect';
import { ResizableNavbar } from '@/components/ui/resizable-navbar';
import { Logo, LogoMark } from '@/components/ui/veyra-logo';
import { TypeSpecimen } from '@/components/ui/TypeSpecimen';
import ChannelsStack from '@/components/ChannelsStack';
import { AuthProvider, useAuth } from './lib/auth-context';
import { MonitorsProvider, useMonitors } from './lib/monitors-context';
import AuthModal from './components/AuthModal';
import api from './lib/api';
/* Pairing A fonts (default): display serif + UI sans + data mono, self-hosted. */
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/wght.css';
import './styles.css';

/* Sample data for the marketing landing page previews only. The dashboard is
   fully API-driven; these rows never reach the monitoring console. */
const sampleMonitors = [
  { id: 1, name: 'Public API', url: 'api.veyra.dev/health', status: 'UP', response: '81 ms', code: '200', lastChecked: '10 sec ago', uptime: '99.98%', interval: '60 sec', active: true, checks: '12,842' },
  { id: 2, name: 'Marketing site', url: 'veyra.dev', status: 'UP', response: '149 ms', code: '200', lastChecked: '28 sec ago', uptime: '99.98%', interval: '5 min', active: true, checks: '8,109' },
  { id: 3, name: 'Payments gateway', url: 'pay.veyra.dev/ping', status: 'DOWN', response: '10.0 s', code: '—', lastChecked: '1 min ago', uptime: '97.20%', interval: '60 sec', active: true, checks: '9,004' },
  { id: 4, name: 'Docs', url: 'docs.veyra.dev', status: 'UP', response: '172 ms', code: '200', lastChecked: '2 min ago', uptime: '99.98%', interval: '10 min', active: false, checks: '4,621' },
];

const heroSharedData = {
  badge: 'All systems operational · sample',
  chips: [
    { label: 'HTTP checks', icon: 'pulse' },
    { label: 'Latency trends', icon: 'clock' },
    { label: 'Public status', icon: 'globe' },
  ],
  headline: ['Know what breaks', 'first'],
  summary: 'Veyra watches every endpoint, keeps the evidence, and gives your team a clear next move while the signal is still small.',
  stats: [
    { value: '99.98%', label: '30-day uptime' },
    { value: '184 ms', label: 'avg response' },
    { value: '24/7', label: 'alerting' },
  ],
  dashboard: {
    uptime: '99.98%',
    p95: '184 ms',
    openIncidents: '1',
    rows: [
      { name: 'Public API', status: 'Up', latency: 81 },
      { name: 'Marketing', status: 'Up', latency: 149 },
      { name: 'Payments gateway', status: 'Failing', latency: 10000 },
      { name: 'Docs', status: 'Up', latency: 172 },
    ],
  },
  proofRow: ['99.98% uptime', '24/7 detection', 'Public status', 'Slack + email + webhooks'],
};

function useReveal({ threshold = 0.12 } = {}) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) { setRevealed(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, revealed];
}

function Reveal({ children, variant = 'fade-up', index = 0, className = '' }) {
  const [ref, revealed] = useReveal();
  return <div ref={ref} className={`reveal reveal-${variant} ${revealed ? 'is-revealed' : ''} ${className}`} style={{ '--i': index }}>{children}</div>;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    let frame = 0;
    let max = document.documentElement.scrollHeight - window.innerHeight;
    const onResize = () => { max = document.documentElement.scrollHeight - window.innerHeight; };
    const update = () => {
      frame = 0;
      const next = max > 0 ? window.scrollY / max : 0;
      setProgress(next);
      setShift(Math.min(window.scrollY * -0.035, 0));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return { progress, shift };
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="6" height="6" /><rect x="15" y="3" width="6" height="6" /><rect x="3" y="15" width="6" height="6" /><rect x="15" y="15" width="6" height="6" /></>,
    pulse: <><path d="M3 12h4l2.2-7 5.6 14L17 12h4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H7.7v-2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L9 9l1.4-1.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L20 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    alert: <><path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
    moon: <><path d="M20 15.4A8.5 8.5 0 0 1 8.6 4a8.5 8.5 0 1 0 11.4 11.4Z" /></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{paths[name]}</svg>;
}

function StatusPill({ status }) {
  const value = String(status ?? 'PENDING');
  return <span className={`status status-${value.toLowerCase()}`}><span className="status-dot" />{value}</span>;
}

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { monitors, loading, error, selectedId, selectedMonitor, lastSyncedAt, fetchMonitors, createMonitor, toggleMonitor, selectMonitor, clearError, deleteMonitor } = useMonitors();
  const [screen, setScreen] = useState(() => {
    if (window.location.hash === '#dashboard') return 'dashboard';
    if (window.location.hash === '#brand') return 'brand';
    if (window.location.hash.startsWith('#/type')) return 'type';
    return 'hero';
  });
  const [section, setSection] = useState('overview');
  const [theme, setTheme] = useState(() => localStorage.getItem('veyra-theme') || 'dark');
  const [modal, setModal] = useState(false);
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [pendingRoute, setPendingRoute] = useState(null);
  const [toast, setToast] = useState('');
  const [toastTone, setToastTone] = useState('ok');
  const [apiOnline, setApiOnline] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const online = monitors.filter((monitor) => monitor.status === 'UP').length;
  // Only actual DOWN endpoints degrade the fleet; PENDING monitors are neutral.
  const overall = monitors.some((monitor) => monitor.status === 'DOWN') ? 'DEGRADED' : 'OPERATIONAL';
  const downMonitor = monitors.find((monitor) => monitor.status === 'DOWN');

  function notify(message, tone = 'ok') {
    setToast(message);
    setToastTone(tone);
    window.setTimeout(() => setToast(''), 2600);
  }

  useEffect(() => {
    localStorage.setItem('veyra-theme', theme);
  }, [theme]);

  // Probe the backend health endpoint so the sidebar shows a real connection state.
  useEffect(() => {
    let cancelled = false;
    const probe = () => api.healthCheck().then(() => { if (!cancelled) setApiOnline(true); }).catch(() => { if (!cancelled) setApiOnline(false); });
    probe();
    const id = window.setInterval(probe, 30000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  useEffect(() => {
    const onHistoryChange = () => {
      if (window.location.hash === '#brand') setScreen('brand');
      else if (window.location.hash.startsWith('#/type')) setScreen('type');
      else setScreen(window.location.hash === '#dashboard' ? 'dashboard' : 'hero');
    };
    window.addEventListener('popstate', onHistoryChange);
    window.addEventListener('hashchange', onHistoryChange);
    return () => {
      window.removeEventListener('popstate', onHistoryChange);
      window.removeEventListener('hashchange', onHistoryChange);
    };
  }, []);

  // Surface monitor errors as toasts (network failures, expired sessions…).
  useEffect(() => {
    if (error) {
      notify(error, 'error');
      clearError();
    }
  }, [error, clearError]);

  function openDashboard(targetSection) {
    // Guard against callers like onClick={openDashboard} that pass the DOM
    // event through as the first argument.
    const section = ['overview', 'status'].includes(targetSection) ? targetSection : 'overview';
    if (!isAuthenticated) {
      setPendingRoute(section);
      setAuthMode('login');
      setAuthModal(true);
      return;
    }
    window.history.pushState({}, '', '#dashboard');
    window.scrollTo(0, 0);
    setSection(section);
    setScreen('dashboard');
  }

  /* Continue to the dashboard once a pending sign-in/up completes. Runs as an
     effect so it sees the updated auth state (no stale-closure timing). */
  useEffect(() => {
    if (isAuthenticated && pendingRoute) {
      const target = pendingRoute;
      setPendingRoute(null);
      window.history.pushState({}, '', '#dashboard');
      window.scrollTo(0, 0);
      setSection(target);
      setScreen('dashboard');
    }
  }, [isAuthenticated, pendingRoute]);

  /* If the session ends (sign-out or expiry) while viewing the console,
     return to the public landing instead of an empty workspace. */
  useEffect(() => {
    if (!isAuthenticated && screen === 'dashboard') {
      window.history.replaceState({}, '', '#');
      setSection('overview');
      setScreen('hero');
    }
  }, [isAuthenticated, screen]);

  function openHero() {
    window.history.pushState({}, '', '#');
    window.scrollTo(0, 0);
    setScreen('hero');
  }

  async function handleToggle(id) {
    const result = await toggleMonitor(id);
    if (result.success) {
      notify(result.monitor.active ? 'Monitor enabled' : 'Monitor disabled');
    }
  }

  async function addMonitor(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFormError('');
    setSubmitting(true);
    const result = await createMonitor({
      name: String(form.get('name') || '').trim(),
      url: String(form.get('url') || '').trim(),
      interval: Number(form.get('interval')),
      active: true,
      is_public: form.get('is_public') === 'on',
    });
    setSubmitting(false);
    if (result.success) {
      setModal(false);
      notify('Monitor created. First check pending.');
    } else {
      setFormError(result.error);
    }
  }

  if (screen === 'brand') {
    return <div className="theme-root route-view route-brand" data-theme={theme}><BrandPage onBack={openHero} /></div>;
  }

  if (screen === 'type') {
    return <div className="route-view route-type"><TypeSpecimen theme={theme} onBack={openHero} /></div>;
  }

  if (screen === 'hero') {
    return <div className="theme-root route-view route-hero" data-theme={theme}><FlowArtLanding monitors={sampleMonitors} theme={theme} setTheme={setTheme} onDashboard={openDashboard} onPublicStatus={() => openDashboard('status')} onLogin={() => { setPendingRoute('overview'); setAuthMode('login'); setAuthModal(true); }} onRegister={() => { setPendingRoute('overview'); setAuthMode('register'); setAuthModal(true); }} isAuthenticated={isAuthenticated} onLogout={() => { logout(); notify('Signed out'); }} /><AuthModal isOpen={authModal} onClose={() => setAuthModal(false)} defaultMode={authMode}  /></div>;
  }

  const initials = user?.name ? user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() : (user?.email?.[0] || '?').toUpperCase();

  return (
    <div className="app-shell theme-root route-view route-dashboard" data-theme={theme}>
      <aside className="sidebar">
        <Logo className="brand veyra-brand" variant="horizontal" />
        <div className="workspace"><span className="workspace-kicker">WORKSPACE</span><span className="workspace-name">{user?.email || 'Account'} <span className="chevron">▾</span></span></div>
        <nav className="nav" aria-label="Primary navigation">
          <button className={section === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('overview')}><Icon name="grid" /> Overview <span className="nav-count">{monitors.length}</span></button>
          <button className={section === 'monitors' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('monitors')}><Icon name="pulse" /> Monitors <span className="nav-count">{monitors.length}</span></button>
          <button className={section === 'status' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('status')}><Icon name="globe" /> Public status</button>
        </nav>
        <div className="sidebar-footer">
          <div className={`system-note ${apiOnline === false ? 'system-offline' : ''}`}><span className="live-signal" /> {apiOnline === false ? 'API OFFLINE' : 'API CONNECTED'} <span className="mono">v1</span></div>
          <button className="nav-item muted"><Icon name="settings" /> Settings</button>
          <div className="profile"><div className="avatar">{initials}</div><div><strong>{user?.name || 'Operator'}</strong><span>{user?.email || ''}</span></div><button className="profile-more" onClick={logout} title="Sign out" aria-label="Sign out">Sign out</button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="breadcrumb breadcrumb-button" onClick={openHero}><span>Veyra</span><span className="slash">/</span><strong>{section === 'status' ? 'Public status' : section === 'monitors' ? 'Monitors' : section === 'detail' ? 'Monitor detail' : 'Overview'}</strong></button><div className="topbar-actions"><span className="last-sync"><span className="sync-dot" /> {lastSyncedAt ? `Synced ${relativeFromNow(lastSyncedAt)}` : loading ? 'Syncing…' : 'Not synced'}</span><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /></button><button className="button button-primary" onClick={() => { setFormError(''); setModal(true); }}><Icon name="plus" size={16} /> Add monitor</button></div></header>

        {section === 'status' ? <PublicStatus onBack={() => setSection('overview')} /> : (
          <>
            <section className="page-intro"><div><p className="section-label">Control room</p><h1>Service health at a glance</h1><p className="intro-copy">A live readout of every endpoint in your workspace.</p></div><div className={`overall-status overall-${overall.toLowerCase()}`}><span className="pulse-ring" /><div><span className="overall-label">System status</span><strong>{monitors.length ? overall : 'NO MONITORS'}</strong></div></div></section>
            <section className="metric-grid" aria-label="System metrics"><Metric label="Monitors" value={monitors.length.toString().padStart(2, '0')} suffix="tracked" note={loading ? 'loading…' : `${online} operational`} tone="orange" /><Metric label="Uptime" value={computeFleetUptime(monitors)} suffix="%" note="across all monitors" tone="green" /><Metric label="Avg. response" value={computeFleetAvgResponse(monitors)} suffix="ms" note="latest checks" tone="blue" /><Metric label="Degraded" value={monitors.filter((monitor) => monitor.status === 'DOWN').length.toString().padStart(2, '0')} suffix="down" note={downMonitor ? downMonitor.name : 'none right now'} tone="red" /></section>
            {loading && monitors.length === 0 ? (
              <div className="overview-stack"><section className="panel monitor-panel"><div className="panel-heading"><div><p className="section-label">LIVE MONITORS</p><h2>All endpoints</h2></div></div><div className="skeleton-stack" aria-label="Loading monitors"><i /><i /><i /></div></section></div>
            ) : monitors.length === 0 ? (
              <div className="overview-stack"><section className="panel monitor-panel"><div className="panel-heading"><div><p className="section-label">LIVE MONITORS</p><h2>All endpoints</h2></div></div><div className="empty-state"><p>No monitors yet.</p><button className="button button-primary" onClick={() => { setFormError(''); setModal(true); }}><Icon name="plus" size={16} /> Add your first monitor</button></div></section></div>
            ) : (
              section === 'monitors' ? <MonitorTable monitors={monitors} onSelect={(id) => { selectMonitor(id); setSection('detail'); }} onToggle={handleToggle} onDelete={deleteMonitor} /> : section === 'detail' && selectedMonitor ? <MonitorDetail monitor={selectedMonitor} onBack={() => setSection('monitors')} onToggle={handleToggle} onDelete={deleteMonitor} /> : <Overview monitors={monitors} onSelect={(id) => { selectMonitor(id); setSection('detail'); }} onToggle={handleToggle} onSeeAll={() => setSection('monitors')} />
            )}
          </>
        )}
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setModal(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setModal(false)} aria-label="Close"><span>×</span></button><p className="section-label">New monitor</p><h2 id="modal-title">Add a service to the grid</h2><p className="modal-copy">We'll begin checking this endpoint as soon as it's saved.</p>{formError && <div className="form-error" role="alert"><Icon name="alert" size={14} /> {formError}</div>}<form onSubmit={addMonitor}><label>Monitor name<input name="name" required placeholder="e.g. Checkout API" disabled={submitting} /></label><label>Endpoint URL<input name="url" type="url" required placeholder="https://example.com/health" disabled={submitting} /></label><label>Check interval<select name="interval" defaultValue="60" disabled={submitting}><option value="30">Every 30 seconds</option><option value="60">Every 60 seconds</option><option value="300">Every 5 minutes</option><option value="600">Every 10 minutes</option></select></label><label className="checkbox-label"><input name="is_public" type="checkbox" disabled={submitting} /> Share on public status page</label><div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setModal(false)} disabled={submitting}>Cancel</button><button type="submit" className="button button-primary" disabled={submitting}>{submitting ? <><span className="spinner" aria-hidden="true"></span> Creating…</> : <><Icon name="plus" size={16} /> Create monitor</>}</button></div></form></div></div>}
      <AuthModal isOpen={authModal} onClose={() => setAuthModal(false)} defaultMode={authMode}  />
      {toast && <div className={`toast ${toastTone === 'error' ? 'toast-error' : ''}`} role="status"><span className="toast-mark">{toastTone === 'error' ? '!' : '✓'}</span>{toast}</div>}
    </div>
  );
}

function relativeFromNow(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
}

function computeFleetUptime(monitors) {
  const values = monitors.map((monitor) => parseFloat(monitor.uptime)).filter((value) => Number.isFinite(value));
  if (!values.length) return '—';
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
}

function computeFleetAvgResponse(monitors) {
  const values = monitors.map((monitor) => parseInt(monitor.response, 10)).filter((value) => Number.isFinite(value));
  if (!values.length) return '—';
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length).toString();
}

function HeroScreen({ monitors, theme, setTheme, onDashboard, onPublicStatus }) {
  const lightPixels = '#c8c7c2,#deddd7,#aeb1b4,#d1d6df';
  const darkPixels = '#202331,#343851,#586080,#111522';
  return <main className="pixel-hero"><div className="pixel-hero-field"><div className="pixel-wash"><PixelBackground colors={theme === 'dark' ? darkPixels : lightPixels} gap={6} speed={42} opacity={theme === 'dark' ? .9 : .75} /></div><div className="pixel-hero-content"><ResizableNavbar theme={theme} setTheme={setTheme} onDashboard={onDashboard} onPublicStatus={onPublicStatus} /><section className="pixel-hero-body"><div className="pixel-meta"><span>WEBSITE + API MONITORING</span><span className="pixel-rule" /><span>ACME / LIVE WORKSPACE</span></div><h1><span>Know what is</span><span>about to break</span><span className="pixel-timeline"><span className="timeline-handle" /><span className="timeline-copy timeline-glitch-group"><TextGlitch className="timeline-glitch-lead" text="before it becomes an" hoverText="before it becomes an" delay={.2} /><TextGlitch className="timeline-glitch-outage" text="outage." hoverText="outage." delay={.24} /></span></span></h1><p className="pixel-hero-copy">Veyra watches every endpoint, keeps the evidence, and gives your team a clear next move when the signal changes.</p><div className="pixel-actions"><CreepyButton className="pixel-primary" onClick={onDashboard}>Open monitoring console <Icon name="arrow" size={17} /></CreepyButton><button className="pixel-secondary" onClick={onPublicStatus}>View public status <Icon name="external" size={14} /></button></div><div className="pixel-footer-note"><span>04 ENDPOINTS / 99.94% 30-DAY UPTIME</span><span className="pixel-signal"><i /> MONITORING NOW</span></div></section></div><div className="pixel-bottom-rule"><span>CHECK / DETECT / EXPLAIN / RECOVER</span><span>REST API READY</span><span>PUBLIC STATUS INCLUDED</span></div></div><LandingSections monitors={monitors} onDashboard={onDashboard} onPublicStatus={onPublicStatus} /></main>;
}

function FlowRule() { return <hr className="flow-rule" />; }

function FlowEyebrow({ children }) { return <p className="flow-eyebrow">{children}</p>; }

function FlowHeadline({ lines, as: Tag = 'h2', glitch = false, splitChars = false }) {
  return (
    <Tag className={`flow-headline ${glitch ? 'flow-glitch-headline' : ''}`} data-split-chars={splitChars ? 'true' : undefined}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          <span className="flow-headline-mask"><span className="flow-headline-line" style={{ '--i': index }}>{line}</span></span>
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </Tag>
  );
}

function FlowLead({ children, right = false }) { return <p className={`flow-lead ${right ? 'flow-lead-right' : ''}`}>{children}</p>; }

function FlowColumns({ items }) { return <div className="flow-columns">{items.map((item) => <div key={item.title}><p>{item.title}</p><span>{item.body}</span></div>)}</div>; }

function FlowScrubLine({ children }) {
  const [ref, revealed] = useReveal();
  const words = children.split(' ');
  return <p ref={ref} className={`flow-scrub-line ${revealed ? 'is-revealed' : ''}`} aria-label={children}>{words.map((word, index) => <span className="scrub-word" style={{ '--i': index }} aria-hidden="true" key={`${word}-${index}`}>{word}{index < words.length - 1 ? ' ' : ''}</span>)}</p>;
}

function FlowMarquee() {
  const items = ['Public API / UP', 'Docs / UP', 'Checkout / UP', 'Auth / UP', 'Webhooks / UP'];
  return <div className="flow-marquee" aria-label="Monitored endpoint examples"><div className="flow-marquee-track">{[...items, ...items].map((item, index) => <span key={`${item}-${index}`}><i />{item}</span>)}</div></div>;
}

function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);
  const [ref, visible] = useReveal({ threshold: 0.35 });
  useEffect(() => {
    if (!visible || !Number.isFinite(target)) return undefined;
    const started = performance.now();
    let frame = 0;
    const tick = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((target * eased).toFixed(decimals)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, decimals, visible]);
  return [ref, Number.isFinite(target) ? value.toFixed(decimals) : String(target)];
}

function ProductPreview({ monitors }) {
  const online = monitors.filter((monitor) => monitor.status === 'UP').length;
  return <section className="flow-product-section" aria-labelledby="product-title"><div className="flow-product-copy"><FlowEyebrow>See it in action</FlowEyebrow><h2 id="product-title">A control room that keeps the story intact</h2><p>Sample monitoring output, shown live from the same dashboard your team uses to inspect checks and incidents.</p><span className="flow-sample-note sample-tag">Sample data</span></div><div className="flow-product-stage"><div className="flow-product-frame"><div className="flow-product-bar"><Logo /><span>overview / live</span><i /></div><div className="flow-product-metrics"><div><small>UPTIME</small><strong>99.94%</strong></div><div><small>AVG RESPONSE</small><strong>142<span>ms</span></strong></div><div><small>MONITORS</small><strong>{String(monitors.length).padStart(2, '0')}</strong></div></div><div className="flow-product-list">{monitors.slice(0, 3).map((monitor) => <div key={monitor.id}><span><i className={monitor.status === 'UP' ? 'flow-up' : 'flow-down'} />{monitor.name}</span><b className={monitor.status === 'UP' ? 'flow-copy-up' : 'flow-copy-down'}>{monitor.status}</b><small>{monitor.response}</small></div>)}</div><div className="flow-product-chart">{[28, 38, 34, 48, 42, 56, 52, 65, 58, 72, 66, 76].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div></div><div className="flow-product-stats"><SampleStat label="CHECKS RUN" value={12842} suffix="" /><SampleStat label="AVG RESPONSE" value={142} suffix=" ms" /><SampleStat label="UPTIME" value={99.94} suffix="%" decimals={2} /></div></section>;
}

function SampleStat({ label, value, suffix, decimals = 0 }) {
  const [ref, count] = useCountUp(value, { decimals });
  return <div ref={ref} className="flow-product-stat"><span>{label}</span><strong data-number="true">{Number(count).toLocaleString()}{suffix}</strong><small>Sample data</small></div>;
}

function ResponseBar({ ms, height, index }) {
  const [ref, count] = useCountUp(ms, { duration: 700 });
  return <i ref={ref} style={{ '--h': height, animationDelay: `${index * 90}ms` }}><b>{Math.round(Number(count))} ms</b></i>;
}

function ResponseBars() {
  return <div className="response-bars">{[[120, .24], [138, .46], [164, .68], [192, .85]].map(([ms, height], index) => <ResponseBar key={ms} ms={ms} height={height} index={index} />)}</div>;
}

/* Handcrafted live feed line: status verdict + a latency figure that
   re-enters every few seconds so the page reads as wired to real checks. */
function HeroFeedLine({ badge }) {
  const [avg, setAvg] = useState(142);
  useEffect(() => {
    const id = window.setInterval(() => {
      setAvg(Math.max(121, Math.min(196, 142 + Math.round((Math.random() - 0.5) * 26))));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flow-hero-feed" aria-label="Workspace status, sample data">
      <span className="feed-dot" aria-hidden="true" />
      <span className="feed-copy">{badge}</span>
      <span className="feed-sep" aria-hidden="true" />
      <span className="feed-avg" aria-live="off"><span className="feed-num" key={avg}>{avg} ms avg</span></span>
    </div>
  );
}

/* Bottom-of-hero check stream: a slow marquee of real-style check results. */
const HERO_STREAM = [
  ['up', 'Public API', '84 ms'],
  ['up', 'Marketing site', '149 ms'],
  ['down', 'Payments gateway', 'TIMEOUT 10.0 s'],
  ['up', 'Docs', '172 ms'],
  ['up', 'Checkout API', '96 ms'],
  ['up', 'Webhooks', '118 ms'],
  ['up', 'Auth service', '103 ms'],
];

function FlowLiveStrip() {
  const items = [...HERO_STREAM, ...HERO_STREAM];
  return <div className="flow-check-stream" aria-label="Live check stream, sample data"><div className="flow-check-stream-track">{items.map(([state, name, value], index) => <span key={`${name}-${index}`} className={`stream-item is-${state}`}><i aria-hidden="true" />{name}<b>{value}</b></span>)}</div></div>;
}

/* Hero chart geometry: cubic-smoothed latency line over a fixed 24-sample
   window. Values morph in place, so nothing ever jumps horizontally. */
const CHART_W = 280;
const CHART_H = 88;
function latencyY(value) {
  const t = (Math.min(Math.max(value, 84), 240) - 84) / 156;
  return 74 - t * 58;
}
function smoothChartPath(values) {
  const step = (CHART_W - 4) / (values.length - 1);
  let d = `M 0 ${latencyY(values[0]).toFixed(1)}`;
  for (let i = 1; i < values.length; i++) {
    const mid = (i - 1) * step + step / 2;
    d += ` C ${mid.toFixed(1)} ${latencyY(values[i - 1]).toFixed(1)}, ${mid.toFixed(1)} ${latencyY(values[i]).toFixed(1)}, ${(i * step).toFixed(1)} ${latencyY(values[i]).toFixed(1)}`;
  }
  return d;
}

function HeroMonitorCard() {
  const sharedRows = heroSharedData.dashboard.rows;
  const [rows, setRows] = useState(sharedRows);
  const [toastVisible, setToastVisible] = useState(false);
  const [chartValues, setChartValues] = useState([128, 141, 133, 149, 144, 157, 154, 172, 166, 181, 174, 192, 186, 204, 198, 218, 209, 224, 216, 202, 185, 174, 188, 194]);
  const [clock, setClock] = useState('14:02:00');
  const [p95, setP95] = useState(184);
  const [p95Dir, setP95Dir] = useState(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(window.location.search).get('motion') === 'off';
    if (reducedMotion) {
      setToastVisible(true);
      setClock('14:02:31');
      return undefined;
    }

    const toastTimer = window.setTimeout(() => setToastVisible(true), 2600);
    const interval = window.setInterval(() => {
      setClock((current) => {
        const [h, m, s] = current.split(':').map(Number);
        const next = h * 3600 + m * 60 + s + 1;
        return [Math.floor(next / 3600), Math.floor((next % 3600) / 60), next % 60].map((part) => String(part).padStart(2, '0')).join(':');
      });
      setChartValues((current) => current.map((value, index) => {
        const drift = (Math.random() - 0.5) * 12;
        return index === 0 || index === current.length - 1 ? value : Math.min(240, Math.max(92, value + drift));
      }));
      setRows((current) => current.map((row, index) => ({
        ...row,
        latency: index === 2 ? row.latency : Math.max(80, Math.min(220, row.latency + Math.round((Math.random() - 0.5) * 12))),
      })));
      setP95((previous) => {
        const next = Math.max(148, Math.min(236, previous + Math.round((Math.random() - 0.5) * 22)));
        setP95Dir(next > previous ? 1 : next < previous ? -1 : 0);
        return next;
      });
    }, 1000);

    return () => {
      window.clearTimeout(toastTimer);
      window.clearInterval(interval);
    };
  }, []);

  const chartPath = smoothChartPath(chartValues);
  const areaPath = `${chartPath} L ${CHART_W} ${CHART_H - 2} L 0 ${CHART_H - 2} Z`;
  // Chrome/Edge tween the `d`/`cy` CSS properties between heartbeats; other
  // browsers fall back to the attributes (instant swap, same shape).
  const pathStyle = { d: `path("${chartPath}")`, transition: 'd 1.15s cubic-bezier(.4, 0, .2, 1)' };
  const dotStyle = { transition: 'cy 1.15s cubic-bezier(.4, 0, .2, 1)' };
  const tipY = latencyY(chartValues[chartValues.length - 1]).toFixed(1);
  const incidentY = latencyY(chartValues[15]).toFixed(1);

  const onPointerMove = (event) => {
    if (!pointerRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 12;
    const y = ((event.clientY - rect.top) / rect.height) * 12;
    pointerRef.current = { x: Math.max(-6, Math.min(6, x - 6)), y: Math.max(-6, Math.min(6, y - 6)) };
    event.currentTarget.style.setProperty('--tilt-x', `${pointerRef.current.y}px`);
    event.currentTarget.style.setProperty('--tilt-y', `${pointerRef.current.x}px`);
  };

  const onPointerLeave = (event) => {
    pointerRef.current = { x: 0, y: 0 };
    event.currentTarget.style.setProperty('--tilt-x', '0px');
    event.currentTarget.style.setProperty('--tilt-y', '0px');
  };

  return (
    <div className="flow-hero-monitor" onPointerLeave={onPointerLeave} onPointerMove={onPointerMove}>
      <div className="flow-hero-monitor-head">
        <div className="flow-hero-monitor-brand">
          <span className="flow-hero-monitor-dot" />
          <span>Acme production</span>
          <span className="flow-live-chip"><i aria-hidden="true" />LIVE</span>
        </div>
        <div className="flow-hero-monitor-tabs">
          <span className="is-active">Overview</span>
          <span>Monitors</span>
          <span>Incidents</span>
        </div>
      </div>

      <div className="flow-hero-metrics">
        <div className="flow-hero-metric">
          <span>Uptime</span>
          <strong>99.98<small>%</small></strong>
        </div>
        <div className={`flow-hero-metric ${p95Dir ? 'is-moving' : ''}`} key={p95Dir ? p95 : 'p95-static'}>
          <span>P95 <b className={`p95-dir ${p95Dir > 0 ? 'dir-up' : p95Dir < 0 ? 'dir-down' : ''}`} aria-hidden="true">{p95Dir > 0 ? '↑' : p95Dir < 0 ? '↓' : '·'}</b></span>
          <strong>{p95}<small> ms</small></strong>
        </div>
        <div className="flow-hero-metric">
          <span>Open incidents</span>
          <strong>1</strong>
          <em className="metric-alert-chip" aria-label="One open incident, alert already sent">alert sent</em>
        </div>
      </div>

      <div className="flow-hero-chart-wrap" aria-label="24-hour latency chart, streaming sample data">
        <div className="flow-hero-chart-grid" aria-hidden="true" />
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="hero-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(91, 61, 245, 0.24)" />
              <stop offset="100%" stopColor="rgba(91, 61, 245, 0.24)" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#hero-area-fill)" style={pathStyle} />
          <path className="hero-line" d={chartPath} fill="none" stroke="rgba(238, 241, 248, 0.96)" strokeWidth="2" strokeLinecap="round" style={pathStyle} />
          <line x1="180" y1="6" x2="180" y2={CHART_H} stroke="rgba(255, 111, 93, 0.28)" strokeWidth="1" />
          <circle cx="180" cy={incidentY} r="9" fill="rgba(255, 111, 93, 0.16)" style={dotStyle} />
          <circle cx="180" cy={incidentY} r="4.5" fill="#ff6f5d" style={dotStyle} />
          <circle className="hero-tip" cx={CHART_W - 4} cy={tipY} r="3.5" fill="rgba(238, 241, 248, 0.9)" style={dotStyle} />
        </svg>
        <span className="flow-hero-chart-clock" aria-hidden="true">SYNCED {clock} UTC</span>
        <div className="flow-hero-chart-tooltip" style={{ left: '61%', top: '14px' }}>
          <span>14:02 UTC</span>
          <strong>10.0 s</strong>
          <small>Payments gateway failed</small>
        </div>
      </div>

      <div className="flow-hero-endpoints" aria-label="Endpoint status rows">
        {rows.map((row) => (
          <div className={`flow-hero-row ${row.status === 'Failing' ? 'is-failing' : ''}`} key={row.name}>
            <span className={`flow-hero-row-status ${row.status === 'Failing' ? 'status-down' : 'status-up'}`}>
              <i aria-hidden="true" />
            </span>
            <span className="flow-hero-row-name">{row.name}</span>
            <span className="flow-hero-row-latency" key={row.latency}>{row.status === 'Failing' ? 'Failing' : `${row.latency} ms`}</span>
            <span className="flow-hero-row-spark">
              <svg viewBox="0 0 72 18" aria-hidden="true">
                <polyline points={row.status === 'Failing' ? '0,12 16,13 28,10 42,12 54,15 72,8' : '0,12 14,10 28,11 42,7 54,9 72,5'} fill="none" stroke={row.status === 'Failing' ? '#ff6f5d' : 'rgba(235, 239, 246, 0.9)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const demoInitialState = { status: 'idle', message: 'Ready to simulate a failed check.' };
function demoReducer(state, action) {
  if (action.type === 'START') return { status: 'failing', message: 'Check failed. Opening incident.' };
  if (action.type === 'INCIDENT') return { status: 'incident', message: 'Incident opened. Evidence attached.' };
  if (action.type === 'NOTIFIED') return { status: 'notified', message: 'Alert sent to email, Slack, and webhook.' };
  if (action.type === 'RESOLVE') return { status: 'resolved', message: 'Endpoint restored. Incident resolved.' };
  if (action.type === 'RESET') return demoInitialState;
  return state;
}

function LiveStatusCard({ monitors }) {
  const [live, setLive] = useState(monitors);
  const [cardRef, cardRevealed] = useReveal();
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedMotionRef.current = media.matches; };
    sync();
    media.addEventListener('change', sync);
    const timer = window.setInterval(() => {
      if (document.hidden || reducedMotionRef.current) return;
      setLive((items) => items.map((item) => {
        if (item.status === 'DOWN') return item;
        const value = Number.parseInt(item.response, 10) || 140;
        return { ...item, response: `${Math.max(80, value + Math.round((Math.random() - .5) * 18))} ms` };
      }));
    }, 2600);
    return () => { window.clearInterval(timer); media.removeEventListener('change', sync); };
  }, []);

  return <div ref={cardRef} className={`flow-live-card reveal reveal-scale-in ${cardRevealed ? 'is-revealed' : ''}`}><div className="flow-live-card-head"><span>Check stream</span><b><i /> MONITORING</b></div>{live.map((monitor, index) => <div className="flow-live-row" style={{ '--i': index }} key={monitor.id}><span className="flow-live-name"><i className={monitor.status === 'UP' ? 'flow-up' : 'flow-down'} />{monitor.name}</span><svg viewBox="0 0 80 24" aria-hidden="true"><polyline points={index === 2 ? '0,14 12,13 24,16 36,14 48,18 60,17 80,21' : '0,16 12,13 24,15 36,10 48,12 60,7 80,9'} /></svg><b className={monitor.status === 'UP' ? 'flow-copy-up' : 'flow-copy-down'}>{monitor.response}</b></div>)}</div>;
}

function BreakEndpointDemo({ incident }) {
  const [state, dispatch] = useReducer(demoReducer, demoInitialState);
  const timers = useRef([]);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedMotion.current = media.matches; };
    sync(); media.addEventListener('change', sync);
    return () => { media.removeEventListener('change', sync); timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = []; };
  }, []);
  function runDemo() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    dispatch({ type: 'START' });
    timers.current = [
      window.setTimeout(() => dispatch({ type: 'INCIDENT' }), 850),
      window.setTimeout(() => dispatch({ type: 'NOTIFIED' }), 1700),
    ];
  }
  const active = state.status !== 'idle' && state.status !== 'resolved';
  return <div className={`flow-break-demo ${active && !reducedMotion.current ? 'is-failing' : ''}`}><div className="flow-break-card"><div className="flow-break-top"><span className="sample-tag">Sample incident</span><span className={`flow-demo-state state-${state.status}`}>{state.status === 'failing' ? 'Check failed' : state.status === 'incident' ? 'Incident open' : state.status === 'notified' ? 'Alert sent' : state.status === 'resolved' ? 'Resolved' : 'Ready'}</span></div><h3>{incident?.name || 'Payments gateway'}</h3><p>{incident?.url || 'pay.veyra.dev/ping'}</p><div className="flow-break-status"><i />{state.status === 'idle' || state.status === 'resolved' ? 'Operational' : state.status === 'notified' ? 'Investigating' : 'Down'}</div><div className="flow-break-message" aria-live="polite">{state.message}</div><div className="flow-break-actions">{state.status === 'idle' || state.status === 'resolved' ? <button className="flow-btn flow-btn-dark" onClick={runDemo}>Break my endpoint</button> : state.status === 'notified' ? <button className="flow-btn flow-btn-dark" onClick={() => dispatch({ type: 'RESOLVE' })}>Resolve incident</button> : <span className="flow-demo-progress">CHECKING / DETECTING / NOTIFYING</span>}</div></div><div className="flow-public-mini"><span>Public status</span><strong>{state.status === 'notified' ? 'Investigating' : state.status === 'idle' || state.status === 'resolved' ? 'All systems operational' : 'Incident detected'}</strong><small>Payments gateway · updated now</small></div></div>;
}

const HOW_URL = 'https://api.veyra.dev/health';
// [response ms, bar height fraction] — minimum 0.12 so every bar stays visible.
const HOW_BARS = [[92, .14], [104, .2], [112, .24], [99, .17], [121, .3], [109, .22], [132, .38], [116, .26], [124, .3], [138, .42], [127, .33], [143, .46], [131, .36], [149, .5], [136, .4], [154, .55], [141, .44], [158, .58], [147, .48], [163, .62], [152, .52], [157, .55], [146, .48], [142, .46]];
const HOW_TIMELINE = [
  ['10:41:58', 'First failed check · timeout at 10.0 s', 'down'],
  ['10:42:10', 'Incident opened automatically', 'open'],
  ['10:42:11', 'Alert sent · Email, Slack, Webhook', 'sent'],
  ['10:46:10', 'Recovered · HTTP 200', 'ok'],
];

function HowAddScene() {
  const [typed, setTyped] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [created, setCreated] = useState(false);
  useEffect(() => {
    const timers = [];
    for (let i = 1; i <= HOW_URL.length; i++) timers.push(window.setTimeout(() => setTyped(i), 260 + i * 55));
    timers.push(window.setTimeout(() => setPressed(true), 2500));
    timers.push(window.setTimeout(() => setPressed(false), 2700));
    timers.push(window.setTimeout(() => setCreated(true), 3150));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);
  return (
    <div className="scene scene-add">
      <span className="scene-label">Endpoint URL</span>
      <div className="scene-input"><span className="scene-url">{HOW_URL.slice(0, typed)}</span><span className="scene-caret" aria-hidden="true" /></div>
      <span className="scene-label">Check interval</span>
      <div className="scene-chips" role="radiogroup" aria-label="Check interval">
        {['30s', '1m', '5m'].map((chip) => <span key={chip} className={`scene-chip ${chip === '1m' ? 'is-selected' : ''}`} role="radio" aria-checked={chip === '1m'}>{chip}</span>)}
      </div>
      <span className={`scene-button ${pressed ? 'is-pressed' : ''}`}>Add monitor</span>
      <span className={`scene-chip-ok ${created ? 'is-on' : ''}`}>✓ Monitor created</span>
    </div>
  );
}

function HowWatchScene() {
  return (
    <div className="scene scene-watch">
      <div className="scene-bars" role="img" aria-label="Sample response times for 24 checks, latest 142 milliseconds">
        {HOW_BARS.map(([ms, h], i) => <i key={i} className={i === HOW_BARS.length - 1 ? 'is-last' : ''} style={{ '--h': h, '--bar-i': i }} />)}
        <span className="scene-tip">142 ms</span>
      </div>
      <div className="scene-row"><span className="scene-status is-up">200</span><span className="scene-kv">142 ms</span><span className="scene-kv scene-time">10:42:18</span></div>
    </div>
  );
}

function HowAlertScene() {
  return (
    <div className="scene scene-alert">
      <div className="scene-row"><span className="scene-status is-down">TIMEOUT</span><span className="scene-kv">10.0 s</span><span className="scene-kv scene-time">10:41:58</span></div>
      <div className="scene-toast">
        <b>INCIDENT OPEN</b>
        <span>Payments gateway is not responding.</span>
        <div className="scene-channels"><span>Email</span><span>Slack</span><span>Webhook</span></div>
        <small>3 consecutive failures</small>
      </div>
    </div>
  );
}

function HowFixScene() {
  return (
    <div className="scene scene-fix">
      <ol className="scene-timeline">
        {HOW_TIMELINE.map(([time, label, tone], i) => <li key={time} className={`scene-event tone-${tone}`} style={{ '--ev-i': i }}><span className="scene-event-dot" aria-hidden="true" /><span className="scene-event-time">{time}</span><span className="scene-event-label">{label}</span></li>)}
      </ol>
      <span className="scene-chip-ok is-on">✓ Resolved in 4m 12s</span>
    </div>
  );
}

function FlowHowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const steps = [
    ['01', 'Add URL', 'Paste an endpoint and choose the check interval.'],
    ['02', 'Watch checks', 'Every result stays available with timing and status code.'],
    ['03', 'Get alerted', 'A failed check becomes an incident with context.'],
    ['04', 'Fix with evidence', 'Use the history to move from signal to resolution.'],
  ];
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    let stepped = false;
    let observer = null;
    const onFlowStep = (event) => { stepped = true; setActive(Number(event.detail) || 0); };
    section.addEventListener('flowstep', onFlowStep);
    // When motion is off (mobile, reduced motion, ?motion=off) no master timeline
    // exists, so fall back to plain scroll-position step switching.
    const fallbackTimer = window.setTimeout(() => {
      if (stepped || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActive(Number(entry.target.dataset.step)); }), { rootMargin: '-35% 0px -45% 0px' });
      section.querySelectorAll('[data-step]').forEach((node) => observer.observe(node));
    }, 800);
    return () => { section.removeEventListener('flowstep', onFlowStep); window.clearTimeout(fallbackTimer); if (observer) observer.disconnect(); };
  }, []);
  return <section ref={sectionRef} className="flow-section flow-how-section" data-stack-section aria-labelledby="how-title"><div className="flow-how-copy"><FlowEyebrow>How it works</FlowEyebrow><h2 id="how-title">Add, watch, <em>fix</em></h2><div className="flow-step-list">{steps.map(([number, title, body], index) => <div className={`flow-step ${active === index ? 'is-active' : ''}`} data-step={index} key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></div><div className="flow-how-panel"><span className="sample-tag">Sample data</span><strong>{steps[active][1]}</strong><p>{steps[active][2]}</p><div className="flow-how-card">{active === 0 && <HowAddScene />}{active === 1 && <HowWatchScene />}{active === 2 && <HowAlertScene />}{active === 3 && <HowFixScene />}</div></div></section>;
}

function FlowTrustLayer({ onDashboard }) {
  return (
    <section className="flow-trust-section" aria-label="Trust and FAQ">
      <ChannelsStack />
      <div className="flow-trust-lower">
        <div className="flow-free-block">
          <FlowEyebrow>Start simply</FlowEyebrow>
          <h3>Free to start</h3>
          <p>Bring your first endpoint into the workspace without adding a billing workflow to the problem.</p>
          <button className="flow-btn flow-btn-primary" onClick={onDashboard}>
            Create your first monitor <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="flow-faq">
          <FlowEyebrow>FAQ</FlowEyebrow>
          {[
            ['What does Veyra monitor?', 'Websites and HTTP APIs that can respond to a health check.'],
            ['What happens when a check fails?', 'The result keeps its response time, status code, and timestamp for inspection.'],
            ['Can I share service health?', 'Yes. The public status page presents current health without the private workspace.'],
            ['Is the REST API ready?', 'Yes. The frontend is structured around the monitoring REST contract.'],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>
                <span>{question}</span>
                <i aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlowArtLanding({ monitors, theme, setTheme, onDashboard, onPublicStatus, onLogin, onRegister, isAuthenticated, onLogout }) {
  const incident = monitors.find((monitor) => monitor.status === 'DOWN') || monitors[0];
  const { progress, shift } = useScrollProgress();
  const rootRef = useRef(null);
  useEffect(() => { let cancelled = false; let cleanup = () => {}; import('./lib/scroll-experience').then(({ initScrollExperience }) => { if (!cancelled) cleanup = initScrollExperience(rootRef.current); }).catch(() => {}); return () => { cancelled = true; cleanup(); }; }, []);
  return <main ref={rootRef} id="flow-main" className="flow-art-landing" style={{ '--scroll-progress': progress, '--grid-shift': `${shift}px` }}><span className="flow-scroll-progress" aria-hidden="true" /><a className="skip-link" href="#hero-content">Skip to content</a>
    <section className="flow-section flow-ink-section" aria-label="Hero"><div className="flow-container"><ResizableNavbar theme={theme} setTheme={setTheme} onDashboard={onDashboard} onPublicStatus={onPublicStatus} onLogin={onLogin} onRegister={onRegister} isAuthenticated={isAuthenticated} onLogout={onLogout} /><div id="hero-content" className="flow-hero-grid" tabIndex="-1"><div className="flow-hero-copy"><HeroFeedLine badge={heroSharedData.badge} /><FlowHeadline as="h1" lines={['Know what breaks', <em>first</em>]} /><p className="flow-hero-summary">Veyra watches every endpoint, keeps the evidence, and puts your team on the fix while the signal is still small.</p><div className="flow-hero-actions"><CreepyButton className="flow-creepy-cta" data-magnetic onClick={onDashboard}>Open monitoring console <Icon name="arrow" size={16} /></CreepyButton><button className="flow-btn flow-btn-outline flow-btn-hero" data-magnetic onClick={onPublicStatus}>View public status <Icon name="external" size={14} /></button></div><div className="flow-hero-foot" aria-label="Key product stats">{heroSharedData.stats.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div></div><HeroMonitorCard /></div><div className="flow-live-wrap"><FlowLiveStrip /></div></div></section>
    <ProductPreview monitors={monitors} />
    <section className="flow-section flow-violet-section" data-stack-section aria-label="What it does"><div className="flow-container"><FlowEyebrow>What it does</FlowEyebrow><FlowRule /><FlowHeadline splitChars lines={['Every endpoint,', <em>always</em>]} /><FlowRule /><FlowLead>One place to see whether your product is healthy, and why when it is not.</FlowLead><FlowRule /><FlowColumns items={[{ title: 'Checks', body: 'HTTP checks on any URL or API route, on the interval you choose.' }, { title: 'Evidence', body: 'Every failure keeps its response time, status code and timestamp.' }, { title: 'Incidents', body: 'Failed checks open an incident and close it when the service recovers.' }]} /><FlowRule /><FlowColumns items={[{ title: 'Public status page', body: 'Share live health with customers on a page you do not have to maintain.' }, { title: 'Response trends', body: 'Spot a slow endpoint before it turns into a failed one.' }, { title: 'REST API', body: 'Create monitors and read results from your own code or CI.' }]} /><FlowScrubLine>Fewer 3am surprises. More context when they do happen.</FlowScrubLine><FlowMarquee /></div></section>
    <FlowHowItWorks />
    <section className="flow-section flow-alert-section" data-stack-section aria-label="During an incident"><div className="flow-container"><FlowEyebrow>When something breaks</FlowEyebrow><FlowRule /><div className="flow-alert-grid"><div className="flow-alert-copy"><FlowHeadline glitch lines={[`${incident?.name || 'Payments gateway'}:`, <em>down</em>]} /><FlowRule /><FlowLead>This is the moment Veyra is built for. The check fails, the incident opens, and your status page tells customers before they have to ask.</FlowLead><FlowRule /><FlowColumns items={[{ title: 'What failed', body: 'The endpoint, response time, and exact check that tripped.' }, { title: 'Since when', body: 'A timeline of the first failed check through recovery.' }, { title: 'Who knows', body: 'Your team is alerted and your public page updates on its own.' }]} /></div><div className="flow-alert-demo"><BreakEndpointDemo incident={incident} /></div></div></div></section>
    <section className="flow-section flow-ink-section flow-final-section" data-stack-section aria-label="Get started"><div className="flow-container"><FlowEyebrow>Get started</FlowEyebrow><FlowRule /><FlowHeadline lines={['Watch', 'your first', <em>endpoint</em>]} /><FlowRule /><FlowLead>Add a monitor in under a minute and see your first check result right away.</FlowLead><div className="flow-actions flow-actions-bottom"><span className="flow-cta-wrap"><CreepyButton className="flow-creepy-cta" data-magnetic onClick={onDashboard}>Open monitoring console <Icon name="arrow" size={16} /></CreepyButton></span><button className="flow-btn flow-btn-outline" data-magnetic onClick={onPublicStatus}>View public status <Icon name="external" size={14} /></button></div></div></section>
    <FlowTrustLayer onDashboard={onDashboard} /><footer className="flow-footer"><Logo variant="icon" /><span>Website and API monitoring</span><span className="flow-footer-status"><i /> Status operational</span></footer>
  </main>;
}

/* Dev-only brand spec sheet: the logo at every required size on all four brand
   backgrounds, plus a live WCAG contrast check of mark parts against the
   effective background behind each element. */
const BRAND_TILES = [
  ['ink', 'Ink #0b0d12'],
  ['cream', 'Cream #f4f1ea'],
  ['purple', 'Purple #5b3df5'],
  ['red', 'Red #ff4b2b'],
];

function parseColor(raw) { const m = (raw || '').match(/-?\d+(\.\d+)?/g) || []; return m.slice(0, 3).map(Number); }
function relativeLuminance([r, g, b]) { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contrastRatio(a, b) { const l1 = relativeLuminance(a); const l2 = relativeLuminance(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
const rgbStr = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

function BrandPage({ onBack }) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    const rows = [];
    document.querySelectorAll('[data-brand-tile]').forEach((tile) => {
      const specs = [['Pulse V', '.veyra-logo-pulse', 'stroke'], ['Status dot', '.veyra-logo-dot', 'fill'], ['Wordmark', '.veyra-logo-word b', 'color']];
      for (const [label, selector, prop] of specs) {
        const el = tile.querySelector(selector);
        if (!el) continue;
        const fg = parseColor(getComputedStyle(el)[prop]);
        // SVG mark parts sit on the tile fill, not the section background.
        const tileEl = tile.querySelector('.veyra-logo-tile');
        let bg = parseColor(getComputedStyle(tileEl).fill);
        if (label === 'Wordmark') {
          bg = [0, 0, 0];
          for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
            const raw = getComputedStyle(node).backgroundColor;
            if (raw && raw !== 'rgba(0, 0, 0, 0)' && raw !== 'transparent') { bg = parseColor(raw); break; }
          }
        }
        const ratio = contrastRatio(fg, bg);
        rows.push({ tile: tile.dataset.brandTile, label, fg: rgbStr(fg), bg: rgbStr(bg), ratio, pass: ratio >= 3 });
      }
    });
    setResults(rows);
  }, []);
  return <main className="brand-page">
    <header className="brand-page-head">
      <button className="brand-back" onClick={onBack}>← Back to site</button>
      <h1>Veyra brand</h1>
      <p>Dev-only spec sheet. The mark at 16 / 24 / 32 / 64px on the four brand backgrounds, with a live contrast check (minimum 3:1).</p>
    </header>
    <div className="brand-tile-grid">
      {BRAND_TILES.map(([key, label]) => <section key={key} className={`brand-tile brand-tile-${key}`} data-brand-tile={key}>
        <h2>{label}</h2>
        {[16, 24, 32, 64].map((size) => <div key={size} className="brand-size-row"><LogoMark className={`brand-size-${size}`} /><span>{size}px</span></div>)}
        <div className="brand-lockups"><Logo /><Logo variant="stacked" /><Logo variant="icon" /></div>
      </section>)}
    </div>
    <section className="brand-contrast">
      <h2>Contrast check (WCAG, ≥ 3:1)</h2>
      <table>
        <thead><tr><th>Background</th><th>Element</th><th>Foreground</th><th>Background</th><th>Ratio</th><th>Result</th></tr></thead>
        <tbody>
          {results.map((row) => <tr key={`${row.tile}-${row.label}`} className={row.pass ? 'is-pass' : 'is-fail'}>
            <td>{row.tile}</td><td>{row.label}</td><td>{row.fg}</td><td>{row.bg}</td><td>{row.ratio.toFixed(2)}:1</td><td>{row.pass ? 'PASS' : 'FAIL'}</td></tr>)}
        </tbody>
      </table>
    </section>
  </main>;
}

function MiniSparkline({ alert = false }) {
  const points = alert ? '0,29 12,27 24,28 36,24 48,26 60,22 72,25 84,43 96,42 108,47 120,45' : '0,33 12,29 24,31 36,23 48,26 60,18 72,22 84,17 96,20 108,13 120,16';
  return <svg className={`landing-sparkline ${alert ? 'landing-sparkline-alert' : ''}`} viewBox="0 0 120 52" preserveAspectRatio="none" aria-hidden="true"><path d="M0 45H120" /><polyline points={points} /></svg>;
}

function LandingSections({ monitors, onDashboard, onPublicStatus }) {
  const incident = monitors.find((monitor) => monitor.status === 'DOWN') || monitors[0];
  const online = monitors.filter((monitor) => monitor.status === 'UP').length;
  return <div className="landing-sections">
    <section className="landing-preview-section section-shell"><div className="section-intro"><p className="section-eyebrow">The control room</p><h2>One clear view of service health</h2><p>See every endpoint, its latest response, and the evidence behind each status before your team has to chase it down.</p></div><div className="product-window"><div className="product-window-bar"><span className="window-dots"><i /><i /><i /></span><span>veyra / overview</span><span className="window-live"><i /> LIVE</span></div><div className="preview-toolbar"><strong>System overview</strong><span>Last sync 10 sec ago</span></div><div className="preview-metrics"><div><span>UPTIME</span><strong>99.94%</strong><small>30 days</small></div><div><span>AVG RESPONSE</span><strong>142<span>ms</span></strong><small>last 24 hours</small></div><div><span>MONITORS</span><strong>{String(monitors.length).padStart(2, '0')}</strong><small>{online} operational</small></div><div className="preview-metric-alert"><span>INCIDENTS</span><strong>01</strong><small>payments gateway</small></div></div><div className="preview-list"><div className="preview-list-head"><span>MONITOR</span><span>STATUS</span><span>RESPONSE</span></div>{monitors.slice(0, 3).map((monitor) => <div className="preview-list-row" key={monitor.id}><span><i className={monitor.status === 'UP' ? 'is-up' : 'is-down'} />{monitor.name}</span><b className={monitor.status === 'UP' ? 'copy-up' : 'copy-down'}>{monitor.status}</b><em>{monitor.response}</em></div>)}</div></div></section>
    <section className="landing-feature-section section-shell"><div className="feature-copy"><p className="section-eyebrow">Monitoring</p><h2>Monitor everything that matters</h2><p>Health checks stay simple to scan: a named endpoint, its current state, and a response trend that gives the number some context.</p><button className="landing-link" onClick={onDashboard}>Open the monitoring console <Icon name="arrow" size={15} /></button></div><div className="monitor-proof"><div className="monitor-proof-top"><div><span className="sample-tag">Sample data</span><h3>{monitors[0]?.name || 'Public API'}</h3><p>{monitors[0]?.url || 'api.veyra.dev/health'}</p></div><span className="proof-status proof-status-up"><i /> UP</span></div><div className="monitor-proof-value"><strong>{monitors[0]?.response || '120 ms'}</strong><span>latest response</span></div><MiniSparkline /><div className="monitor-proof-foot"><span>24 HOUR RESPONSE TIME</span><span>HTTP 200</span></div></div></section>
    <section className="landing-feature-section landing-incident-section section-shell"><div className="incident-proof"><div className="incident-proof-head"><span className="sample-tag">Sample data</span><span className="proof-status proof-status-down"><i /> DOWN</span></div><h3>{incident?.name || 'Payments gateway'}</h3><p>{incident?.url || 'pay.veyra.dev/ping'}</p><div className="incident-timeline"><div><span>DETECTED</span><strong>10:40:00</strong></div><div className="timeline-line" /><div><span>RECOVERED</span><strong>Pending</strong></div></div><div className="incident-duration"><span>DURATION</span><strong>{incident?.response || '10.0 s timeout'}</strong></div></div><div className="feature-copy"><p className="section-eyebrow">Incident detection</p><h2>Failures become explainable</h2><p>When a check drops, the signal carries its timestamp, response, and error through to the incident view. Less guessing, faster recovery.</p><button className="landing-link" onClick={onDashboard}>Inspect live incidents <Icon name="arrow" size={15} /></button></div></section>
    <section className="landing-analytics-section section-shell"><div className="section-intro"><p className="section-eyebrow">Uptime analytics</p><h2>Numbers your team can act on</h2><p>Keep the long view close: uptime, average response, and active incidents in the same operational language as your checks.</p></div><div className="analytics-proof"><div className="analytics-head"><div><span>RESPONSE TIME / 24H</span><strong>142 <small>ms avg</small></strong></div><span className="analytics-up"><i /> STABLE</span></div><div className="analytics-chart"><div className="analytics-grid" />{[48, 56, 52, 63, 44, 51, 66, 61, 72, 56, 68, 76, 62, 71, 79, 68, 84, 74, 88, 81, 92, 77, 86, 94].map((height, index) => <i key={index} className={index === 9 ? 'is-alert' : ''} style={{ height: `${height}%` }} />)}</div><div className="analytics-footer"><span>00:00</span><span>12:00</span><span>NOW</span></div></div></section>
    <section className="landing-status-section section-shell"><div className="feature-copy"><p className="section-eyebrow">Public status</p><h2>A calm answer for everyone else</h2><p>Give customers and teammates a clear view of service health without exposing the operator workspace.</p><button className="landing-link" onClick={onPublicStatus}>View public status <Icon name="external" size={14} /></button></div><div className="status-proof"><div className="status-proof-brand"><span className="brand-mark">V</span><span>VEYRA</span></div><div className="status-proof-title"><div><span className="sample-tag">Sample data</span><h3>All systems, clearly</h3></div><span className="proof-status proof-status-up"><i /> OPERATIONAL</span></div><div className="status-proof-lines">{monitors.slice(0, 3).map((monitor) => <div key={monitor.id}><span>{monitor.name}</span><small>{monitor.uptime}</small><b className={monitor.status === 'UP' ? 'copy-up' : 'copy-down'}><i /> {monitor.status}</b></div>)}</div></div></section>
    <section className="landing-final-cta section-shell"><p className="section-eyebrow">Ready when you are</p><h2>Know sooner. Recover faster.</h2><p>Bring your endpoints into one clear monitoring workspace.</p><CreepyButton className="landing-cta-button" onClick={onDashboard}>Open monitoring console <Icon name="arrow" size={17} /></CreepyButton></section>
    <footer className="landing-footer"><span>Veyra</span><span>Website and API monitoring</span><span>Public status included</span></footer>
  </div>;
}

function Metric({ label, value, suffix, note, tone }) { const numeric = Number(String(value).replace(/,/g, '')); const decimals = String(value).includes('.') ? String(value).split('.')[1].length : 0; const [ref, count] = useCountUp(numeric, { decimals }); return <article ref={ref} className={`metric metric-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-index">0{tone === 'orange' ? 1 : tone === 'green' ? 2 : tone === 'blue' ? 3 : 4}</span></div><div className="metric-value" data-number="true">{Number.isFinite(numeric) ? Number(count).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value}<small>{suffix}</small></div><div className="metric-note"><span className="mini-bar" />{note}</div></article>; }

function Overview({ monitors, onSelect, onToggle, onSeeAll }) {
  const downMonitor = monitors.find((monitor) => monitor.status === 'DOWN');
  const avgResponse = computeFleetAvgResponse(monitors);
  return <div className="overview-stack"><section className="panel monitor-panel"><div className="panel-heading"><div><p className="section-label">LIVE MONITORS</p><h2>All endpoints</h2></div><button className="text-button" onClick={onSeeAll}>View full list <Icon name="arrow" size={15} /></button></div><div className="monitor-list">{monitors.length ? monitors.slice(0, 4).map((monitor) => <MonitorRow key={monitor.id} monitor={monitor} onSelect={onSelect} onToggle={onToggle} />) : <div className="skeleton-stack" aria-label="Loading monitors"><i /><i /><i /></div>}</div></section><div className="lower-grid"><section className="panel incident-panel"><div className="panel-heading"><div><p className="section-label">INCIDENT ENGINE</p><h2>Active incident</h2></div>{downMonitor ? <span className="incident-open">OPEN</span> : <span className="incident-open incident-clear">CLEAR</span>}</div>{downMonitor ? <><div className="incident-body"><div className="incident-severity"><Icon name="alert" size={22} /></div><div><strong>{downMonitor.name}</strong><p>{downMonitor.url}</p><span className="incident-meta">Latest check {downMonitor.lastChecked} · <b>{downMonitor.response}</b> response</span></div></div><button className="incident-link" onClick={() => onSelect(downMonitor.id)}>Inspect incident <Icon name="arrow" size={15} /></button></> : <div className="incident-body incident-body-clear"><div className="incident-severity incident-severity-ok"><Icon name="pulse" size={22} /></div><div><strong>No open incidents</strong><p>All endpoints are reporting healthy checks.</p></div></div>}</section><section className="panel activity-panel"><div className="panel-heading"><div><p className="section-label">RECENT ACTIVITY</p><h2>Check stream</h2></div><span className="live-tag"><span /> LIVE</span></div><div className="activity-chart"><div className="chart-grid" />{[48, 56, 52, 63, 44, 51, 66, 61, 72, 56, 68, 76, 62, 71, 79, 68, 84, 74, 88, 81, 92, 77, 86, 94].map((height, index) => <span key={index} className={index === 9 ? 'chart-bar chart-bar-alert' : 'chart-bar'} style={{ height: `${height}%` }} />)}</div><div className="chart-legend"><span>RESPONSE TIME / LATEST CHECKS</span><strong>{avgResponse !== '—' ? `${avgResponse} ms avg` : 'awaiting checks'}</strong></div></section></div></div>;
}

function MonitorRow({ monitor, onSelect, onToggle, onDelete }) { return <div className="monitor-row"><button className="monitor-main" onClick={() => onSelect(monitor.id)}><span className={`row-signal ${monitor.status === 'UP' ? 'row-signal-up' : 'row-signal-down'}`} /><span className="monitor-name"><strong>{monitor.name}</strong><small>{monitor.url}</small></span></button><StatusPill status={monitor.status} /><span className="row-data"><b>{monitor.response}</b><small>response</small></span><span className="row-data row-last"><b>{monitor.lastChecked}</b><small>last checked</small></span><button className={`toggle ${monitor.active ? 'toggle-on' : ''}`} aria-label={`${monitor.active ? 'Disable' : 'Enable'} ${monitor.name}`} onClick={() => onToggle(monitor.id)}><span /></button><button className="row-arrow" onClick={() => onSelect(monitor.id)} aria-label={`Open ${monitor.name}`}><Icon name="arrow" size={16} /></button><button className="icon-button danger" onClick={() => onDelete(monitor.id)} aria-label={`Delete ${monitor.name}`}><Icon name="alert" size={14} /></button></div>; }

function MonitorTable({ monitors, onSelect, onToggle, onDelete }) { return <section className="panel full-panel"><div className="panel-heading"><div><p className="section-label">MONITOR REGISTRY</p><h2>Every endpoint</h2></div><span className="table-count">{monitors.length} monitors</span></div><div className="monitor-table-head"><span>MONITOR</span><span>STATUS</span><span>RESPONSE</span><span>LAST CHECKED</span><span>ACTIVE</span><span /></div><div className="monitor-list">{monitors.map((monitor) => <MonitorRow key={monitor.id} monitor={monitor} onSelect={onSelect} onToggle={onToggle} onDelete={onDelete} />)}</div></section>; }

function MonitorDetail({ monitor, onBack, onToggle, onDelete }) {
  const { updateMonitor, deleteMonitor } = useMonitors();
  const [stats, setStats] = useState(null);
  const [checks, setChecks] = useState([]);
  const [incidentCount, setIncidentCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: monitor.name, url: monitor.url, interval: monitor.interval, is_public: monitor.is_public });
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    async function loadDetail() {
      try {
        const [statsResult, checksResult, incidentsResult] = await Promise.all([
          api.getMonitorStats(monitor.id).catch(() => ({ data: null })),
          api.getMonitorChecks(monitor.id).catch(() => ({ data: [] })),
          api.getMonitorIncidents(monitor.id).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setStats(statsResult.data);
        setChecks(checksResult.data || []);
        const incidents = incidentsResult.data || [];
        setIncidentCount(incidents.filter((incident) => incident.status === 'open').length);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load monitor details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetail();
    return () => { cancelled = true; };
  }, [monitor.id]);

  async function handleToggle() {
    setToggling(true);
    await onToggle(monitor.id);
    setToggling(false);
  }

  function openEditModal() {
    setEditForm({ name: monitor.name, url: monitor.url, interval: monitor.interval, is_public: monitor.is_public });
    setEditError('');
    setEditModal(true);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setEditError('');
    setEditing(true);
    try {
      const result = await updateMonitor(monitor.id, {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        interval: Number(editForm.interval),
        is_public: editForm.is_public,
      });
      if (result.success) {
        setEditModal(false);
        // The context will update the monitor list automatically
      } else {
        setEditError(result.error);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update monitor');
    } finally {
      setEditing(false);
    }
  }

  function openDeleteModal() {
    setDeleteModal(true);
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      const result = await deleteMonitor(monitor.id);
      if (result.success) {
        setDeleteModal(false);
        onBack(); // Go back to monitors list
        // The context will update the monitor list automatically
      } else {
        setDeleteModal(false);
        // Could show error toast here
      }
    } catch (err) {
      setDeleteModal(false);
      // Could show error toast here
    } finally {
      setDeleting(false);
    }
  }

  const uptime = stats ? stats.uptimePercentage.toFixed(2) : monitor.uptime && monitor.uptime !== '—' ? String(monitor.uptime).replace('%', '') : '0';
  const avgResponse = stats && stats.averageResponseTime ? Math.round(stats.averageResponseTime) : monitor.response && monitor.response !== '—' ? String(monitor.response).replace(' ms', '') : '—';
  const totalChecks = stats ? stats.totalChecks.toLocaleString() : monitor.checks || '0';

  const intervalOptions = [
    { value: 30, label: 'Every 30 seconds' },
    { value: 60, label: 'Every 60 seconds' },
    { value: 300, label: 'Every 5 minutes' },
    { value: 600, label: 'Every 10 minutes' },
  ];

  return <> <div className="detail-stack"><button className="back-button" onClick={onBack}>← Back to monitors</button><section className="detail-hero"><div><p className="section-label">MONITOR / {String(monitor.id).length > 8 ? `${String(monitor.id).slice(0, 8).toUpperCase()}` : String(monitor.id).padStart(2, '0')}</p><h2>{monitor.name}</h2><p className="detail-url">{monitor.url} <Icon name="external" size={14} /></p></div><div className="detail-actions"><button className="button button-quiet" onClick={openEditModal} disabled={toggling || editing || deleting}><Icon name="settings" size={14} /> Edit</button><button className="button button-quiet" onClick={handleToggle} disabled={toggling || editing || deleting}>{toggling ? 'Updating…' : monitor.active ? 'Disable monitor' : 'Enable monitor'}</button><button className="button button-quiet danger" onClick={openDeleteModal} disabled={toggling || editing || deleting}><Icon name="alert" size={14} /> Delete</button><StatusPill status={monitor.status} /></div></section><div className="detail-stats"><Metric label="Current response" value={String(avgResponse).replace(' ms', '')} suffix="ms" note="average of recent checks" tone="orange" /><Metric label="Uptime" value={uptime} suffix="%" note="from recorded checks" tone="green" /><Metric label="Total checks" value={totalChecks} suffix="" note={`every ${monitor.interval}`} tone="blue" /></div><section className="panel history-panel"><div className="panel-heading"><div><p className="section-label">CHECK HISTORY</p><h2>Latest checks</h2></div><span className="table-count">{incidentCount ? `${incidentCount} open incident${incidentCount > 1 ? 's' : ''}` : 'no open incidents'}</span></div><div className="history-head"><span>TIME</span><span>STATUS</span><span>HTTP</span><span>RESPONSE</span><span>ERROR</span></div>{loadError ? <div className="empty-state"><p>{loadError}</p><button className="text-button" onClick={onBack}>Back to monitors</button></div> : loading ? <div className="skeleton-stack" aria-label="Loading check history"><i /><i /><i /></div> : checks.length === 0 ? <div className="empty-state"><p>No checks recorded yet. The scheduler runs every minute — the first results will appear here shortly.</p></div> : checks.slice(0, 25).map((check) => <div className="history-row" key={check.id}><span className="mono">{formatCheckTime(check.checked_at)}</span><StatusPill status={check.status === 'up' ? 'UP' : 'DOWN'} /><span className="mono">{check.status_code ?? '—'}</span><span className="mono">{check.response_time != null ? `${check.response_time} ms` : '—'}</span><span className={check.error ? 'error-copy' : 'muted-copy'}>{check.error || '—'}</span></div>)}</section></div>
  {editModal && (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setEditModal(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
        <button className="modal-close" onClick={() => setEditModal(false)} aria-label="Close">
          <span>×</span>
        </button>
        <p className="section-label">Edit monitor</p>
        <h2 id="edit-modal-title">{monitor.name}</h2>
        {editError && (
          <div className="form-error" role="alert">
            <Icon name="alert" size={14} /> {editError}
          </div>
        )}
        <form onSubmit={handleEditSubmit}>
          <label>
            Monitor name
            <input
              name="name"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
              placeholder="e.g. Checkout API"
              autoComplete="name"
              required
              disabled={editing}
            />
          </label>
          <label>
            Endpoint URL
            <input
              name="url"
              type="url"
              value={editForm.url}
              onChange={(e) => setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
              placeholder="https://example.com/health"
              autoComplete="url"
              required
              disabled={editing}
            />
          </label>
          <label>
            Check interval
            <select
              name="interval"
              value={editForm.interval}
              onChange={(e) => setEditForm((prev) => ({ ...prev, [e.target.name]: Number(e.target.value) }))}
              disabled={editing}
            >
              {intervalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              name="is_public"
              type="checkbox"
              checked={editForm.is_public}
              onChange={(e) => setEditForm((prev) => ({ ...prev, is_public: e.target.checked }))}
              disabled={editing}
            />
            Share on public status page
          </label>
          <div className="form-actions">
            <button type="button" className="button button-quiet" onClick={() => setEditModal(false)} disabled={editing}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={editing}>
              {editing ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Saving…
                </>
              ) : (
                <>
                  <Icon name="plus" size={16} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )} </>
  {deleteModal && (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setDeleteModal(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
        <button className="modal-close" onClick={() => setDeleteModal(false)} aria-label="Close">
          <span>×</span>
        </button>
        <p className="section-label">Delete monitor</p>
        <h2 id="delete-modal-title">{monitor.name}</h2>
        <p className="modal-copy">This will permanently delete the monitor and all its check history. This action cannot be undone.</p>
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={() => setDeleteModal(false)} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="button button-primary danger" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                Deleting…
              </>
            ) : (
              <>
                <Icon name="alert" size={16} />
                Delete monitor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )}
}

function formatCheckTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return `${date.toLocaleTimeString('en-GB')}`.slice(0, 8);
}

function PublicStatus({ onBack }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  const loadStatus = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPublicStatus();
      setRows(data.data || []);
      setSyncedAt(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to load public status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const id = window.setInterval(loadStatus, 60000);
    return () => window.clearInterval(id);
  }, [loadStatus]);

  const monitors = rows || [];
  const degraded = monitors.some((monitor) => !monitor.active);
  return <section className="public-page"><div className={`public-status-banner ${degraded ? 'is-degraded' : 'is-operational'}`}><span className="status-dot" />{loading ? 'Loading public status…' : degraded ? 'Some services are paused' : 'All systems operational'}</div><div className="public-head"><div><Logo className="veyra-brand" variant="horizontal" /><p className="section-label">Public status</p><h1>All systems, clearly</h1><p className="public-subtitle">Current health for every service shared publicly.</p></div><span className="public-up"><span className="status-dot" /> {degraded ? 'Reviewing paused services' : 'No active incidents'}</span></div><div className="public-lines">{loading ? <div className="skeleton-stack" aria-label="Loading public status"><i /><i /><i /></div> : error ? <div className="empty-state"><p>{error}</p><button className="text-button" onClick={loadStatus}>Retry</button></div> : monitors.length === 0 ? <div className="empty-state"><p>No services are shared publicly yet.</p></div> : monitors.map((monitor) => <div className="public-line" key={monitor.id}><div><span className={`row-signal ${monitor.active ? 'row-signal-up' : 'row-signal-down'}`} /><strong>{monitor.name}</strong><small>{monitor.url}</small></div><div><span className="public-uptime">{monitor.active ? 'MONITORED' : 'PAUSED'}</span><StatusPill status={monitor.active ? 'ACTIVE' : 'PAUSED'} /></div></div>)}<div className="public-footer-row"><button className="text-button" onClick={onBack}>← Back to overview</button><span className="public-uptime">{syncedAt ? `Updated ${relativeFromNow(syncedAt)}` : ''}</span></div></div><div className="public-footer"><span>Powered by Veyra</span><span>Live from the public status API</span></div></section>; }

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <MonitorsProvider>
      <App />
    </MonitorsProvider>
  </AuthProvider>
);
