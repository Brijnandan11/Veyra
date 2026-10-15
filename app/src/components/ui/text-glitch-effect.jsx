import React, { useEffect, useRef, useState } from 'react';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function TextGlitch({ text, hoverText = text, className = '', delay = 0 }) {
  const intervalRef = useRef(null);
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function handleMouseEnter() {
    setIsHovered(true);
    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText(hoverText.split('').map((letter, index) => {
        if (index < iteration) return hoverText[index];
        return LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }).join(''));
      iteration += 1 / 3;
      if (iteration >= hoverText.length) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplayText(hoverText);
      }
    }, 30);
  }

  function handleMouseLeave() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setDisplayText(text);
    setIsHovered(false);
  }

  return (
    <span
      className={`text-glitch ${isHovered ? 'text-glitch-active' : ''} ${className}`.trim()}
      style={{ '--text-glitch-delay': `${delay}s` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsHovered(true)}
      onBlur={handleMouseLeave}
      tabIndex="0"
      role="text"
    >
      <span className="text-glitch-base">{displayText}</span>
      <span className="text-glitch-overlay" aria-hidden="true">{displayText}</span>
    </span>
  );
}

export default TextGlitch;
