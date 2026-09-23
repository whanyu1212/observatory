import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { ArrowUpRight, AudioLines, VolumeX } from 'lucide-react';
import { $audioEnabled, $theme, $windows, minimizeApp } from '@/stores/osStore';
import { $auroraUnlocked, loadProgress } from '@/stores/progressStore';
import { soundEffects } from '@/components/effects/AudioEngine';
import { Playground } from './Playground';
import { BackgroundStars } from './BackgroundStars';
import { MeteorShower } from './MeteorShower';
import { OpenSource } from './OpenSource';
import { ProjectPanel } from './ProjectPanel';
import type { ProjectId } from './curiosity';
import type { RepoStatsMap } from '@/lib/repoStats';

const ExperiencePage = lazy(() => import('./ExperiencePage').then(module => ({ default: module.ExperiencePage })));
const AboutPage = lazy(() => import('./AboutPage').then(module => ({ default: module.AboutPage })));

type Section = 'overview' | 'experience' | 'about';
type Direction = 'orbital' | 'signal' | 'blueprint' | 'aurora';

function SectionLoading({ label }: { label: string }) {
  return <div className="obs-section-loading obs-mono" role="status">Loading {label}…</div>;
}

export function Observatory({ repoStats = {} }: { repoStats?: RepoStatsMap }) {
  const [section, setSection] = useState<Section>('overview');
  const [direction, setDirection] = useState<Direction>('orbital');
  const [projectPanel, setProjectPanel] = useState<ProjectId | null>(null);
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
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

  useEffect(() => {
    const theme = direction === 'signal' ? 'ultraviolet' : direction === 'blueprint' ? 'polar' : direction === 'aurora' ? 'aurora' : 'observatory';
    document.documentElement.dataset.theme = theme;
    $theme.set(theme);
  }, [direction]);

  const navigate = (next: Section, event?: React.MouseEvent) => {
    event?.preventDefault();
    Object.values($windows.get()).forEach(win => {
      if (win.isOpen && !win.isMinimized) minimizeApp(win.id);
    });
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
          <button type="button" className="obs-sound-control" onClick={toggleAudio} aria-label={audioOn ? 'Mute sound' : 'Enable sound'} aria-pressed={audioOn}>{audioOn ? <AudioLines size={16} /> : <VolumeX size={16} />}<span className="obs-mono">SOUND {audioOn ? 'ON' : 'OFF'}</span></button>
        </div>
      </header>

      <main id="portfolio-content" className="obs-main">
        <div ref={contentRef} className="obs-content-focus" tabIndex={-1}>
        <div hidden={section !== 'overview'}>
          <Playground repoStats={repoStats} panelProject={projectPanel} active={section === 'overview'} motionEnabled={motionEnabled && section === 'overview'} onToggleMotion={toggleMotion} onViewProject={openProject} />
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
        <div className="obs-environments" aria-label="Visual environment"><span className="obs-mono">SPECTRUM</span>{([{id:'orbital',label:'Observatory'}, {id:'signal',label:'Signal'}, {id:'blueprint',label:'Blueprint'}, ...(auroraUnlocked ? [{id:'aurora',label:'Aurora (unlocked)'}] : [])] as const).map(item => <button key={item.id} type="button" className={`obs-swatch obs-swatch-${item.id}`} aria-label={`${item.label} environment`} aria-pressed={direction === item.id} onClick={() => setDirection(item.id)}><span /></button>)}</div>
        <a className="obs-footer-contact obs-mono" href="mailto:whanyu47@gmail.com">LET'S CONNECT <ArrowUpRight size={14} /></a>
      </footer>
      {projectPanel && <ProjectPanel projectId={projectPanel} motionEnabled={motionEnabled} onClose={() => setProjectPanel(null)} />}
    </div>
  );
}
