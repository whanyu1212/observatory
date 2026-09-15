import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ArrowUpRight, BookOpen, GitMerge, GitPullRequest } from 'lucide-react';
import '@/styles/open-source.css';
import type { OverviewJourney } from './overviewJourney';

const OpenKnowledgeBook = lazy(() => import('./OpenKnowledgeBook').then(module => ({ default: module.OpenKnowledgeBook })));

const contributions = [
  {
    number: 81,
    title: 'Open the ideas to more readers.',
    description: 'Polished the English translation of Chapters 1–2 for more natural, accessible reading while preserving their technical meaning.',
    area: 'TRANSLATION',
    status: 'MERGED',
    x: 14, y: 22, path: 'M 84 79 Q 156 168 276 194',
  },
  {
    number: 425,
    title: 'Make every experiment easier to run.',
    description: 'Standardized dependencies and experiment structure, introducing shared provider utilities and CI coverage for more reproducible research.',
    area: 'ENGINEERING',
    status: 'MERGED',
    x: 49, y: 8, path: 'M 294 29 Q 300 112 276 194',
  },
  {
    number: 819,
    title: 'Keep every figure trustworthy.',
    description: 'Corrected the English Chapter 3 figure mappings and added regression tests to keep figures aligned with their captions.',
    area: 'QUALITY',
    status: 'MERGED',
    x: 84, y: 23, path: 'M 504 83 Q 406 174 276 194',
  },
  {
    number: 1071,
    title: 'Turn the book into a reading experience.',
    description: 'Built an Astro site for all 10 chapters, bringing multilingual reading, interactive diagrams, responsive navigation, and tested content tooling to the book.',
    area: 'EXPERIENCE',
    status: 'MERGED',
    x: 17, y: 75, path: 'M 102 270 Q 180 248 276 194',
  },
  {
    number: 1085,
    title: 'Make the architecture move clearly.',
    description: 'Refined the agent-loop animation and responsive connectors so the architecture remains readable across desktop, tablet, and mobile screens.',
    area: 'RESPONSIVE UI',
    status: 'OPEN',
    x: 81, y: 75, path: 'M 486 270 Q 382 248 276 194',
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
          <p>I contribute to Bojie Li’s open-source ai-agent-book across translation, engineering, testing, and the reading experience—helping make practical agent knowledge clearer, more reliable, and easier to explore.</p>
          <a className="obs-text-action" href="https://github.com/bojieli/ai-agent-book/pulls?q=is%3Apr+author%3Awhanyu1212" target="_blank" rel="noreferrer">Explore my contributions <ArrowUpRight size={15} /></a>
        </div>
      </div>
      <div className="obs-constellation">
        <div className="obs-constellation-map" role="group" aria-label="Explore five featured contributions">
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
            <div className="obs-contribution-meta obs-mono"><span>{contribution.area}</span><span>{contribution.status === 'MERGED' ? <GitMerge size={14} /> : <GitPullRequest size={14} />} {contribution.status} / #{contribution.number}</span></div>
            <h3>{contribution.title}</h3><p>{contribution.description}</p>
            <a className="obs-contribution-link" href={`https://github.com/bojieli/ai-agent-book/pull/${contribution.number}`} target="_blank" rel="noreferrer">Read the contribution <ArrowUpRight size={16} /></a>
          </article>
        </div>
      </div>
    </section>
  );
}
