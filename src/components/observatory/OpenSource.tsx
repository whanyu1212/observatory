import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ArrowUpRight, BookOpen, GitMerge } from 'lucide-react';
import '@/styles/open-source.css';
import type { OverviewJourney } from './overviewJourney';

const OpenKnowledgeBook = lazy(() => import('./OpenKnowledgeBook').then(module => ({ default: module.OpenKnowledgeBook })));

const contributions = [
  {
    number: 81,
    title: 'Make the ideas accessible.',
    description: 'Polished the English translation of Chapters 1–2, helping readers follow the concepts across languages.',
    area: 'TRANSLATION',
    x: 16, y: 25, path: 'M 96 90 Q 120 194 276 194',
  },
  {
    number: 425,
    title: 'Make the experiments easier to run.',
    description: 'Standardized dependencies and experiment structure, with shared provider utilities and CI coverage.',
    area: 'ENGINEERING',
    x: 81, y: 23, path: 'M 486 83 Q 410 194 276 194',
  },
  {
    number: 819,
    title: 'Make the details trustworthy.',
    description: 'Corrected the English Chapter 3 figure mappings and added regression tests for figure-caption alignment.',
    area: 'QUALITY',
    x: 77, y: 73, path: 'M 462 263 Q 372 263 276 194',
  },
];

export function OpenSource({ motionEnabled, journey }: { motionEnabled: boolean; journey: RefObject<OverviewJourney> }) {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLElement>(null);
  const contribution = contributions[active];
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section ref={root} id="open-source" className="obs-open-source" aria-labelledby="open-source-title" tabIndex={-1} data-in-view={inView}>
      <div className="obs-open-source-heading">
        <div>
          <p className="obs-mono obs-note-label">OPEN SOURCE / CONTRIBUTOR</p>
          <h2 id="open-source-title">Agent knowledge,<span>open to everyone.</span></h2>
        </div>
        <div className="obs-open-source-intro">
          <p>I believe learning to build AI agents should be accessible to everyone. Through Bojie Li’s open-source ai-agent-book, I help make that knowledge easier to understand, put into practice, and build on—across languages and experience levels.</p>
          <a className="obs-text-action" href="https://github.com/bojieli/ai-agent-book/pulls?q=is%3Apr+author%3Awhanyu1212" target="_blank" rel="noreferrer">Explore my contributions <ArrowUpRight size={15} /></a>
        </div>
      </div>
      <div className="obs-constellation">
        <div className="obs-constellation-map" role="group" aria-label="Explore three featured contributions">
          <svg viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true">
            {contributions.map((item, index) => <g key={item.number} data-active={index === active}>
              <path className="obs-constellation-orbit" d={item.path} />
              <path className="obs-constellation-signal" d={item.path} />
            </g>)}
          </svg>
          <a className="obs-constellation-hub" href="https://github.com/bojieli/ai-agent-book" target="_blank" rel="noreferrer" aria-label="Explore Bojie Li’s open-source ai-agent-book on GitHub">
            <Suspense fallback={<span className="obs-knowledge-book" aria-hidden="true"><BookOpen size={74} /></span>}><OpenKnowledgeBook motionEnabled={motionEnabled} active={inView} journey={journey} /></Suspense>
            <strong>ai-agent-book</strong><span className="obs-knowledge-book-credit obs-mono">BY BOJIE LI <ArrowUpRight size={12} /></span>
          </a>
          {contributions.map((item, index) => <button key={item.number} className="obs-contribution-star" style={{ left: `${item.x}%`, top: `${item.y}%`, '--star-arrival': `var(--contribution-${index}, 1)` } as CSSProperties} aria-pressed={active === index} aria-controls="contribution-detail" onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}>
            <span className="obs-star-light" aria-hidden="true" /><strong>{item.area.toLowerCase()}</strong><span className="obs-mono">PR #{item.number}</span>
          </button>)}
          <p className="obs-constellation-hint obs-mono">CHOOSE A STAR TO FOLLOW THE CONTRIBUTION</p>
        </div>
        <div id="contribution-detail" className="obs-contribution-detail" aria-live="polite" aria-atomic="true">
          <article key={contribution.number}>
            <div className="obs-contribution-meta obs-mono"><span>{contribution.area}</span><span><GitMerge size={14} /> MERGED / #{contribution.number}</span></div>
            <h3>{contribution.title}</h3><p>{contribution.description}</p>
            <a className="obs-contribution-link" href={`https://github.com/bojieli/ai-agent-book/pull/${contribution.number}`} target="_blank" rel="noreferrer">Read the contribution <ArrowUpRight size={16} /></a>
          </article>
        </div>
      </div>
    </section>
  );
}
