import React from 'react';
import { BrainCircuit, Code2, Database, MapPin } from 'lucide-react';

const INTERESTS = [
  { label: 'Applied AI systems', icon: BrainCircuit },
  { label: 'Agents & LLM applications', icon: Code2 },
  { label: 'Data tools', icon: Database },
];

export const DossierApp: React.FC = () => {
  return (
    <div className="space-y-4 font-mono text-cyan-100">
      <div className="flex flex-col gap-4 rounded border border-cyan-500/25 bg-cyan-950/25 p-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-cyan-400/70 bg-cyan-950/60 text-lg font-bold text-cyan-200 shadow-[0_0_18px_rgba(0,243,255,0.14)]">
          HW
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-500">About</p>
          <h2 className="mt-1 text-lg font-bold tracking-wide text-white">Hanyu Wu</h2>
          <p className="text-xs text-cyan-300">Data science &amp; applied AI</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-cyan-600">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            Singapore
          </p>
        </div>
      </div>

      <section className="rounded border border-cyan-900/60 bg-black/35 p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
          Profile
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Data scientist, machine-learning enthusiast, and AI practitioner. I build applied AI
          systems, agents, and data tools. I learn by building, following each question into the next experiment.
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
          Current interests
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {INTERESTS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded border border-cyan-900/55 bg-black/30 p-3 text-xs text-cyan-200"
            >
              <Icon className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
