import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Compass, Flag, Move, Pause, Play, X } from 'lucide-react';
import { projects, type ProjectId } from './curiosity';
import '@/styles/playground.css';

const ExplorationScene = lazy(() => import('./ExplorationScene').then(module => ({ default: module.ExplorationScene })));
const projectIds = Object.keys(projects) as ProjectId[];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const previousPanel = useRef(panelProject);
  const returnToWorld = () => {
    setArrived(null);
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

    <div className="playground-world">
      <Suspense fallback={<div className="playground-loading" role="status">Assembling a little universe…</div>}>
        <ExplorationScene destination={destination} selectedProject={arrived} detailProject={panelProject} navigationRequest={navigationRequest} motionEnabled={motionEnabled} onArrive={arrive} onReady={() => setReady(true)} />
      </Suspense>
    </div>

    <div className="playground-bottom">
      <div className="playground-controls"><Move size={22} aria-hidden="true" /><div><strong><span className="playground-orbit-hint">Drag to orbit</span><span className="playground-touch-hint">Swipe to scroll</span></strong><span className="playground-orbit-hint">Scroll the page · Ctrl + scroll to zoom</span><span className="playground-touch-hint">Pinch to zoom · Tap a project to visit</span></div><span className="playground-key-hint"><kbd>W A S D</kbd> to pilot</span></div>
      <div className="playground-actions">
        <button ref={menuButton} aria-expanded={menuOpen} aria-controls="world-project-menu" onClick={() => setMenuOpen(value => !value)}><Compass size={14} /> Featured projects <span className="obs-mono">{String(projectIds.length).padStart(2, '0')}</span></button>
        <button onClick={onToggleMotion} aria-label={motionEnabled ? 'Pause motion' : 'Enable motion'} aria-pressed={motionEnabled}>{motionEnabled ? <Pause size={14} /> : <Play size={14} />}<span className="playground-motion-label">{motionEnabled ? 'Pause motion' : 'Enable motion'}</span></button>
      </div>
    </div>

    {menuOpen && <div ref={menuRef} id="world-project-menu" className="playground-menu" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>
      <div className="playground-menu-heading obs-mono">FEATURED PROJECTS<button aria-label="Close project menu" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }}><X size={16} /></button></div>
      {projectIds.map((id, index) => <button key={id} data-project={id} onClick={() => { go(id); menuButton.current?.focus(); }}><span className="obs-mono">{String(index + 1).padStart(2, '0')}</span><span>{projects[id].name}</span>{discovered.includes(id) ? <Check size={14} aria-label="Discovered" /> : <ArrowUpRight size={14} />}</button>)}
    </div>}

    <div className="playground-announcement" role="status" aria-live="polite">{arrived ? `Discovered ${projects[arrived].name}. ${discovered.length} of ${projectIds.length} featured projects explored.` : destination ? `Travelling to ${projects[destination].name}.` : ''}</div>
    {project && arrived && <aside className="playground-discovery" aria-label={`${project.name} discovery`}>
      <div className="playground-discovery-top"><span className="obs-mono"><Flag size={12} /> PROJECT DISCOVERED</span><button aria-label="Close discovery" onClick={returnToWorld}><X size={17} /></button></div>
      <h2>{project.name}</h2><p className="playground-question">{project.question}</p>
      <p className="playground-description">{project.description}</p>
      <div className="playground-discovery-actions">
        <button className="playground-primary" onClick={() => onViewProject(arrived)}>Explore the project <ArrowUpRight size={14} /></button>
      </div>
    </aside>}
  </section>;
}
