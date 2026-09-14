import React from 'react';
import { Braces, Boxes, Database, AudioLines, ScanLine } from 'lucide-react';

const BUILD_NOTES = [
  {
    title: 'Astro shell',
    detail: 'Astro composes the page, layout, and client hydration boundaries.',
    icon: Braces,
  },
  {
    title: 'React workspace',
    detail: 'React powers the dock, movable windows, terminal, and interactive project views.',
    icon: Boxes,
  },
  {
    title: 'Shared state',
    detail: 'Nanostores keeps open apps, window focus, positions, theme, and audio state in sync.',
    icon: Database,
  },
  {
    title: 'Map of curiosity',
    detail: 'An interactive SVG map connects interests to real projects. Selecting a project opens its question and experiment notes.',
    icon: ScanLine,
  },
  {
    title: 'Opt-in sound',
    detail: 'Web Audio synthesizes interface cues locally after the visitor enables audio.',
    icon: AudioLines,
  },
];

export const TransmissionsApp: React.FC = () => {
  return (
    <div className="space-y-4 font-mono text-cyan-100">
      <header className="rounded border border-cyan-500/25 bg-cyan-950/20 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-500">Build notes</p>
        <h2 className="mt-1 text-lg font-bold text-white">How CYBER_OS is assembled</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          A concise map of the implementation running behind this portfolio.
        </p>
      </header>

      <ol className="space-y-2">
        {BUILD_NOTES.map(({ title, detail, icon: Icon }, index) => (
          <li
            key={title}
            className="grid grid-cols-[auto_1fr] gap-3 rounded border border-cyan-900/55 bg-black/30 p-3"
          >
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="text-[9px] text-cyan-700">{String(index + 1).padStart(2, '0')}</span>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-cyan-200">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
