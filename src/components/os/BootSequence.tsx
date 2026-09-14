import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, Radio, Terminal } from 'lucide-react';
import { soundEffects } from '@/components/effects/AudioEngine';

interface BootLine {
  text: string;
  delay: number;
  tone?: 'ok' | 'warn' | 'cyan' | 'dim';
}

interface NetworkInfoLike {
  effectiveType?: string;
  downlink?: number;
}

type BootStage = 'runtime' | 'services' | 'workspace' | 'ready' | 'active';

const READY_AT = 2350;
const SKIP_FLAG = 'cyber_os_booted';
const SEGMENT_COUNT = 24;

const toneClass = (tone?: BootLine['tone']) => {
  switch (tone) {
    case 'ok':
      return 'text-emerald-400';
    case 'warn':
      return 'text-amber-400';
    case 'dim':
      return 'text-cyan-800';
    case 'cyan':
    default:
      return 'text-cyan-300';
  }
};

const rememberBooted = () => {
  try {
    sessionStorage.setItem(SKIP_FLAG, '1');
  } catch {
    // Session storage may be unavailable in privacy-restricted browsers.
  }
};

const getBootLines = (): BootLine[] => {
  const connection = (navigator as Navigator & { connection?: NetworkInfoLike }).connection;
  const networkType = connection?.effectiveType?.toUpperCase() ?? (navigator.onLine ? 'ONLINE' : 'OFFLINE');
  const downlink = typeof connection?.downlink === 'number' ? ` / ${connection.downlink} Mbps` : '';
  const input = navigator.maxTouchPoints > 0 ? 'TOUCH + POINTER' : 'POINTER + KEYBOARD';
  const localTime = new Date().toLocaleTimeString([], { hour12: false });

  let storageAvailable = true;
  try {
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, '1');
    sessionStorage.removeItem(testKey);
  } catch {
    storageAvailable = false;
  }

  const audioAvailable = 'AudioContext' in window || 'webkitAudioContext' in window;

  return [
    { text: '[OK] JS RUNTIME ........... AVAILABLE', delay: 120, tone: 'ok' },
    { text: `[OK] VIEWPORT ............. ${window.innerWidth} × ${window.innerHeight}`, delay: 300, tone: 'ok' },
    { text: `[OK] NETWORK .............. ${networkType}${downlink}`, delay: 480, tone: 'ok' },
    { text: `[OK] INPUT DEVICES ........ ${input}`, delay: 650, tone: 'ok' },
    { text: `[OK] WEB AUDIO ............ ${audioAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`, delay: 820, tone: audioAvailable ? 'ok' : 'warn' },
    { text: `[OK] SESSION STORAGE ...... ${storageAvailable ? 'AVAILABLE' : 'RESTRICTED'}`, delay: 990, tone: storageAvailable ? 'ok' : 'warn' },
    { text: '[OK] STATE STORE .......... HYDRATED', delay: 1170, tone: 'ok' },
    { text: '[OK] UI COMPONENTS ........ MOUNTED', delay: 1360, tone: 'ok' },
    { text: '[OK] THEME SYSTEM ......... POLAR', delay: 1570, tone: 'ok' },
    { text: '[OK] MOTION ENGINE ........ READY', delay: 1780, tone: 'ok' },
    { text: `[OK] LOCAL TIME ........... ${localTime}`, delay: 1990, tone: 'ok' },
    { text: '[OK] WORKSPACE ............ READY', delay: 2170, tone: 'cyan' },
  ];
};

const stageIndex = (stage: BootStage) => {
  if (stage === 'runtime') return 0;
  if (stage === 'services') return 1;
  if (stage === 'workspace') return 2;
  return 3;
};

