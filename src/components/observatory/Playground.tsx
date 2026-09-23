import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Compass, Flag, Lock, MousePointer2, Move, Pause, Play, Route, X } from 'lucide-react';
import { projects, type ProjectId, type PublicProjectId } from './curiosity';
import { describePush, type RepoStatsMap } from '@/lib/repoStats';
import { scrollExitProgress } from './scrollExit';
import { singaporeClock } from './localTime';
import { $auroraUnlocked, $cometCatches, recordAllCharted, recordCometCatch } from '@/stores/progressStore';
import '@/styles/playground.css';

const ExplorationScene = lazy(() => import('./ExplorationScene').then(module => ({ default: module.ExplorationScene })));
const projectIds = Object.keys(projects) as ProjectId[];
const publicIds = projectIds.filter(id => !projects[id].secret);
const secretIds = projectIds.filter(id => projects[id].secret);
const FOUND_KEY = 'hanyu:found';
const CHARTED_KEY = 'hanyu:charted';
/** The autopilot tour: four islands that show the range of the work, in order. */
export const TOUR_STOPS: PublicProjectId[] = ['gem-dota', 'quantrl', 'wisp', 'opencouch'];
/** How long the tour lingers at each island before flying on, in milliseconds. */
const TOUR_DWELL = 9000;

/** A request from outside the world, such as the command menu: each new `seq` runs once. */
export type WorldRequest = { kind: 'fly'; id: ProjectId } | { kind: 'tour' };
export type WorldCommand = WorldRequest & { seq: number };

interface Props {
  repoStats: RepoStatsMap;
  panelProject: ProjectId | null;
  active: boolean;
  motionEnabled: boolean;
  onToggleMotion: () => void;
  onViewProject: (id: ProjectId) => void;
  command: WorldCommand | null;
}

