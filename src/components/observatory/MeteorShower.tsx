import { useEffect, useRef, useState, type CSSProperties } from 'react';
import '@/styles/meteor-shower.css';

const meteors = [
  { x: 87, y: 8, duration: 13, delay: -1, length: 170 },
  { x: 63, y: 3, duration: 17, delay: -7, length: 120 },
  { x: 109, y: 31, duration: 19, delay: -12, length: 200 },
  { x: 46, y: 15, duration: 23, delay: -17, length: 95 },
  { x: 98, y: 58, duration: 29, delay: -22, length: 145 },
];

export function MeteorShower({ motionEnabled }: { motionEnabled: boolean }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    let visible = false;
    const sync = () => setActive(motionEnabled && visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(field);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [motionEnabled]);

  return <div ref={fieldRef} className={`obs-meteors ${active ? 'is-active' : ''}`} aria-hidden="true">
    {meteors.map((meteor, index) => <span key={index} className="obs-meteor" style={{
      '--meteor-x': `${meteor.x}%`, '--meteor-y': `${meteor.y}%`,
      '--meteor-duration': `${meteor.duration}s`, '--meteor-delay': `${meteor.delay}s`,
      '--meteor-length': `${meteor.length}px`,
    } as CSSProperties}><i /></span>)}
  </div>;
}
