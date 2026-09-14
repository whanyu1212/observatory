import React, { useEffect, useRef, useState } from 'react';
import {
  $activeWindow,
  $audioEnabled,
  $theme,
  $windows,
  openApp,
  type AppId,
} from '@/stores/osStore';
import { soundEffects } from '@/components/effects/AudioEngine';

interface LogLine {
  id: number;
  type: 'in' | 'out' | 'err';
  text: string;
}

const APP_ALIASES: Record<string, AppId> = {
  about: 'dossier',
  dossier: 'dossier',
  projects: 'deployments',
  deployments: 'deployments',
  terminal: 'terminal',
  notes: 'transmissions',
  transmissions: 'transmissions',
  contact: 'comms',
  comms: 'comms',
};

export const TerminalApp: React.FC = () => {
  const lineId = useRef(2);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<LogLine[]>([
    { id: 1, type: 'out', text: 'CYBER_OS workspace terminal' },
    { id: 2, type: 'out', text: 'Type "help" to inspect available commands.' },
  ]);
  const [inputVal, setInputVal] = useState('');

  const nextId = () => {
    lineId.current += 1;
    return lineId.current;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [history]);

  const handleCommand = (event: React.FormEvent) => {
    event.preventDefault();
    const raw = inputVal.trim();
    if (!raw) return;

    const newHistory: LogLine[] = [
      ...history,
      { id: nextId(), type: 'in', text: `$ ${raw}` },
    ];
    const [cmd, ...args] = raw.toLowerCase().split(/\s+/);

    switch (cmd) {
      case 'help':
        newHistory.push({
          id: nextId(),
          type: 'out',
          text: `AVAILABLE COMMANDS:
  help           Show this manual
  about          Show Hanyu's public profile summary
  stack          List technology used by this portfolio
  open <app>     Open About, Projects, Terminal, Notes, or Contact
  windows        List current application window state
  diagnostics    Inspect real workspace and browser state
  clear          Clear the console`,
        });
        break;

      case 'about':
      case 'bio':
        newHistory.push({
          id: nextId(),
          type: 'out',
          text: `HANYU WU — Curious by default. Learning by building.
Data scientist and applied AI builder in Singapore. Exploring agents, data tools, and reinforcement learning, one experiment at a time.`,
        });
        break;

      case 'stack':
      case 'skills':
        newHistory.push({
          id: nextId(),
          type: 'out',
          text: `TECHNOLOGY IN THIS BUILD:
- Astro + React
- TypeScript + Nanostores
- Tailwind CSS + Framer Motion
- SVG curiosity map + Web Audio`,
        });
        break;

      case 'windows': {
        const lines = Object.values($windows.get()).map((win) => {
          const state = !win.isOpen ? 'closed' : win.isMinimized ? 'minimized' : 'visible';
          return `- ${win.id.padEnd(13)} ${state.padEnd(9)} z:${win.zIndex}`;
        });
        newHistory.push({ id: nextId(), type: 'out', text: lines.join('\n') });
        break;
      }

      case 'diagnostics': {
        const windows = Object.values($windows.get());
        const restoredCount = windows.filter((win) => win.isOpen && !win.isMinimized).length;
        const openCount = windows.filter((win) => win.isOpen).length;
        const viewport = typeof window === 'undefined'
          ? 'unavailable'
          : `${window.innerWidth} × ${window.innerHeight}`;
        newHistory.push({
          id: nextId(),
          type: 'out',
          text: `WORKSPACE DIAGNOSTICS:
[STATE] OPEN WINDOWS: ${openCount} / UNMINIMIZED: ${restoredCount}
[STATE] ACTIVE APP: ${$activeWindow.get() ?? 'none'}
[STATE] AUDIO: ${$audioEnabled.get() ? 'enabled' : 'muted'}
[STATE] THEME: ${$theme.get()}
[BROWSER] VIEWPORT: ${viewport}
[BROWSER] NETWORK: ${typeof navigator === 'undefined' ? 'unavailable' : navigator.onLine ? 'online' : 'offline'}`,
        });
        break;
      }

      case 'open': {
        const targetApp = APP_ALIASES[args[0] ?? ''];
        if (targetApp) {
          openApp(targetApp);
          newHistory.push({
            id: nextId(),
            type: 'out',
            text: `OPENED: ${args[0]}`,
          });
        } else {
          newHistory.push({
            id: nextId(),
            type: 'err',
            text: 'Unknown app. Choose: about, projects, terminal, notes, contact.',
          });
        }
        break;
      }

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      default:
        newHistory.push({
          id: nextId(),
          type: 'err',
          text: `Unknown command: "${cmd}". Type "help" for instructions.`,
        });
    }

    setHistory(newHistory);
    setInputVal('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col font-mono text-xs">
      <div
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1 text-slate-300"
        aria-live="polite"
        aria-label="Terminal output"
      >
        {history.map((log) => (
          <div
            key={log.id}
            className={`whitespace-pre-wrap leading-relaxed ${
              log.type === 'in'
                ? 'font-semibold text-cyan-400'
                : log.type === 'err'
                  ? 'text-red-400'
                  : 'text-emerald-400/90'
            }`}
          >
            {log.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleCommand} className="mt-2 flex items-center gap-2 border-t border-cyan-950 pt-2">
        <label htmlFor="workspace-command" className="text-cyan-400 font-bold">
          <span className="sr-only">Terminal command</span>
          <span aria-hidden="true">$</span>
        </label>
        <input
          id="workspace-command"
          type="text"
          value={inputVal}
          onChange={(event) => setInputVal(event.target.value)}
          onKeyDown={(event) => {
            if (event.key.length === 1) soundEffects.playKeyClick();
          }}
          placeholder="type command (for example, help)"
          autoComplete="off"
          className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-cyan-200 outline-none placeholder:text-cyan-800"
        />
      </form>
    </div>
  );
};
