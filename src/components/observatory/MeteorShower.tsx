import { useEffect, useRef, useState, type CSSProperties } from 'react';
import '@/styles/meteor-shower.css';

const meteors = [
  { x: 87, y: 8, duration: 10.7, delay: -1, length: 170 },
  { x: 63, y: 3, duration: 13.1, delay: -7, length: 120 },
  { x: 109, y: 31, duration: 11.9, delay: -4.2, length: 200 },
  { x: 46, y: 15, duration: 14.3, delay: -11.3, length: 95 },
  { x: 98, y: 58, duration: 16.7, delay: -13.6, length: 145 },
  { x: 74, y: 40, duration: 12.7, delay: -9.8, length: 130 },
  { x: 35, y: 5, duration: 15.1, delay: -6.5, length: 90 },
  { x: 116, y: 12, duration: 9.7, delay: -2.4, length: 180 },
  { x: 58, y: 58, duration: 17.3, delay: -15.9, length: 105 },
  { x: 91, y: 25, duration: 13.7, delay: -5.6, length: 155 },
  { x: 51, y: 32, duration: 11.3, delay: -8.2, length: 110 },
  { x: 104, y: 70, duration: 18.1, delay: -17.4, length: 165 },
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
