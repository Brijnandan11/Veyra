import { useEffect, useRef } from 'react';

export default function PixelBackground({ colors, gap = 6, speed = 42, opacity = .7, direction = 'top', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const palette = colors.split(',').map((color) => color.trim());
    let frame = 0;
    let width = 0;
    let height = 0;
    let cells = [];

    function seed() {
      const density = Math.max(14, Math.floor(width / gap));
      cells = Array.from({ length: density }, (_, index) => ({
        x: index * gap + Math.random() * gap,
        y: Math.random() * height,
        size: 1 + Math.random() * 2.5,
        drift: .25 + Math.random() * .8,
        color: palette[index % palette.length],
        alpha: .18 + Math.random() * .66,
      }));
    }

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      seed();
    }

    function render(time) {
      context.clearRect(0, 0, width, height);
      cells.forEach((cell, index) => {
        const directionFactor = direction === 'top' ? -1 : 1;
        const travel = (time / 1000) * speed * cell.drift * directionFactor;
        const y = ((cell.y + travel) % (height + 10) + (height + 10)) % (height + 10) - 5;
        context.globalAlpha = cell.alpha * opacity;
        context.fillStyle = cell.color;
        context.fillRect(cell.x, y, cell.size, cell.size);
        if (index % 8 === 0) context.fillRect(cell.x + gap, y + gap, 1, 1);
      });
      context.globalAlpha = 1;
      frame = window.requestAnimationFrame(render);
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resize();
    window.addEventListener('resize', resize);
    render(0);
    if (!reduceMotion) frame = window.requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(frame);
    };
  }, [colors, direction, gap, opacity, speed]);

  return <canvas ref={canvasRef} className={`pixel-background ${className}`} aria-hidden="true" />;
}
