import { useEffect, useRef, type RefObject } from 'react';

export type OverviewJourney = { book: number };

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** Native page scrolling drives presentation, without changing the user's camera or scroll. */
export function useOverviewJourney(root: RefObject<HTMLDivElement | null>, enabled: boolean, motion: boolean) {
  const journey = useRef<OverviewJourney>({ book: 1 });
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const publish = (departure: number, book: number) => {
      journey.current.book = book;
      host.style.setProperty('--universe-departure', departure.toFixed(4));
      host.style.setProperty('--book-arrival', book.toFixed(4));
      [0, 1, 2].forEach(index => {
        const star = ease((book - 0.2 - index * 0.13) / 0.42);
        host.style.setProperty(`--contribution-${index}`, star.toFixed(4));
      });
      host.dataset.knowledgeProgress = book.toFixed(3);
    };
    if (!enabled || !motion) { publish(0, 1); return; }
    const section = host.querySelector<HTMLElement>('#open-source');
    const map = section?.querySelector<HTMLElement>('.obs-constellation-map');
    if (!section || !map) { publish(0, 1); return; }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const departure = ease((viewport - section.getBoundingClientRect().top) / (viewport * 0.8));
      const book = ease((viewport - map.getBoundingClientRect().top) / (viewport * 0.62));
      publish(departure, book);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(section);
    observer.observe(map);
    measure();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [root, enabled, motion]);
  return journey;
}
