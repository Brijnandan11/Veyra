import React, { useRef, useState } from 'react';

export function CreepyButton({ children, className = '', coverClassName = '', type = 'button', onClick, ...props }) {
  const eyesRef = useRef(null);
  const [eyeCoords, setEyeCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function updateEyes(event) {
    const pointer = 'touches' in event ? event.touches[0] : event;
    if (!pointer || !eyesRef.current) return;
    const eyesRect = eyesRef.current.getBoundingClientRect();
    const dx = pointer.clientX - (eyesRect.left + eyesRect.width / 2);
    const dy = pointer.clientY - (eyesRect.top + eyesRect.height / 2);
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(-dy, dx) + Math.PI / 2;
    setEyeCoords({
      x: (Math.sin(angle) * Math.min(distance, 180)) / 180,
      y: (Math.cos(angle) * Math.min(distance, 75)) / 75,
    });
  }

  function resetEyes() {
    setEyeCoords({ x: 0, y: 0 });
    setIsHovered(false);
  }

  const pupilStyle = { transform: `translate(calc(-50% + ${eyeCoords.x * 50}%), calc(-50% + ${eyeCoords.y * 50}%))` };

  return (
    <button
      type={type}
      className={`creepy-button ${isHovered ? 'is-hovered' : ''} ${className}`.trim()}
      onClick={onClick}
      onMouseMove={(event) => { updateEyes(event); setIsHovered(true); }}
      onTouchMove={updateEyes}
      onMouseLeave={resetEyes}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      {...props}
    >
      <span ref={eyesRef} className="creepy-button-eyes" aria-hidden="true">
        <span className="creepy-button-eye"><span style={pupilStyle} /></span>
        <span className="creepy-button-eye"><span style={pupilStyle} /></span>
      </span>
      <span className={`creepy-button-cover ${coverClassName}`.trim()}>
        {children}
      </span>
      <span className="creepy-button-placeholder" aria-hidden="true">{children}</span>
    </button>
  );
}

export default CreepyButton;
