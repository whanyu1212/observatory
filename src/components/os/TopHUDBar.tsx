import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Volume2, VolumeX, Cpu, Radio, Activity, Terminal, MousePointer2, Monitor } from 'lucide-react';
import {
  $audioEnabled,
  $theme,
  openApp,
  type SpectrumTheme,
} from '@/stores/osStore';
import { soundEffects } from '@/components/effects/AudioEngine';

interface NetworkInfoLike {
  effectiveType?: string;
  downlink?: number;
}

export const TopHUDBar: React.FC = () => {
  const audioOn = useStore($audioEnabled);
  const theme = useStore($theme);
  const [timeStr, setTimeStr] = useState<string>('00:00:00 UTC');
  const [cpuUsage, setCpuUsage] = useState<number>(14);
  const [viewport, setViewport] = useState<string>('0x0');
  const [netInfo, setNetInfo] = useState<string>('ONLINE');
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Attach ambient hum to first user interaction (autoplay policy safe)
  useEffect(() => {
    soundEffects.attachAmbientOnFirstInteraction();
  }, []);

  // Live clock + simulated CPU load
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' ' + (now.toTimeString().split(' ')[1] || 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const cpuInterval = setInterval(() => {
      setCpuUsage(Math.floor(12 + Math.random() * 18));
    }, 2500);

    return () => {
      clearInterval(interval);
      clearInterval(cpuInterval);
    };
  }, []);

  // Real viewport dimensions
  useEffect(() => {
    const updateViewport = () => {
      setViewport(`${window.innerWidth}x${window.innerHeight}`);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Real network info (where supported)
  useEffect(() => {
    const conn = (navigator as unknown as { connection?: NetworkInfoLike }).connection;
    if (conn) {
      const update = () => {
        const type = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'LINK';
        const speed = typeof conn.downlink === 'number' ? ` ${conn.downlink}Mb` : '';
        setNetInfo(`${type}${speed}`);
      };
      update();
      (conn as unknown as EventTarget).addEventListener?.('change', update);
      return () => (conn as unknown as EventTarget).removeEventListener?.('change', update);
    }
  }, []);

  // Live cursor telemetry
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const toggleSound = () => {
    const next = !audioOn;
    $audioEnabled.set(next);
    if (next) {
      soundEffects.playBlip(980, 0.05);
      soundEffects.startAmbientHum();
    } else {
      soundEffects.stopAmbientHum();
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const cycleTheme = () => {
    const themes: SpectrumTheme[] = ['polar', 'ultraviolet', 'ember', 'monochrome'];
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    $theme.set(themes[nextIdx]);
    soundEffects.playBlip(780, 0.04);
  };

  return (
    <header className="shell-topbar fixed top-0 left-0 right-0 h-10 border-b backdrop-blur-xl z-50 flex items-center justify-between px-4 text-xs font-mono text-cyan-400 select-none">
      {/* Brand & Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-widest text-cyan-300">
          <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>HANYU.OS // WORKSPACE</span>
        </div>
        <span className="hidden sm:inline-block text-cyan-700">|</span>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-cyan-500">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>CPU {cpuUsage}%</span>
        </div>
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-cyan-500">
          <Monitor className="w-3.5 h-3.5 text-cyan-400" />
          <span>{viewport}</span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-[11px] text-cyan-500">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>NET: {netInfo}</span>
        </div>
        <div className="hidden xl:flex items-center gap-1 text-[11px] text-cyan-600 tabular-nums">
          <MousePointer2 className="w-3.5 h-3.5 text-cyan-500" />
          <span>
            X:{String(coords.x).padStart(4, '0')} Y:{String(coords.y).padStart(4, '0')}
          </span>
        </div>
      </div>

      {/* Center Command Launcher */}
      <button
        onClick={() => {
          soundEffects.playEngage();
          openApp('terminal');
        }}
        className="shell-launcher hidden md:flex items-center gap-2 px-3 py-1 border text-cyan-300 rounded text-[11px] transition-all"
      >
        <Terminal className="w-3 h-3 text-cyan-400" />
        <span>OPEN TERMINAL [CLI]</span>
      </button>

      {/* Right Controls (Time & Toggles) */}
      <div className="flex items-center gap-3">
        <button
          onClick={cycleTheme}
          aria-label="Change environment theme"
          className="px-2 py-0.5 border border-cyan-500/30 hover:border-cyan-300 rounded text-[10px] uppercase text-cyan-400 transition-colors"
        >
          ENV::{theme}
        </button>

        <button
          onClick={toggleSound}
          aria-label="Toggle Sound FX"
          className="p-1 hover:bg-cyan-500/20 text-cyan-400 rounded transition-colors"
          title={audioOn ? 'Audio Enabled' : 'Audio Muted'}
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
        </button>

        <div className="text-[11px] text-cyan-300 font-semibold tracking-wider tabular-nums">
          {timeStr}
        </div>
      </div>
    </header>
  );
};