export function Playground({ repoStats, panelProject, active, motionEnabled, onToggleMotion, onViewProject, command }: Props) {
  const [destination, setDestination] = useState<ProjectId | null>(null);
  const [navigationRequest, setNavigationRequest] = useState(0);
  const [arrived, setArrived] = useState<ProjectId | null>(null);
  // The explorer's logbook: islands charted on this or earlier visits.
  const [discovered, setDiscovered] = useState<ProjectId[]>([]);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(CHARTED_KEY) ?? '[]');
      if (Array.isArray(saved)) setDiscovered(publicIds.filter(id => saved.includes(id)));
    } catch { /* Without storage, the logbook starts fresh each visit. */ }
  }, []);
  // Hanyu's time in Singapore, refreshed every half minute; client-only to avoid a hydration mismatch.
  const [clock, setClock] = useState<ReturnType<typeof singaporeClock> | null>(null);
  useEffect(() => {
    const tick = () => setClock(singaporeClock());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  // Secret islands stay found across visits, once a visitor has flown out to them.
  const [found, setFound] = useState<ProjectId[]>([]);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FOUND_KEY) ?? '[]');
      if (Array.isArray(saved)) setFound(secretIds.filter(id => saved.includes(id)));
    } catch { /* Without storage, a secret is found again each visit. */ }
  }, []);
  // Once the universe has receded below the fold, a star in the corner leads back to it.
  const [receded, setReceded] = useState(false);
  useEffect(() => {
    if (!active) { setReceded(false); return; }
    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      setReceded(scrollExitProgress(section).progress > 0.85);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [active]);
  const hiddenProjects = useMemo(() => secretIds.filter(id => !found.includes(id)), [found]);
  const listedIds = projectIds.filter(id => !hiddenProjects.includes(id));
  const charted = useMemo(() => [...discovered, ...found], [discovered, found]);
  const chartedCount = discovered.filter(id => publicIds.includes(id)).length;

  // A short message for catches, misses and unlocks; one at a time.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const tippedRef = useRef(false);
  const cometCaught = () => {
    const hadAurora = $auroraUnlocked.get();
    const catches = recordCometCatch();
    setToast(catches === 1 && !hadAurora ? 'Comet caught · 1 of 3. Aurora unlocked: find it under Spectrum.'
      : catches === 3 ? 'Comet caught · 3 of 3. Your wake now burns comet-blue.'
        : catches < 3 ? `Comet caught · ${catches} of 3`
          : `Comet caught · ${catches} so far`);
  };
  const cometMissed = () => {
    if (tippedRef.current || $cometCatches.get() > 0) return;
    tippedRef.current = true;
    // Touch screens have no Shift key; point them at the tap instead.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    setToast(touch ? 'The comet got away. Tap the next one to give chase.' : 'The comet got away. Hold Shift to boost, or tap the comet to give chase.');
  };
  // Charting every island also unlocks Aurora, so visitors with motion paused can earn it.
  useEffect(() => {
    if (chartedCount < publicIds.length) return;
    const hadAurora = $auroraUnlocked.get();
    recordAllCharted();
    if (!hadAurora) setToast('Every island charted. Aurora unlocked: find it under Spectrum.');
  }, [chartedCount]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const previousPanel = useRef(panelProject);
  // The autopilot tour: which stop it is flying to or lingering at, and whether it is paused.
  const [tour, setTour] = useState<{ stop: number; paused: boolean } | null>(null);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const tourStop = tour ? TOUR_STOPS[tour.stop] : null;
  const leaveProject = () => {
    setArrived(null);
    setDestination(null);
    setTour(null);
  };
  const returnToWorld = () => {
    leaveProject();
    sectionRef.current?.querySelector<HTMLCanvasElement>('canvas')?.focus({ preventScroll: true });
  };
  useEffect(() => {
    // Closing the project panel mid-tour returns to the tour, which carries on from this stop.
    if (previousPanel.current && !panelProject && active && !tourRef.current) returnToWorld();
    previousPanel.current = panelProject;
  }, [panelProject, active]);
  useEffect(() => {
    if (!active) { setArrived(null); setMenuOpen(false); setTour(null); }
  }, [active]);
  const flyTo = (id: ProjectId) => {
    setArrived(null);
    setDestination(id);
    setNavigationRequest(value => value + 1);
    setMenuOpen(false);
  };
  // Choosing an island yourself takes over from the autopilot.
  const go = (id: ProjectId) => {
    setTour(null);
    flyTo(id);
  };
  const startTour = () => {
    setTour({ stop: 0, paused: false });
    flyTo(TOUR_STOPS[0]);
  };
  const advanceTour = () => {
    const current = tourRef.current;
    if (!current) return;
    const next = current.stop + 1;
    if (next < TOUR_STOPS.length) {
      setTour({ stop: next, paused: false });
      flyTo(TOUR_STOPS[next]);
      return;
    }
    setTour(null);
    const remaining = publicIds.filter(id => !discovered.includes(id)).length;
    setToast(remaining ? `That's the tour. ${remaining} more ${remaining === 1 ? 'island is' : 'islands are'} out there to find.` : "That's the tour, and every island is charted.");
  };
  const advanceRef = useRef(advanceTour);
  advanceRef.current = advanceTour;
  // Linger at each stop while its card is readable: not while paused, reading
  // the project panel, or scrolled away. Pausing keeps the time already spent.
  // With motion paused nothing moves on by itself; the visitor steps through with Next stop.
  const dwellLeft = useRef(TOUR_DWELL);
  useEffect(() => { dwellLeft.current = TOUR_DWELL; }, [tour?.stop]);
  const dwelling = Boolean(tour && motionEnabled && !tour.paused && arrived === tourStop && !panelProject && !receded);
  useEffect(() => {
    if (!dwelling) return;
    const started = performance.now();
    const timer = window.setTimeout(() => advanceRef.current(), dwellLeft.current);
    return () => {
      window.clearTimeout(timer);
      dwellLeft.current = Math.max(0, dwellLeft.current - (performance.now() - started));
    };
  }, [dwelling]);
  const inTransit = Boolean(tour && arrived !== tourStop);
  // Commands from the menu arrive with a fresh sequence number; bring the world into view first.
  useEffect(() => {
    if (!command) return;
    if (window.scrollY > 40) window.scrollTo({ top: 0, behavior: motionEnabled ? 'smooth' : 'auto' });
    if (command.kind === 'tour') startTour();
    else go(command.id);
  }, [command?.seq]);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menuOpen]);
  const arrive = (id: ProjectId) => {
    // Arriving somewhere off the tour's route means the visitor has taken the controls.
    if (tourRef.current && id !== TOUR_STOPS[tourRef.current.stop]) setTour(null);
    if (projects[id].secret && !found.includes(id)) {
      const next = [...found, id];
      setFound(next);
      try { localStorage.setItem(FOUND_KEY, JSON.stringify(next)); } catch { /* Found for this visit only. */ }
    }
    setArrived(id);
    setDestination(null);
    // The scene plays the island's own arrival phrase.
    setDiscovered(previous => {
      if (previous.includes(id) || projects[id].secret) return previous;
      const next = [...previous, id];
      try { localStorage.setItem(CHARTED_KEY, JSON.stringify(next)); } catch { /* Charted for this visit only. */ }
      return next;
    });
  };
  const project = arrived ? projects[arrived] : null;
  const onTour = tour !== null && arrived === tourStop;

  return <section ref={sectionRef} className="playground" aria-label="Explore Hanyu's world" data-ready={ready}>
    <div className="playground-intro">
      <p className="obs-mono playground-kicker"><span /> HANYU'S SMALL UNIVERSE</p>
      <h1>Follow your<br /><span>curiosity.</span></h1>
      <p>I'm Hanyu. An AI builder, data scientist,<br className="playground-desktop-break" /> and open-source contributor.</p>
      {clock && <p className="playground-clock obs-mono" data-night={clock.daylight < 0.5}><span aria-hidden="true" /><span>{clock.time} in Singapore<span className="playground-clock-mood"> · {clock.mood}</span></span></p>}
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
        <ExplorationScene destination={destination} selectedProject={arrived} detailProject={panelProject} hiddenProjects={hiddenProjects} repoStats={repoStats} charted={charted} daylight={clock?.daylight ?? 1} onCometCaught={cometCaught} onCometMissed={cometMissed} touring={Boolean(tour)} navigationRequest={navigationRequest} motionEnabled={motionEnabled} onArrive={arrive} onDepart={leaveProject} onReady={() => setReady(true)} />
      </Suspense>
    </div>

    <div className="playground-bottom">
      <div className="playground-actions">
        <span className="playground-logbook obs-mono" data-complete={chartedCount === publicIds.length} aria-label={`${chartedCount} of ${publicIds.length} islands charted`}>
          <span className="playground-logbook-bar" aria-hidden="true"><i style={{ width: `${chartedCount / publicIds.length * 100}%` }} /></span>
          {chartedCount === publicIds.length ? 'ALL ISLANDS CHARTED' : `${String(chartedCount).padStart(2, '0')}/${publicIds.length} CHARTED`}
        </span>
        <button className="playground-tour-button" onClick={tour ? leaveProject : startTour} aria-pressed={Boolean(tour)}><Route size={14} aria-hidden="true" />{tour ? 'End tour' : <><span className="playground-tour-full">Take the tour<span className="playground-tour-length"> · 1 min</span></span><span className="playground-tour-short">Tour</span></>}</button>
        <button ref={menuButton} aria-expanded={menuOpen} aria-controls="world-project-menu" onClick={() => setMenuOpen(value => !value)}><Compass size={14} /> Featured projects <span className="obs-mono playground-count-total">{String(listedIds.length).padStart(2, '0')}</span><span className="obs-mono playground-count-charted" aria-hidden="true">{chartedCount}/{publicIds.length}</span></button>
        <button onClick={onToggleMotion} aria-label={motionEnabled ? 'Pause motion' : 'Enable motion'} aria-pressed={motionEnabled}>{motionEnabled ? <Pause size={14} /> : <Play size={14} />}<span className="playground-motion-label">{motionEnabled ? 'Pause motion' : 'Enable motion'}</span></button>
      </div>
    </div>

    {menuOpen && <div ref={menuRef} id="world-project-menu" className="playground-menu" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>
      <div className="playground-menu-heading obs-mono">FEATURED PROJECTS<button aria-label="Close project menu" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }}><X size={16} /></button></div>
      {listedIds.map(id => <button key={id} data-project={id} onClick={() => { go(id); menuButton.current?.focus(); }}><span className="obs-mono">{String(projectIds.indexOf(id) + 1).padStart(2, '0')}</span><span>{projects[id].name}{projects[id].secret && <em className="playground-menu-private"> · private</em>}</span>{discovered.includes(id) ? <Check size={14} aria-label="Discovered" /> : <ArrowUpRight size={14} />}</button>)}
    </div>}

    <button className="playground-return" data-visible={receded} tabIndex={receded ? 0 : -1} aria-hidden={!receded}
      aria-label="Back to the universe" title="Back to the universe"
      onClick={() => sectionRef.current?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' })}>
      <span aria-hidden="true" />
    </button>
    <p className="playground-toast obs-mono" role="status" aria-live="polite" data-visible={Boolean(toast) && !inTransit}>{toast}</p>
    {tour && inTransit && <div className="playground-tour-status obs-mono">
      <span>TOUR · {tour.stop + 1} OF {TOUR_STOPS.length}</span><span className="playground-tour-heading">Flying to {projects[TOUR_STOPS[tour.stop]].name}</span>
      <button onClick={leaveProject}>End tour</button>
    </div>}
    <div className="playground-announcement" role="status" aria-live="polite">{arrived ? (projects[arrived].secret
      ? `Discovered ${projects[arrived].name}, a private project still in progress.`
      : `Discovered ${projects[arrived].name}. ${chartedCount} of ${publicIds.length} islands charted.`) : destination ? `${tour ? `Tour stop ${tour.stop + 1} of ${TOUR_STOPS.length}. ` : ''}Travelling to ${projects[destination].name}.` : ''}</div>
    {project && arrived && <aside className="playground-discovery" aria-label={`${project.name} discovery`}>
      <div className="playground-discovery-top">{onTour
        ? <span className="obs-mono"><Route size={12} /> TOUR · {tour.stop + 1} OF {TOUR_STOPS.length}</span>
        : project.secret
          ? <span className="obs-mono playground-private"><Lock size={12} /> PRIVATE · IN PROGRESS</span>
          : <span className="obs-mono"><Flag size={12} /> PROJECT DISCOVERED</span>}<button aria-label={onTour ? 'End tour' : 'Close discovery'} onClick={returnToWorld}><X size={17} /></button></div>
      {onTour && motionEnabled && <span className="playground-tour-progress" data-running={dwelling} aria-hidden="true"><i key={tour.stop} style={{ animationDuration: `${TOUR_DWELL}ms` }} /></span>}
      {project.secret && <p className="playground-secret-note">You found something I haven't shipped yet.</p>}
      <h2>{project.name}</h2><p className="playground-question">{project.question}</p>
      <p className="playground-description">{project.description}</p>
      {repoStats[arrived] && <p className="playground-stats obs-mono">
        {repoStats[arrived]!.stars > 0 && <span className="playground-stars">★ {repoStats[arrived]!.stars}</span>}
        <span>{repoStats[arrived]!.openIssues} open {repoStats[arrived]!.openIssues === 1 ? 'issue' : 'issues'}</span>
        <span>pushed {describePush(repoStats[arrived]!.pushedAt)}</span>
      </p>}
      <div className="playground-discovery-actions">
        {project.secret
          // Private work has no repository to show; the way in is a conversation.
          ? <a className="playground-primary" href={`mailto:whanyu47@gmail.com?subject=${encodeURIComponent(project.name)}`}>Ask me about it <ArrowUpRight size={14} /></a>
          : <button className="playground-primary" onClick={() => onViewProject(arrived)}>Explore the project <ArrowUpRight size={14} /></button>}
        {onTour && <>
          {motionEnabled && <button onClick={() => setTour({ ...tour, paused: !tour.paused })} aria-pressed={tour.paused}>{tour.paused ? <Play size={13} /> : <Pause size={13} />}{tour.paused ? 'Resume' : 'Pause'}</button>}
          <button onClick={advanceTour}>{tour.stop + 1 < TOUR_STOPS.length ? 'Next stop' : 'Finish'} <ArrowRight size={13} /></button>
        </>}
      </div>
    </aside>}
  </section>;
}
