import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { ArrowUpRight, AtSign, AudioLines, BookOpen, Briefcase, Copy, GitBranch, Home, Mail, MapPin, Palette, Pause, Play, Route, Search, User, Volume2, VolumeX } from 'lucide-react';
import { $audioEnabled, $theme } from '@/stores/osStore';
import { $auroraUnlocked, loadProgress } from '@/stores/progressStore';
import { soundEffects } from '@/components/effects/AudioEngine';
import { Playground, TOUR_STOPS, type WorldCommand, type WorldRequest } from './Playground';
import { CommandPalette, type Command } from './CommandPalette';
import { BackgroundStars } from './BackgroundStars';
import { MeteorShower } from './MeteorShower';
import { OpenSource } from './OpenSource';
import { ProjectPanel } from './ProjectPanel';
import { projects, trails, type ProjectId } from './curiosity';
import type { RepoStatsMap } from '@/lib/repoStats';

const ExperiencePage = lazy(() => import('./ExperiencePage').then(module => ({ default: module.ExperiencePage })));
const AboutPage = lazy(() => import('./AboutPage').then(module => ({ default: module.AboutPage })));

type Section = 'overview' | 'experience' | 'about';
type Direction = 'orbital' | 'signal' | 'blueprint' | 'aurora';
const DIRECTIONS: Array<{ id: Direction; label: string }> = [{ id: 'orbital', label: 'Observatory' }, { id: 'signal', label: 'Signal' }, { id: 'blueprint', label: 'Blueprint' }, { id: 'aurora', label: 'Aurora' }];
const EMAIL = 'whanyu47@gmail.com';
const LINKS = [
  { id: 'github', label: 'GitHub', hint: '@whanyu1212', href: 'https://github.com/whanyu1212', icon: <GitBranch size={15} /> },
  { id: 'linkedin', label: 'LinkedIn', hint: 'Hanyu Wu', href: 'https://www.linkedin.com/in/hanyu-wu-6a610b165', icon: <User size={15} /> },
  { id: 'x', label: 'X', hint: '@queryverse_hy', href: 'https://x.com/queryverse_hy', icon: <AtSign size={15} /> },
];

function SectionLoading({ label }: { label: string }) {
  return <div className="obs-section-loading obs-mono" role="status">Loading {label}…</div>;
}