export const BootSequence: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showBoot, setShowBoot] = useState(true);
  const [lines, setLines] = useState<BootLine[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<BootStage>('runtime');
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const clearBootTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    cancelAnimationFrame(rafRef.current);
  };

  const skip = () => {
    clearBootTimers();
    rememberBooted();
    setShowBoot(false);
  };

  const activate = () => {
    if (stage !== 'ready') return;

    clearBootTimers();
    setStage('active');
    rememberBooted();

    soundEffects.startAmbientHum();
    soundEffects.playBlip(120, 0.18);
    soundEffects.playEngage();
    timersRef.current.push(window.setTimeout(() => soundEffects.playBlip(1040, 0.08), 110));
    timersRef.current.push(window.setTimeout(() => setShowBoot(false), 650));
  };

  useEffect(() => {
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(SKIP_FLAG) === '1';
    } catch {
      alreadyBooted = false;
    }

    if (alreadyBooted) {
      setShowBoot(false);
      return;
    }

    const bootLines = getBootLines();
    setLines(bootLines);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setVisibleCount(bootLines.length);
      setProgress(100);
      setStage('ready');
    } else {
      bootLines.forEach((line, index) => {
        timersRef.current.push(window.setTimeout(() => setVisibleCount(index + 1), line.delay));
      });

      timersRef.current.push(window.setTimeout(() => setStage('services'), 620));
      timersRef.current.push(window.setTimeout(() => setStage('workspace'), 1320));
      timersRef.current.push(window.setTimeout(() => {
        setProgress(100);
        setStage('ready');
      }, READY_AT));

      const startedAt = performance.now();
      const tick = (now: number) => {
        const nextProgress = Math.min(100, ((now - startedAt) / READY_AT) * 100);
        setProgress(nextProgress);
        if (nextProgress < 100) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearBootTimers();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const currentStage = stageIndex(stage);
  const activeSegments = Math.round((progress / 100) * SEGMENT_COUNT);

  return (
    <>
      {children}
      <AnimatePresence>
        {showBoot && (
          <motion.div
            key="boot-sequence"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              clipPath: 'inset(49% 0 49% 0)',
              filter: 'brightness(2.5) contrast(1.6)',
            }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
            className="boot-screen fixed inset-0 z-[100] overflow-y-auto bg-[#03050a] text-cyan-300 select-none"
            role="dialog"
            aria-modal="true"
            aria-label="Developer workspace initialization"
          >
            <div className="boot-grid absolute inset-0 pointer-events-none" />
            <div className="boot-scanline absolute inset-x-0 top-0 pointer-events-none" />

            <button
              type="button"
              onClick={skip}
              className="absolute right-4 top-4 z-20 border border-cyan-900/70 bg-black/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-cyan-700 transition hover:border-cyan-500 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              [ESC] SKIP
            </button>

            <div className="relative z-10 flex min-h-full items-center justify-center px-5 py-16">
              <div className="w-full max-w-5xl font-mono">
                <header className="mb-8 flex flex-col gap-5 border-b border-cyan-900/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-cyan-400">
                      <Cpu className="h-5 w-5 animate-pulse" />
                      <span className="text-xs font-bold tracking-[0.3em]">DEV_ENV // INITIALIZING</span>
                    </div>
                    <p className="text-[10px] tracking-[0.2em] text-cyan-800">
                      PROFILE: HANYU WU // FULL-STACK + AI SYSTEMS
                    </p>
                  </div>

                  <div className="flex gap-2" aria-label="Initialization stages">
                    {['RUNTIME', 'SERVICES', 'WORKSPACE', 'READY'].map((label, index) => (
                      <span
                        key={label}
                        className={`border px-2 py-1 text-[9px] tracking-wider transition-colors ${
                          index <= currentStage
                            ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300'
                            : 'border-cyan-950 text-cyan-900'
                        }`}
                      >
                        0{index + 1} {label}
                      </span>
                    ))}
                  </div>
                </header>

                <div className="grid items-center gap-10 md:grid-cols-[280px_1fr]">
                  <div className="hidden justify-center md:flex" aria-hidden="true">
                    <div className={`boot-reticle ${stage === 'ready' ? 'is-ready' : ''} ${stage === 'active' ? 'is-authorized' : ''}`}>
                      <div className="boot-reticle-ring boot-reticle-ring-outer" />
                      <div className="boot-reticle-ring boot-reticle-ring-inner" />
                      <div className="boot-radar-sweep" />
                      <div className="boot-reticle-axis boot-reticle-axis-x" />
                      <div className="boot-reticle-axis boot-reticle-axis-y" />
                      <Cpu className="relative z-10 h-10 w-10" strokeWidth={1} />
                      <span className="absolute -bottom-8 text-[9px] tracking-[0.22em] text-cyan-700">
                        DEV // WORKSPACE
                      </span>
                    </div>
                  </div>

                  <section>
                    <div className="mb-3 flex items-center justify-between text-[10px] tracking-[0.18em] text-cyan-700">
                      <span className="flex items-center gap-2">
                        <Terminal className="h-3 w-3" />
                        LIVE SYSTEM DIAGNOSTICS
                      </span>
                      <span>{stage.toUpperCase()}</span>
                    </div>

                    <div className="min-h-[288px] border border-cyan-950/80 bg-black/35 p-4 text-xs leading-5 shadow-[inset_0_0_30px_rgba(0,243,255,0.025)] sm:text-sm">
                      {lines.slice(0, visibleCount).map((line) => (
                        <div key={line.text} className={`boot-line ${toneClass(line.tone)}`}>
                          {line.text}
                        </div>
                      ))}
                      {stage !== 'ready' && stage !== 'active' && (
                        <span className="boot-cursor mt-1 inline-block h-4 w-2.5 bg-cyan-400" />
                      )}
                    </div>
                  </section>
                </div>

                <footer className="mt-8">
                  <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.16em] text-cyan-700">
                    <span className="flex items-center gap-2">
                      <Radio className="h-3 w-3" />
                      WORKSPACE INITIALIZATION
                    </span>
                    <span>{Math.round(progress).toString().padStart(3, '0')}%</span>
                  </div>

                  <div className="grid grid-cols-24 gap-1" aria-hidden="true">
                    {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
                      <span
                        key={index}
                        className={`h-2 border transition-colors duration-100 ${
                          index < activeSegments
                            ? 'border-cyan-300/70 bg-cyan-400 shadow-[0_0_6px_rgba(0,243,255,0.55)]'
                            : 'border-cyan-950 bg-cyan-950/30'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-7 flex min-h-16 items-center justify-center" role="status" aria-live="polite">
                    {stage === 'ready' && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={activate}
                        className="boot-activate cyber-cut-corner-sm border border-cyan-400/80 bg-cyan-400/10 px-8 py-3 text-xs font-bold tracking-[0.24em] text-cyan-200 shadow-[0_0_24px_rgba(0,243,255,0.15)] transition hover:bg-cyan-300/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                      >
                        OPEN WORKSPACE
                      </motion.button>
                    )}

                    {stage === 'active' && (
                      <motion.div
                        initial={{ opacity: 0, letterSpacing: '0.1em' }}
                        animate={{ opacity: 1, letterSpacing: '0.25em' }}
                        className="glow-green text-sm font-bold text-emerald-400"
                      >
                        ENVIRONMENT READY // WELCOME, HANYU
                      </motion.div>
                    )}
                  </div>
                </footer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
