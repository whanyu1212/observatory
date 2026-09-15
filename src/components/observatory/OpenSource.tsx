import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bug, GitPullRequest } from 'lucide-react';
import '@/styles/open-source.css';

export function OpenSource() {
  const [revealed, setRevealed] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setRevealed(true);
      observer.disconnect();
    }, { threshold: 0.12 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={rootRef} id="open-source" className="obs-open-source" aria-labelledby="open-source-title" tabIndex={-1} data-revealed={revealed}>
      <div className="obs-open-source-heading">
        <div>
          <p className="obs-mono obs-note-label">OPEN SOURCE / PARTICIPATION</p>
          <h2 id="open-source-title">Contributing beyond<span>my own projects.</span></h2>
        </div>
        <p>Beyond the projects I maintain, I contribute to open-source work I believe in.</p>
      </div>

      <div className="obs-contribution-list">
        <article className="obs-contribution-card">
          <GitPullRequest size={24} aria-hidden="true" />
          <div>
            <p className="obs-contribution-repository obs-mono">BOJIELI / AI-AGENT-BOOK</p>
            <h3>AI Agent Book</h3>
            <p className="obs-contribution-owner">Created and maintained by Bojie Li.</p>
            <p>I contribute across translation, engineering, testing, and the web reading experience.</p>
            <div className="obs-contribution-actions">
              <a href="https://github.com/bojieli/ai-agent-book/pulls?q=is%3Apr+author%3Awhanyu1212" target="_blank" rel="noreferrer">View my contributions <ArrowUpRight size={15} aria-hidden="true" /></a>
              <a href="https://bojieli.github.io/ai-agent-book/astro/" target="_blank" rel="noreferrer">Read online <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </article>

        <article className="obs-contribution-card">
          <Bug size={24} aria-hidden="true" />
          <div>
            <p className="obs-contribution-repository obs-mono">GOOGLE / ADK-PYTHON</p>
            <h3>Google Agent Development Kit</h3>
            <p className="obs-contribution-owner">Created and maintained by Google.</p>
            <p>I report reproducible bugs and technical feedback discovered while building with the framework.</p>
            <a href="https://github.com/google/adk-python/issues?q=is%3Aissue%20author%3Awhanyu1212" target="_blank" rel="noreferrer">View my issue reports <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </article>
      </div>
    </section>
  );
}
