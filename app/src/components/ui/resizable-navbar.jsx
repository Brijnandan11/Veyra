import React, { useEffect, useState } from 'react';
import { Logo } from './veyra-logo';

function NavIcon({ name, size = 15 }) {
  const paths = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
    moon: <path d="M20 15.4A8.5 8.5 0 0 1 8.6 4a8.5 8.5 0 1 0 11.4 11.4Z" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    github: <><path d="M9 19c-4 .9-4-2-5-2m10 4v-3.5c0-1 .1-1.4-.5-2 1.7-.2 3.5-.8 3.5-4a3.2 3.2 0 0 0-.9-2.2A3 3 0 0 0 16 7c-.3-.8-1-1-2-.8a9.5 9.5 0 0 0-4 0c-1-.2-1.7 0-2 .8-.8.1-1.5.7-2.1 1.3A3.2 3.2 0 0 0 5 10.5c0 3.2 1.8 3.8 3.5 4-.6.6-.6 1.2-.5 2V21" /></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{paths[name]}</svg>;
}

export function ResizableNavbar({ theme, setTheme, onDashboard, onPublicStatus, onLogin, onRegister, isAuthenticated, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let previous = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const next = window.scrollY;
        setScrolled(next > 40);
        setHidden(next > previous && next > 96);
        previous = next;
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  const brandRef = React.useRef(null);
  // Pulse line draws once on hover/focus (CSS .is-drawing); reduced motion opts out in CSS.
  const drawPulse = () => brandRef.current?.classList.add('is-drawing');
  const resetPulse = () => brandRef.current?.classList.remove('is-drawing');

  return (
    <header className={`resizable-navbar ${scrolled ? 'is-scrolled' : ''} ${hidden ? 'is-hidden' : ''} ${menuOpen ? 'is-open' : ''}`}>
      <button ref={brandRef} className="resizable-brand" onMouseEnter={drawPulse} onMouseLeave={resetPulse} onFocus={drawPulse} onBlur={resetPulse} onClick={() => { closeMenu(); window.scrollTo({ top: 0, behavior: 'auto' }); }} aria-label="Veyra home"><Logo /></button>
      <button className="resizable-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>
        <span /><span />
      </button>
      <nav className="resizable-links" aria-label="Hero navigation">
        <button onClick={onDashboard}>Monitoring</button>
        <button onClick={onPublicStatus}>Public status</button>
        <a href="https://github.com/Brijnandan11" target="_blank" rel="noreferrer"><NavIcon name="github" size={15} /> GitHub</a>
      </nav>
      <div className="resizable-actions">
        <button className="theme-toggle resizable-theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><NavIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /></button>
        {!isAuthenticated ? (
          <>
            <button className="button button-quiet" onClick={onLogin}>Log in</button>
            <button className="resizable-console" onClick={onRegister}>Create account <NavIcon name="arrow" size={15} /></button>
          </>
        ) : (
          <>
            <button className="button button-quiet" onClick={onLogout}>Sign out</button>
            <button className="resizable-console" onClick={onDashboard}>Open console <NavIcon name="arrow" size={15} /></button>
          </>
        )}
      </div>
    </header>
  );
}

export default ResizableNavbar;
