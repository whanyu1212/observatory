import React from 'react';
import { GitBranch, Contact, Mail } from 'lucide-react';

const CONTACTS = [
  {
    label: 'GitHub',
    value: '@whanyu1212',
    href: 'https://github.com/whanyu1212',
    icon: GitBranch,
    external: true,
  },
  {
    label: 'LinkedIn',
    value: 'Hanyu Wu',
    href: 'https://www.linkedin.com/in/hanyu-wu-6a610b165',
    icon: Contact,
    external: true,
  },
  {
    label: 'Email',
    value: 'whanyu47@gmail.com',
    href: 'mailto:whanyu47@gmail.com',
    icon: Mail,
    external: false,
  },
];

export const CommsApp: React.FC = () => {
  return (
    <div className="space-y-4 font-mono text-cyan-100">
      <section className="rounded border border-cyan-500/25 bg-cyan-950/20 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-500">Contact</p>
        <h2 className="mt-1 text-lg font-bold text-white">Start a conversation</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-slate-300">
          Let's talk about AI agents, data tools, or the next interesting problem to work on.
        </p>
      </section>

      <div className="grid gap-2">
        {CONTACTS.map(({ label, value, href, icon: Icon, external }) => (
          <a
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="flex items-center gap-3 rounded border border-cyan-900/60 bg-black/35 p-3 transition-colors hover:border-cyan-400 hover:bg-cyan-950/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            <Icon className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.15em] text-cyan-600">
                {label}
              </span>
              <span className="block truncate text-xs text-cyan-100">{value}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