export function Observatory({ repoStats = {} }: { repoStats?: RepoStatsMap }) {
  const [section, setSection] = useState<Section>('overview');
  const [direction, setDirection] = useState<Direction>('orbital');
  const [projectPanel, setProjectPanel] = useState<ProjectId | null>(null);
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [worldCommand, setWorldCommand] = useState<WorldCommand | null>(null);
  const [modifierKey, setModifierKey] = useState('⌘');
  const audioOn = useStore($audioEnabled);
  const auroraUnlocked = useStore($auroraUnlocked);
  useEffect(() => { loadProgress(); }, []);
  const contentRef = useRef<HTMLDivElement>(null);
  const motionEnabled = motionChoice ?? !reducedMotion;
  const backgroundMotionEnabled = motionEnabled && projectPanel === null;
  const toggleMotion = () => {
    const next = !motionEnabled;
    setMotionChoice(next);
    try { localStorage.setItem('hanyu:motion', next ? 'on' : 'off'); } catch { /* The control still works when storage is unavailable. */ }
  };

  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('hanyu:audio');
      if (savedAudio === 'on' || savedAudio === 'off') $audioEnabled.set(savedAudio === 'on');
    } catch { /* Keep sound enabled by default when storage is unavailable. */ }
    soundEffects.attachAmbientOnFirstInteraction();

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

  // Cmd+K on a Mac, Ctrl+K elsewhere, from anywhere on the page.
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setModifierKey('Ctrl ');
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.title = section === 'overview' ? 'Hanyu Wu — The Observatory' : `${section[0].toUpperCase() + section.slice(1)} — Hanyu Wu`;
  }, [section]);

  useEffect(() => {
    const theme = direction === 'signal' ? 'ultraviolet' : direction === 'blueprint' ? 'polar' : direction === 'aurora' ? 'aurora' : 'observatory';
    document.documentElement.dataset.theme = theme;
    $theme.set(theme);
  }, [direction]);

  const navigate = (next: Section, event?: React.MouseEvent) => {
    event?.preventDefault();
    setSection(next);
    setProjectPanel(null);
    window.history.pushState(null, '', `#${next}`);
    soundEffects.playBlip(680, .04);
    contentRef.current?.focus({ preventScroll: true });
  };

  const toggleAudio = () => {
    const next = !audioOn;
    $audioEnabled.set(next);
    try { localStorage.setItem('hanyu:audio', next ? 'on' : 'off'); } catch { /* The control still works when storage is unavailable. */ }
    if (next) { soundEffects.startAmbientHum(); soundEffects.playEngage(); }
    else soundEffects.stopAmbientHum();
  };

  const playProjectSound = () => {
    soundEffects.playBlip(740, .04);
  };

  const openProject = (id: ProjectId) => {
    playProjectSound();
    setProjectPanel(id);
  };

  // Everything the command menu can do. Flights and the tour switch to the
  // overview first, since the world lives there.
  const sendToWorld = (request: WorldRequest) => {
    if (section !== 'overview') navigate('overview');
    setProjectPanel(null);
    setWorldCommand(previous => ({ ...request, seq: (previous?.seq ?? 0) + 1 }));
  };
  const commands = useMemo<Command[]>(() => {
    let charted: string[] = [];
    try { charted = JSON.parse(localStorage.getItem('hanyu:charted') ?? '[]'); } catch { /* Unmarked without storage. */ }
    const islands = (Object.keys(projects) as ProjectId[]).filter(id => !projects[id].secret);
    return [
      { id: 'tour', group: 'Tour', label: 'Take the tour', hint: `${TOUR_STOPS.length} islands, about a minute`, keywords: ['autopilot', 'guide', 'show me'], icon: <Route size={15} />, run: () => sendToWorld({ kind: 'tour' }) },
      ...islands.map((id): Command => ({
        id: `fly-${id}`, group: 'Islands', label: `Fly to ${projects[id].name}`,
        hint: `${projects[id].tagline}${Array.isArray(charted) && charted.includes(id) ? ' · charted' : ''}`,
        keywords: [projects[id].tagline, trails.find(trail => trail.id === projects[id].trail)?.name ?? '', ...projects[id].stack, 'project', 'island'],
        icon: <MapPin size={15} />, run: () => sendToWorld({ kind: 'fly', id }),
      })),
      { id: 'page-overview', group: 'Pages', label: 'Overview', hint: 'The universe', keywords: ['home', 'universe', 'world'], icon: <Home size={15} />, run: () => { navigate('overview'); window.scrollTo({ top: 0 }); } },
      { id: 'page-experience', group: 'Pages', label: 'Experience', hint: 'Work and education', keywords: ['career', 'resume', 'cv', 'work', 'jobs'], icon: <Briefcase size={15} />, run: () => navigate('experience') },
      { id: 'page-about', group: 'Pages', label: 'About', hint: 'Skills and contact', keywords: ['profile', 'skills', 'contact', 'me'], icon: <User size={15} />, run: () => navigate('about') },
      { id: 'page-open-source', group: 'Pages', label: 'Open-source contributions', hint: 'Beyond my own projects', keywords: ['oss', 'pull requests', 'contributions'], icon: <BookOpen size={15} />, run: () => {
        if (section !== 'overview') navigate('overview');
        // The section only exists on the overview, so find it once that has rendered.
        requestAnimationFrame(() => document.getElementById('open-source')?.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'start' }));
      } },
      { id: 'sound', group: 'Settings', label: audioOn ? 'Mute sound' : 'Turn sound on', keywords: ['audio', 'volume', 'music'], icon: audioOn ? <VolumeX size={15} /> : <Volume2 size={15} />, run: toggleAudio },
      { id: 'motion', group: 'Settings', label: motionEnabled ? 'Pause motion' : 'Enable motion', keywords: ['animation', 'reduce', 'still'], icon: motionEnabled ? <Pause size={15} /> : <Play size={15} />, run: toggleMotion },
      ...DIRECTIONS.filter(item => item.id !== 'aurora' || auroraUnlocked).map((item): Command => ({
        id: `theme-${item.id}`, group: 'Settings', label: `Theme: ${item.label}`, hint: direction === item.id ? 'current' : undefined,
        keywords: ['spectrum', 'colour', 'color', 'appearance'], icon: <Palette size={15} />, run: () => setDirection(item.id),
      })),
      { id: 'email', group: 'Contact', label: 'Email Hanyu', hint: EMAIL, keywords: ['mail', 'contact', 'hire', 'reach'], icon: <Mail size={15} />, run: () => { window.location.href = `mailto:${EMAIL}`; } },
      { id: 'copy-email', group: 'Contact', label: 'Copy email address', hint: EMAIL, keywords: ['mail', 'contact', 'clipboard'], icon: <Copy size={15} />, confirm: `Copied ${EMAIL}`, run: () => { void navigator.clipboard?.writeText(EMAIL); } },
      ...LINKS.map((link): Command => ({ id: link.id, group: 'Contact', label: link.label, hint: link.hint, keywords: ['social', 'profile', 'link'], icon: link.icon, run: () => { window.open(link.href, '_blank', 'noopener'); } })),
    ];
    // Rebuilt each time the menu opens, so charted marks and the current settings stay fresh.
  }, [paletteOpen, section, audioOn, motionEnabled, direction, auroraUnlocked]);
  return (
    <div className="observatory" data-direction={direction} data-motion={motionEnabled ? 'on' : 'off'}>
      <BackgroundStars motionEnabled={backgroundMotionEnabled} />
      {section === 'overview' && <BackgroundStars motionEnabled={backgroundMotionEnabled} variant="universe" />}
      <MeteorShower motionEnabled={backgroundMotionEnabled} />
      <a href="#portfolio-content" className="obs-skip-link">Skip to content</a>
      <header className="obs-header">
        <nav className="obs-nav" aria-label="Main navigation">
          {(['overview', 'experience', 'about'] as Section[]).map(item => <a key={item} href={`#${item}`} onClick={event => navigate(item, event)} aria-current={section === item ? 'page' : undefined}>{item[0].toUpperCase() + item.slice(1)}</a>)}
        </nav>
        <div className="obs-header-actions">
          <button type="button" className="obs-command-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open command menu" aria-keyshortcuts="Meta+K Control+K" aria-haspopup="dialog"><Search size={14} aria-hidden="true" /><kbd aria-hidden="true">{modifierKey}K</kbd></button>
          <button type="button" className="obs-sound-control" onClick={toggleAudio} aria-label={audioOn ? 'Mute sound' : 'Enable sound'} aria-pressed={audioOn}>{audioOn ? <AudioLines size={16} /> : <VolumeX size={16} />}<span className="obs-mono">SOUND {audioOn ? 'ON' : 'OFF'}</span></button>
        </div>
      </header>

      <main id="portfolio-content" className="obs-main">
        <div ref={contentRef} className="obs-content-focus" tabIndex={-1}>
        <div hidden={section !== 'overview'}>
          <Playground repoStats={repoStats} panelProject={projectPanel} active={section === 'overview'} motionEnabled={motionEnabled && section === 'overview'} onToggleMotion={toggleMotion} onViewProject={openProject} command={worldCommand} />
        </div>
        {section === 'experience' && (
          <Suspense fallback={<SectionLoading label="experience" />}>
            <ExperiencePage />
          </Suspense>
        )}
        {section === 'about' && (
          <Suspense fallback={<SectionLoading label="profile" />}>
            <AboutPage onNavigateExperience={event => navigate('experience', event)} />
          </Suspense>
        )}
        </div>

        {section === 'overview' && <OpenSource />}

      </main>

      <footer className="obs-footer"><span className="obs-mono">HANYU WU <span className="obs-footer-slash">/</span> STILL CURIOUS. STILL BUILDING.</span>
        <div className="obs-environments" aria-label="Visual environment"><span className="obs-mono">SPECTRUM</span>{([{id:'orbital',label:'Observatory'}, {id:'signal',label:'Signal'}, {id:'blueprint',label:'Blueprint'}, ...(auroraUnlocked ? [{id:'aurora' as const,label:'Aurora (unlocked)'}] : [])] as const).map(item => <button key={item.id} type="button" className={`obs-swatch obs-swatch-${item.id}`} aria-label={`${item.label} environment`} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}><span /></button>)}</div>
        <a className="obs-footer-contact obs-mono" href="mailto:whanyu47@gmail.com">LET'S CONNECT <ArrowUpRight size={14} /></a>
      </footer>
      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />
      {projectPanel && <ProjectPanel projectId={projectPanel} motionEnabled={motionEnabled} onClose={() => setProjectPanel(null)} />}
    </div>
  );
}
