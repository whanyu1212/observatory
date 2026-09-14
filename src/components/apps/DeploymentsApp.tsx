import React, { useState } from 'react';
import { ExternalLink, GitBranch, ChevronRight } from 'lucide-react';
import { projects } from '@/components/observatory/curiosity';
import { soundEffects } from '@/components/effects/AudioEngine';

interface Project {
  id: string;
  name: string;
  status: 'OPEN SOURCE' | 'PRE-BETA' | 'BUILT HERE';
  description: string;
  stack: string[];
  repository?: string;
  docs?: string;
}

const PROJECTS: Project[] = [
  ...Object.entries(projects).map(([id, project]): Project => ({
    id,
    name: project.name,
    status: id === 'opencouch' ? 'PRE-BETA' : 'OPEN SOURCE',
    description: project.description,
    stack: project.stack,
    repository: project.repository,
    docs: project.docs,
  })),
  {
    id: 'cyber-os',
    name: 'CYBER_OS',
    status: 'BUILT HERE',
    description:
      'This interactive portfolio: an Astro shell with React app windows, Nanostores state, an interactive map of interests and projects, and opt-in Web Audio.',
    stack: ['Astro', 'React', 'Nanostores', 'SVG', 'Web Audio'],
  },
];

export const DeploymentsApp: React.FC = () => {
  const [selected, setSelected] = useState<Project>(PROJECTS[0]);

  return (
    <div className="grid min-h-full grid-cols-1 gap-3 font-mono md:grid-cols-[minmax(170px,0.8fr)_2fr]">
      <div className="space-y-2 border-b border-cyan-950/80 pb-3 md:border-b-0 md:border-r md:pb-0 md:pr-3">
        <div className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400">
          Project index ({PROJECTS.length})
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible">
          {PROJECTS.map((project) => {
            const isSelected = selected.id === project.id;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  soundEffects.playBlip(680, 0.03);
                  setSelected(project);
                }}
                aria-pressed={isSelected}
                className={`min-w-36 rounded border p-2 text-left transition-all md:w-full ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-100'
                    : 'border-cyan-900/40 bg-black/30 text-cyan-600 hover:border-cyan-600 hover:text-cyan-300'
                } focus-visible:outline-2 focus-visible:outline-cyan-200`}
              >
                <span className="flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="truncate">{project.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-[9px] text-cyan-500">{project.status}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded border border-cyan-500/25 bg-cyan-950/20 p-4" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.17em] text-cyan-500">Selected project</p>
            <h3 className="mt-1 text-lg font-bold text-white">{selected.name}</h3>
          </div>
          <span className="rounded border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-[9px] text-cyan-300">
            {selected.status}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">{selected.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {selected.stack.map((item) => (
            <span
              key={item}
              className="rounded border border-cyan-500/35 bg-black/50 px-2 py-1 text-[10px] text-cyan-300"
            >
              {item}
            </span>
          ))}
        </div>

        {selected.repository ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={selected.repository}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded border border-cyan-400 bg-cyan-500/15 px-3 py-2 text-xs text-cyan-100 transition-colors hover:bg-cyan-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              Source
            </a>
            {selected.docs && (
              <a
                href={selected.docs}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded border border-cyan-700 bg-black/35 px-3 py-2 text-xs text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-cyan-950/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Documentation
              </a>
            )}
          </div>
        ) : (
          <p className="mt-5 border-t border-cyan-900/50 pt-3 text-[10px] text-cyan-600">
            You are viewing this project now. A public repository link has not been attached here.
          </p>
        )}
      </section>
    </div>
  );
};
