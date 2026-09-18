import type { MouseEvent } from 'react';
import { ArrowUpRight, BookOpen, ChevronDown, Contact, GitBranch, Mail } from 'lucide-react';

type AboutPageProps = {
  onNavigateExperience: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function AboutPage({ onNavigateExperience }: AboutPageProps) {
  return (
    <section className="obs-about-profile" aria-labelledby="about-title">
      <header className="obs-about-intro">
        <div>
          <p className="obs-about-label obs-mono">ABOUT <span>/</span> SINGAPORE</p>
          <h1 id="about-title">I'm Hanyu.<br /><span>I learn by building.</span></h1>
        </div>
        <div className="obs-about-prose">
          <p>I'm a data scientist and applied AI builder in Singapore. I make agents, data tools, and projects that help me understand games.</p>
          <p>My projects explore agent runtimes, shipping ML, and programmable finance. I keep learning by following the next question.</p>
          <p>I'm a mental health advocate, and I live with generalized anxiety disorder (GAD) and ADHD. I'd be happy to collaborate on mental health-related projects.</p>
          <p>I'm also a proud community ambassador for <a className="obs-adal-link" href="https://adalagent.ai/" target="_blank" rel="noreferrer"><img src="/adal-icon-pink.svg" width="24" height="24" alt="" />AdaL</a>.</p>
        </div>
      </header>
      <section className="obs-about-section obs-about-skills" aria-labelledby="about-skills-title">
        <h2 id="about-skills-title">Skills &amp; toolkit.</h2>
        <div className="obs-about-section-content">
          <ul className="obs-capabilities" role="list" aria-label="Skills">
            <li>
              <details className="obs-capability">
                <summary>
                  <span className="obs-capability-bullet" aria-hidden="true" />
                  <span>AI agents &amp; evaluation</span>
                  <ChevronDown size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <div className="obs-capability-detail">
                  <p>Agent runtimes, multi-agent workflows, memory and tool use, with evaluation harnesses, tracing and guardrails.</p>
                  <div className="obs-capability-evidence">
                    <a href="#experience" onClick={onNavigateExperience}>Manufacturing diagnostics <ArrowUpRight size={14} aria-hidden="true" /></a>
                    <a href="https://github.com/whanyu1212/Wisp" target="_blank" rel="noreferrer">Wisp <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </details>
            </li>
            <li>
              <details className="obs-capability">
                <summary>
                  <span className="obs-capability-bullet" aria-hidden="true" />
                  <span>Applied AI &amp; statistics</span>
                  <ChevronDown size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <div className="obs-capability-detail">
                  <p>Machine learning, deep learning, NLP, retrieval-augmented generation and causal inference. Interpretable models shaped by real operational problems.</p>
                  <div className="obs-capability-evidence">
                    <a href="#experience" onClick={onNavigateExperience}>Manufacturing, tourism &amp; education <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </details>
            </li>
            <li>
              <details className="obs-capability">
                <summary>
                  <span className="obs-capability-bullet" aria-hidden="true" />
                  <span>Software &amp; production delivery</span>
                  <ChevronDown size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <div className="obs-capability-detail">
                  <p>APIs, data pipelines, CI/CD and user-facing applications. Taking a working prototype through deployment and into everyday use.</p>
                  <div className="obs-capability-evidence">
                    <a href="https://github.com/whanyu1212/shipping-ml" target="_blank" rel="noreferrer">Shipping ML <ArrowUpRight size={14} aria-hidden="true" /></a>
                    <a href="#experience" onClick={onNavigateExperience}>Global manufacturing monitoring <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </details>
            </li>
            <li>
              <details className="obs-capability">
                <summary>
                  <span className="obs-capability-bullet" aria-hidden="true" />
                  <span>Technical communication</span>
                  <ChevronDown size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <div className="obs-capability-detail">
                  <p>Technical writing, public speaking and collaboration with domain experts. Sharing agent engineering knowledge in English and Mandarin.</p>
                  <div className="obs-capability-evidence">
                    <a href="https://github.com/bojieli/ai-agent-book" target="_blank" rel="noreferrer">AI Agent Book <ArrowUpRight size={14} aria-hidden="true" /></a>
                    <a href="https://adalagent.ai/" target="_blank" rel="noreferrer"><img className="obs-adal-icon" src="/adal-icon-pink.svg" width="20" height="20" alt="" />AdaL community ambassador <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </details>
            </li>
          </ul>
          <dl className="obs-toolkit">
            <div><dt>Languages</dt><dd>Python <span>·</span> TypeScript <span>·</span> Julia <span>·</span> SQL <span>·</span> Rust</dd></div>
            <div><dt>Agents &amp; ML</dt><dd>OpenAI Agents SDK <span>·</span> Google ADK <span>·</span> LangChain <span>·</span> MCP <span>·</span> PyTorch <span>·</span> scikit-learn</dd></div>
            <div><dt>Building &amp; shipping</dt><dd>FastAPI <span>·</span> Angular <span>·</span> GCP <span>·</span> CI/CD <span>·</span> Git</dd></div>
          </dl>
        </div>
      </section>
      <section className="obs-about-section obs-about-contact" aria-labelledby="about-contact-title">
        <h2 id="about-contact-title">Let's connect.</h2>
        <div className="obs-about-section-content">
          <a className="obs-about-email" href="mailto:whanyu47@gmail.com"><Mail size={21} aria-hidden="true" /><span>whanyu47@gmail.com</span><ArrowUpRight size={19} aria-hidden="true" /></a>
          <div className="obs-about-socials">
            <a href="https://www.linkedin.com/in/hanyu-wu-6a610b165" target="_blank" rel="noreferrer"><Contact size={19} aria-hidden="true" /><span>LinkedIn<small>Hanyu Wu</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
            <a href="https://github.com/whanyu1212" target="_blank" rel="noreferrer"><GitBranch size={19} aria-hidden="true" /><span>GitHub<small>@whanyu1212</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
            <a href="https://x.com/queryverse_hy" target="_blank" rel="noreferrer"><span className="obs-x-mark" aria-hidden="true">𝕏</span><span>X<small>@queryverse_hy</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
            <a href="https://www.rednote.com/user/profile/61a7a038000000001000e248" target="_blank" rel="noreferrer" aria-label="Rednote (小红书): Queryverse"><BookOpen size={19} aria-hidden="true" /><span>Rednote<small>Queryverse</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    </section>
  );
}
