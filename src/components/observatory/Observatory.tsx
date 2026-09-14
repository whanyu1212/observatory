import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { ArrowUpRight, AudioLines, BookOpen, Command, Contact, GitBranch, Mail, VolumeX } from 'lucide-react';
import { $audioEnabled, $theme, $windows, minimizeApp, openApp } from '@/stores/osStore';
import { soundEffects } from '@/components/effects/AudioEngine';
import { Desktop } from '@/components/os/Desktop';
import { Dock } from '@/components/os/Dock';
import { Playground } from './Playground';
import { BackgroundStars } from './BackgroundStars';
import { MeteorShower } from './MeteorShower';
import { OpenSource } from './OpenSource';
import { FieldNotesPanel } from './FieldNotesPanel';
import { ProjectPanel } from './ProjectPanel';
import { ExperiencePage } from './ExperiencePage';
import { useOverviewJourney } from './overviewJourney';
import type { ProjectId } from './curiosity';

type Section = 'overview' | 'experience' | 'about';
type Direction = 'orbital' | 'signal' | 'blueprint';

export function Observatory({ projectImage, mapImage }: { projectImage: string; mapImage: string }) {
  const [section, setSection] = useState<Section>('overview');
  const [direction, setDirection] = useState<Direction>('orbital');
  const [notesProject, setNotesProject] = useState<ProjectId | null>(null);
  const [projectPanel, setProjectPanel] = useState<ProjectId | null>(null);
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const audioOn = useStore($audioEnabled);
  const contentRef = useRef<HTMLDivElement>(null);
  const observatoryRef = useRef<HTMLDivElement>(null);
  const motionEnabled = motionChoice ?? !reducedMotion;
  const overviewJourney = useOverviewJourney(observatoryRef, section === 'overview', motionEnabled);
  const toggleMotion = () => {
    const next = !motionEnabled;
    setMotionChoice(next);
    try { localStorage.setItem('hanyu:motion', next ? 'on' : 'off'); } catch { /* The control still works when storage is unavailable. */ }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hanyu:motion');
      if (saved === 'on' || saved === 'off') setMotionChoice(saved === 'on');
    } catch { /* Fall back to the system preference. */ }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const syncSection = () => {
      const hash = window.location.hash.slice(1);
      const next: Section = hash === 'experience' || hash === 'about' ? hash : hash === 'work' ? 'experience' : 'overview';
      setSection(next);
      setNotesProject(null);
      setProjectPanel(null);
      if (hash === 'work') window.history.replaceState(null, '', '#experience');
    };
    syncSection();
    window.addEventListener('hashchange', syncSection);
    window.addEventListener('popstate', syncSection);
    return () => {
      window.removeEventListener('hashchange', syncSection);
      window.removeEventListener('popstate', syncSection);
    };
  }, []);

  useEffect(() => {
    const theme = direction === 'signal' ? 'ultraviolet' : direction === 'blueprint' ? 'polar' : 'observatory';
    document.documentElement.dataset.theme = theme;
    $theme.set(theme);
  }, [direction]);

  const navigate = (next: Section, event?: React.MouseEvent) => {
    event?.preventDefault();
    Object.values($windows.get()).forEach(win => {
      if (win.isOpen && !win.isMinimized) minimizeApp(win.id);
    });
    setSection(next);
    setNotesProject(null);
    setProjectPanel(null);
    window.history.pushState(null, '', `#${next}`);
    soundEffects.playBlip(680, .04);
    contentRef.current?.focus({ preventScroll: true });
  };

  const toggleAudio = () => {
    $audioEnabled.set(!audioOn);
    if (!audioOn) { soundEffects.startAmbientHum(); soundEffects.playEngage(); }
    else soundEffects.stopAmbientHum();
  };

  const playProjectSound = () => {
    soundEffects.playBlip(740, .04);
  };

  const revealProject = (id: ProjectId) => {
    playProjectSound();
    setProjectPanel(null);
    setNotesProject(id);
  };

  const openProject = (id: ProjectId) => {
    playProjectSound();
    setNotesProject(null);
    setProjectPanel(id);
  };
  return (
    <div ref={observatoryRef} className="observatory" data-direction={direction} data-motion={motionEnabled ? 'on' : 'off'}>
      <BackgroundStars motionEnabled={motionEnabled} />
      <MeteorShower motionEnabled={motionEnabled} />
      <a href="#portfolio-content" className="obs-skip-link">Skip to content</a>
      <header className="obs-header">
        <nav className="obs-nav" aria-label="Main navigation">
          {(['overview', 'experience', 'about'] as Section[]).map(item => <a key={item} href={`#${item}`} onClick={event => navigate(item, event)} aria-current={section === item ? 'page' : undefined}>{item[0].toUpperCase() + item.slice(1)}</a>)}
        </nav>
        <div className="obs-header-actions">
          <button type="button" className="obs-sound-control" onClick={toggleAudio} aria-label={audioOn ? 'Mute sound' : 'Enable sound'} aria-pressed={audioOn}>{audioOn ? <AudioLines size={16} /> : <VolumeX size={16} />}<span className="obs-mono">SOUND {audioOn ? 'ON' : 'OFF'}</span></button>
          <button type="button" className="obs-workspace-button" aria-label="Open workspace" onClick={() => openApp('terminal')}><Command size={14} /><span>Workspace</span><ArrowUpRight size={14} /></button>
        </div>
      </header>

      <main id="portfolio-content" className="obs-main">
        <div ref={contentRef} className="obs-content-focus" tabIndex={-1}>
        <div hidden={section !== 'overview'}>
          <Playground mapImage={mapImage} panelProject={projectPanel ?? notesProject} active={section === 'overview'} motionEnabled={motionEnabled && section === 'overview'} onToggleMotion={toggleMotion} onSelect={playProjectSound} onReadNotes={revealProject} onViewProject={openProject} />
        </div>
        <ExperiencePage hidden={section !== 'experience'} motionEnabled={motionEnabled} onExplore={() => navigate('overview')} />
        <section className="obs-about-profile" hidden={section !== 'about'} aria-labelledby="about-title">
          <p className="obs-eyebrow obs-mono"><span />ABOUT / SINGAPORE</p>
          <h1 id="about-title">I'm Hanyu.<br /><span>I learn by building.</span></h1>
          <div className="obs-about-prose">
            <p>I'm a data scientist and applied AI builder in Singapore. I learn by making things: an agent, a data tool, a better way to understand a game.</p>
            <p>Each project opens another question: agent runtimes, shipping ML, programmable finance. I keep practicing the fundamentals and following the questions that make me curious.</p>
            <p>I'm a mental health advocate, and I live with generalized anxiety disorder (GAD) and ADHD. I'd be happy to collaborate on mental health-related projects.</p>
            <p>I'm also a proud community ambassador for <a className="obs-adal-link" href="https://adalagent.ai/" target="_blank" rel="noreferrer"><img src="/adal-icon-pink.svg" width="24" height="24" alt="" />AdaL</a>.</p>
          </div>
          <section className="obs-about-skills" aria-labelledby="about-skills-title">
            <h2 id="about-skills-title">Skills &amp; toolkit.</h2>
            <ol className="obs-capabilities">
              <li>
                <span className="obs-capability-number" aria-hidden="true">01</span>
                <h3>AI agents <br />&amp; evaluation</h3>
                <div>
                  <p>Agent runtimes, multi-agent workflows, memory and tool use, with evaluation harnesses, tracing and guardrails.</p>
                  <div className="obs-capability-evidence">
                    <a href="#experience" onClick={event => navigate('experience', event)}>Manufacturing diagnostics <ArrowUpRight size={14} aria-hidden="true" /></a>
                    <a href="https://github.com/whanyu1212/Wisp" target="_blank" rel="noreferrer">Wisp <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </li>
              <li>
                <span className="obs-capability-number" aria-hidden="true">02</span>
                <h3>Applied AI <br />&amp; statistics</h3>
                <div>
                  <p>Machine learning, deep learning, NLP, retrieval-augmented generation and causal inference. Interpretable models shaped by real operational problems.</p>
                  <div className="obs-capability-evidence">
                    <a href="#experience" onClick={event => navigate('experience', event)}>Manufacturing, tourism &amp; education <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </li>
              <li>
                <span className="obs-capability-number" aria-hidden="true">03</span>
                <h3>Software <br />&amp; production delivery</h3>
                <div>
                  <p>APIs, data pipelines, CI/CD and user-facing applications. Taking a working prototype through deployment and into everyday use.</p>
                  <div className="obs-capability-evidence">
                    <a href="https://github.com/whanyu1212/shipping-ml" target="_blank" rel="noreferrer">Shipping ML <ArrowUpRight size={14} aria-hidden="true" /></a>
                    <a href="#experience" onClick={event => navigate('experience', event)}>Global manufacturing monitoring <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </li>
              <li>
                <span className="obs-capability-number" aria-hidden="true">04</span>
                <h3>Technical <br />communication</h3>
                <div>
                  <p>Technical writing, public speaking and collaboration with domain experts. Sharing agent engineering knowledge in English and Mandarin.</p>
                  <div className="obs-capability-evidence">
                    <a href="https://github.com/bojieli/ai-agent-book" target="_blank" rel="noreferrer">AI Agent Book <ArrowUpRight size={14} aria-hidden="true" /></a>
                    <a href="https://adalagent.ai/" target="_blank" rel="noreferrer"><img className="obs-adal-icon" src="/adal-icon-pink.svg" width="20" height="20" alt="" />AdaL community ambassador <ArrowUpRight size={14} aria-hidden="true" /></a>
                  </div>
                </div>
              </li>
            </ol>
            <dl className="obs-toolkit">
              <div><dt>Languages</dt><dd>Python <span>·</span> TypeScript <span>·</span> Julia <span>·</span> SQL <span>·</span> Rust</dd></div>
              <div><dt>Agents &amp; ML</dt><dd>OpenAI Agents SDK <span>·</span> Google ADK <span>·</span> LangChain <span>·</span> MCP <span>·</span> PyTorch <span>·</span> scikit-learn</dd></div>
              <div><dt>Building &amp; shipping</dt><dd>FastAPI <span>·</span> Angular <span>·</span> GCP <span>·</span> CI/CD <span>·</span> Git</dd></div>
            </dl>
          </section>
          <section className="obs-about-contact" aria-labelledby="about-contact-title">
            <h2 id="about-contact-title">Let's connect.</h2>
            <a className="obs-about-email" href="mailto:whanyu47@gmail.com"><Mail size={21} aria-hidden="true" /><span>whanyu47@gmail.com</span><ArrowUpRight size={19} aria-hidden="true" /></a>
            <div className="obs-about-socials">
              <a href="https://www.linkedin.com/in/hanyu-wu-6a610b165" target="_blank" rel="noreferrer"><Contact size={19} aria-hidden="true" /><span>LinkedIn<small>Hanyu Wu</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
              <a href="https://github.com/whanyu1212" target="_blank" rel="noreferrer"><GitBranch size={19} aria-hidden="true" /><span>GitHub<small>@whanyu1212</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
              <a href="https://x.com/queryverse_hy" target="_blank" rel="noreferrer"><span className="obs-x-mark" aria-hidden="true">𝕏</span><span>X<small>@queryverse_hy</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
              <a href="https://www.rednote.com/user/profile/61a7a038000000001000e248" target="_blank" rel="noreferrer" aria-label="Rednote (小红书): Queryverse"><BookOpen size={19} aria-hidden="true" /><span>Rednote<small>Queryverse</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </section>
        </section>
        </div>

        {section === 'overview' && <OpenSource motionEnabled={motionEnabled} journey={overviewJourney} />}

      </main>

      <footer className="obs-footer"><span className="obs-mono">HANYU WU <span className="obs-footer-slash">/</span> STILL CURIOUS. STILL BUILDING.</span>
        <div className="obs-environments" aria-label="Visual environment"><span className="obs-mono">SPECTRUM</span>{([{id:'orbital',label:'Observatory'}, {id:'signal',label:'Signal'}, {id:'blueprint',label:'Blueprint'}] as const).map(item => <button key={item.id} type="button" className={`obs-swatch obs-swatch-${item.id}`} aria-label={`${item.label} environment`} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}><span /></button>)}</div>
        <a className="obs-footer-contact obs-mono" href="mailto:whanyu47@gmail.com">LET'S CONNECT <ArrowUpRight size={14} /></a>
      </footer>
      <Desktop /><Dock />
      {projectPanel && <ProjectPanel projectId={projectPanel} mapImage={mapImage} motionEnabled={motionEnabled} onClose={() => setProjectPanel(null)} onReadNotes={revealProject} />}
      {notesProject && <FieldNotesPanel projectId={notesProject} projectImage={projectImage} motionEnabled={motionEnabled} onClose={() => setNotesProject(null)} />}
    </div>
  );
}
