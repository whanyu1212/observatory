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
        <p className="obs-mono obs-note-label">OPEN SOURCE</p>
        <h2 id="open-source-title">Beyond my <span>own projects.</span></h2>
      </div>

      <div className="obs-contribution-list">
        <article className="obs-contribution-row">
          <GitPullRequest size={20} aria-hidden="true" />
          <div>
            <div className="obs-contribution-meta obs-mono"><span className="obs-contribution-role">Contributor</span><span>bojieli / ai-agent-book</span></div>
            <h3>AI Agent Book</h3>
            <p>Translation, engineering, testing, and improvements to the web reader.</p>
            <div className="obs-contribution-actions">
              <a href="https://github.com/bojieli/ai-agent-book/pulls?q=is%3Apr+author%3Awhanyu1212" target="_blank" rel="noreferrer">View pull requests <ArrowUpRight size={13} aria-hidden="true" /></a>
              <a className="obs-contribution-secondary" href="https://bojieli.github.io/ai-agent-book/astro/" target="_blank" rel="noreferrer">Read the book <ArrowUpRight size={13} aria-hidden="true" /></a>
            </div>
          </div>
        </article>

        <article className="obs-contribution-row">
          <Bug size={20} aria-hidden="true" />
          <div>
            <div className="obs-contribution-meta obs-mono"><span className="obs-contribution-role">Issue reporter</span><span>google / adk-python</span></div>
            <h3>Google ADK</h3>
            <p>Reproducible bug reports and technical feedback from using the framework.</p>
            <div className="obs-contribution-actions">
              <a href="https://github.com/google/adk-python/issues?q=is%3Aissue%20author%3Awhanyu1212" target="_blank" rel="noreferrer">View issue reports <ArrowUpRight size={13} aria-hidden="true" /></a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
