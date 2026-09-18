import { useEffect, useRef, useState } from 'react';
import '@/styles/background-stars.css';

export interface BackgroundStarsProps {
  motionEnabled: boolean;
  variant?: 'page' | 'map' | 'universe';
}

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
      <div className="obs-starfield__texture" />
    </div>
  </>);
}
