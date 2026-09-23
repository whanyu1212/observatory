import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Compass, Flag, Lock, MousePointer2, Move, Pause, Play, X } from 'lucide-react';
import { projects, type ProjectId } from './curiosity';
import '@/styles/playground.css';

const ExplorationScene = lazy(() => import('./ExplorationScene').then(module => ({ default: module.ExplorationScene })));
const projectIds = Object.keys(projects) as ProjectId[];
const publicIds = projectIds.filter(id => !projects[id].secret);
const secretIds = projectIds.filter(id => projects[id].secret);
const FOUND_KEY = 'hanyu:found';

interface Props {
  panelProject: ProjectId | null;
  active: boolean;
  motionEnabled: boolean;
  onToggleMotion: () => void;
  onSelect: () => void;
  onViewProject: (id: ProjectId) => void;
}

export function Playground({ panelProject, active, motionEnabled, onToggleMotion, onSelect, onViewProject }: Props) {
  const [destination, setDestination] = useState<ProjectId | null>(null);
  const [navigationRequest, setNavigationRequest] = useState(0);
  const [arrived, setArrived] = useState<ProjectId | null>(null);
  const [discovered, setDiscovered] = useState<ProjectId[]>([]);
  // Secret islands stay found across visits, once a visitor has flown out to them.
  const [found, setFound] = useState<ProjectId[]>([]);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FOUND_KEY) ?? '[]');
      if (Array.isArray(saved)) setFound(secretIds.filter(id => saved.includes(id)));
    } catch { /* Without storage, a secret is found again each visit. */ }
  }, []);
  const hiddenProjects = useMemo(() => secretIds.filter(id => !found.includes(id)), [found]);
  const listedIds = projectIds.filter(id => !hiddenProjects.includes(id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const previousPanel = useRef(panelProject);
  const leaveProject = () => {
    setArrived(null);
    setDestination(null);
  };
  const returnToWorld = () => {
    leaveProject();
    sectionRef.current?.querySelector<HTMLCanvasElement>('canvas')?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (previousPanel.current && !panelProject && active) returnToWorld();
    previousPanel.current = panelProject;
  }, [panelProject, active]);
  useEffect(() => {
    if (!active) { setArrived(null); setMenuOpen(false); }
  }, [active]);
  const go = (id: ProjectId) => {
    setArrived(null);
    setDestination(id);
    setNavigationRequest(value => value + 1);
    setMenuOpen(false);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menuOpen]);
  const arrive = (id: ProjectId) => {
    if (projects[id].secret && !found.includes(id)) {
      const next = [...found, id];
      setFound(next);
      try { localStorage.setItem(FOUND_KEY, JSON.stringify(next)); } catch { /* Found for this visit only. */ }
    }
    setArrived(id);
    setDestination(null);
    setDiscovered(previous => previous.includes(id) ? previous : [...previous, id]);
    onSelect();
  };
  const project = arrived ? projects[arrived] : null;

  return <section ref={sectionRef} className="playground" aria-label="Explore Hanyu's world" data-ready={ready}>
    <div className="playground-intro">
      <p className="obs-mono playground-kicker"><span /> HANYU'S SMALL UNIVERSE</p>
      <h1>Follow your<br /><span>curiosity.</span></h1>
      <p>I'm Hanyu. An AI builder, data scientist,<br className="playground-desktop-break" /> and open-source contributor.</p>
    </div>

    <aside className="playground-controls" aria-label="How to explore the universe">
      <strong><MousePointer2 size={16} aria-hidden="true" /><span className="playground-orbit-hint">Click an island to explore</span><span className="playground-touch-hint">Tap an island to explore</span></strong>
      <div className="playground-control-shortcuts playground-orbit-hint">
        <span><Move size={14} aria-hidden="true" /> Drag to orbit</span>
        <span><kbd>W A S D</kbd> fly <kbd>Shift</kbd> boost</span>
      </div>
      <p className="playground-orbit-hint"><kbd>Ctrl</kbd> + scroll to zoom <span aria-hidden="true">·</span> Scroll to read</p>
      <p className="playground-touch-hint">Pinch to zoom <span aria-hidden="true">·</span> Swipe to scroll</p>
    </aside>

    <div className="playground-world">
      <Suspense fallback={<div className="playground-loading" role="status">Assembling a little universe…</div>}>
        <ExplorationScene destination={destination} selectedProject={arrived} detailProject={panelProject} hiddenProjects={hiddenProjects} navigationRequest={navigationRequest} motionEnabled={motionEnabled} onArrive={arrive} onDepart={leaveProject} onReady={() => setReady(true)} />
      </Suspense>
    </div>

    <div className="playground-bottom">
      <div className="playground-actions">
        <button ref={menuButton} aria-expanded={menuOpen} aria-controls="world-project-menu" onClick={() => setMenuOpen(value => !value)}><Compass size={14} /> Featured projects <span className="obs-mono">{String(listedIds.length).padStart(2, '0')}</span></button>
        <button onClick={onToggleMotion} aria-label={motionEnabled ? 'Pause motion' : 'Enable motion'} aria-pressed={motionEnabled}>{motionEnabled ? <Pause size={14} /> : <Play size={14} />}<span className="playground-motion-label">{motionEnabled ? 'Pause motion' : 'Enable motion'}</span></button>
      </div>
    </div>

    {menuOpen && <div ref={menuRef} id="world-project-menu" className="playground-menu" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>
      <div className="playground-menu-heading obs-mono">FEATURED PROJECTS<button aria-label="Close project menu" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }}><X size={16} /></button></div>
      {listedIds.map(id => <button key={id} data-project={id} onClick={() => { go(id); menuButton.current?.focus(); }}><span className="obs-mono">{String(projectIds.indexOf(id) + 1).padStart(2, '0')}</span><span>{projects[id].name}{projects[id].secret && <em className="playground-menu-private"> · private</em>}</span>{discovered.includes(id) ? <Check size={14} aria-label="Discovered" /> : <ArrowUpRight size={14} />}</button>)}
    </div>}

    <div className="playground-announcement" role="status" aria-live="polite">{arrived ? (projects[arrived].secret
      ? `Discovered ${projects[arrived].name}, a private project still in progress.`
      : `Discovered ${projects[arrived].name}. ${discovered.filter(id => publicIds.includes(id)).length} of ${publicIds.length} featured projects explored.`) : destination ? `Travelling to ${projects[destination].name}.` : ''}</div>
    {project && arrived && <aside className="playground-discovery" aria-label={`${project.name} discovery`}>
      <div className="playground-discovery-top">{project.secret
        ? <span className="obs-mono playground-private"><Lock size={12} /> PRIVATE · IN PROGRESS</span>
        : <span className="obs-mono"><Flag size={12} /> PROJECT DISCOVERED</span>}<button aria-label="Close discovery" onClick={returnToWorld}><X size={17} /></button></div>
      {project.secret && <p className="playground-secret-note">You found something I haven't shipped yet.</p>}
      <h2>{project.name}</h2><p className="playground-question">{project.question}</p>
      <p className="playground-description">{project.description}</p>
      <div className="playground-discovery-actions">
        {project.secret
          // Private work has no repository to show; the way in is a conversation.
          ? <a className="playground-primary" href={`mailto:whanyu47@gmail.com?subject=${encodeURIComponent(project.name)}`}>Ask me about it <ArrowUpRight size={14} /></a>
          : <button className="playground-primary" onClick={() => onViewProject(arrived)}>Explore the project <ArrowUpRight size={14} /></button>}
      </div>
    </aside>}
  </section>;
}
