import React, { useEffect, useRef, useState } from 'react';
import '@/styles/background-stars.css';

export interface BackgroundStarsProps {
  motionEnabled: boolean;
  variant?: 'page' | 'map' | 'universe';
}

const stars = [
  [3, 4, 1, .26, -2, 31, 8], [12, 9, 2, .42, -11, 37, -9], [21, 3, 1, .31, -7, 29, 12],
  [33, 12, 1, .22, -19, 41, -6], [45, 6, 2, .46, -5, 34, 10], [58, 14, 1, .25, -23, 39, -8],
  [69, 5, 1, .38, -13, 32, 7], [82, 10, 2, .34, -29, 44, -11], [94, 3, 1, .28, -17, 35, 8],
  [7, 21, 1, .35, -31, 38, 9], [18, 29, 2, .28, -3, 47, -7], [29, 19, 1, .24, -37, 33, 11],
  [40, 27, 1, .4, -15, 42, -8], [53, 22, 2, .3, -21, 36, 12], [64, 31, 1, .24, -8, 45, -6],
  [76, 20, 1, .36, -27, 31, 9], [88, 28, 2, .32, -12, 40, -12], [97, 18, 1, .22, -33, 46, 6],
  [4, 40, 2, .29, -18, 43, -8], [15, 48, 1, .23, -39, 30, 10], [27, 38, 1, .37, -6, 39, -11],
  [37, 51, 2, .33, -25, 48, 7], [49, 42, 1, .27, -16, 35, -9], [61, 49, 1, .41, -42, 44, 12],
  [72, 39, 2, .31, -9, 32, -7], [84, 52, 1, .25, -30, 41, 9], [95, 43, 1, .36, -20, 37, -10],
  [8, 61, 1, .27, -12, 46, 8], [20, 70, 2, .39, -35, 34, -6], [32, 59, 1, .22, -24, 40, 11],
  [43, 72, 1, .34, -4, 31, -9], [56, 63, 2, .3, -28, 45, 7], [67, 73, 1, .24, -15, 38, -12],
  [79, 60, 1, .38, -40, 47, 8], [90, 71, 2, .28, -22, 33, -7], [98, 62, 1, .33, -10, 42, 10],
  [3, 82, 1, .23, -26, 36, -8], [13, 94, 2, .36, -14, 43, 12], [25, 84, 1, .3, -34, 31, -6],
  [36, 96, 1, .25, -7, 46, 9], [48, 86, 2, .42, -18, 37, -11], [60, 93, 1, .22, -38, 44, 7],
  [73, 83, 1, .32, -3, 35, -8], [85, 95, 2, .29, -24, 48, 10], [96, 86, 1, .37, -13, 39, -7],
] as const;

// A denser, offset layer gives the map its own depth without repeating the same sky.
const mapStars = [...stars, ...stars.map(([x, y, , opacity, delay, duration, drift]) =>
  [(x + 17) % 100, (y + 31) % 100, 1, opacity, delay - 7, duration + 5, -drift] as const,
)];

// A deterministic, dedicated first-screen layer keeps the universe dense even on long pages.
let starSeed = 94721;
const randomStar = () => {
  starSeed = (Math.imul(starSeed, 1664525) + 1013904223) >>> 0;
  return starSeed / 4294967296;
};
const universeStars = Array.from({ length: 190 }, (_, index) => [
  Number((randomStar() * 100).toFixed(3)), Number((randomStar() * 100).toFixed(3)),
  index % 7 === 0 ? 2 : 1, 0.15 + randomStar() * 0.3,
  -randomStar() * 30, 32 + randomStar() * 24, (randomStar() - 0.5) * 10,
] as const);

export function BackgroundStars({ motionEnabled, variant = 'page' }: BackgroundStarsProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    let pageVisible = !document.hidden;
    let inViewport = true;
    const sync = () => setIsMoving(motionEnabled && pageVisible && inViewport);
    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      sync();
    };
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? false;
      sync();
    }, { threshold: 0 });

    observer.observe(field);
    document.addEventListener('visibilitychange', onVisibilityChange);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [motionEnabled]);

  return (<>
    <div ref={fieldRef} className={`obs-starfield obs-starfield--${variant} ${isMoving ? 'is-moving' : ''}`} aria-hidden="true">
      <div className="obs-starfield__veil" />
      {variant === 'universe' && <div className="obs-cosmic-clouds" />}
      {(variant === 'map' ? mapStars : variant === 'universe' ? universeStars : stars).map(([x, y, size, opacity, delay, duration, drift]) => (
        <span
          key={`${x}-${y}`}
          className="obs-starfield__star"
          style={{
            '--star-x': `${x}%`,
            '--star-y': `${y}%`,
            '--star-size': `${size === 1 ? 1.5 : 2.8}px`,
            '--star-glow': `${size * 5 + 3}px`,
            '--star-opacity': Math.min(.96, opacity + .5),
            '--star-delay': `${delay}s`,
            '--star-duration': `${duration}s`,
            '--star-drift': `${drift}px`,
            '--star-drift-start': `${Math.round(drift * -.35)}px`,
            '--star-drift-end': `${Math.round(drift * .55)}px`,
            '--star-twinkle-duration': `${(2.4 + ((x + y) % 7) * .55).toFixed(2)}s`,
            '--star-twinkle-delay': `${(delay * .73).toFixed(2)}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
    {variant === 'page' && <BackgroundStars motionEnabled={motionEnabled} variant="universe" />}
  </>);
}
