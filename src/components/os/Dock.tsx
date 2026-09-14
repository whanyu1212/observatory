import React from 'react';
import { useStore } from '@nanostores/react';
import { User, FolderGit2, Terminal, BookOpen, Send } from 'lucide-react';
import {
  $windows,
  $activeWindow,
  openApp,
  focusApp,
  minimizeApp,
  type AppId,
} from '@/stores/osStore';
import { soundEffects } from '@/components/effects/AudioEngine';

interface DockItem {
  id: AppId;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'dossier', label: 'About', icon: User },
  { id: 'deployments', label: 'Projects', icon: FolderGit2 },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'transmissions', label: 'Notes', icon: BookOpen },
  { id: 'comms', label: 'Contact', icon: Send },
];

export const Dock: React.FC = () => {
  const windows = useStore($windows);
  const active = useStore($activeWindow);
  const hasOpenApp = Object.values(windows).some((win) => win.isOpen);

  if (!hasOpenApp) return null;

  const handleItemClick = (id: AppId) => {
    const win = windows[id];
    if (!win.isOpen) {
      soundEffects.playEngage();
      openApp(id);
    } else if (win.isMinimized) {
      soundEffects.playBlip(600, 0.04);
      focusApp(id);
    } else if (active === id) {
      soundEffects.playDisengage();
      minimizeApp(id);
    } else {
      soundEffects.playBlip(750, 0.03);
      focusApp(id);
    }
  };

  return (
    <nav
      className="app-dock fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-[150] flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-md border p-1.5 backdrop-blur-xl sm:gap-2"
      aria-label="Open applications"
    >
      {DOCK_ITEMS.map((item) => {
        const win = windows[item.id];
        const isCurrentActive = active === item.id && !win.isMinimized;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            data-dock-app={item.id}
            onClick={() => handleItemClick(item.id)}
            onMouseEnter={() => soundEffects.playBlip(440, 0.015)}
            aria-pressed={isCurrentActive}
            aria-label={`${item.label}${win.isMinimized ? ', minimized' : win.isOpen ? ', open' : ''}`}
            className={`group relative flex min-w-14 shrink-0 flex-col items-center rounded border px-2 py-1.5 transition-all sm:min-w-20 sm:px-3 sm:py-2 ${
              isCurrentActive
                ? 'app-dock-item-active'
                : 'border-transparent text-cyan-600 hover:bg-cyan-950/30 hover:text-cyan-300'
            } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200`}
          >
            <IconComponent
              aria-hidden={true}
              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                isCurrentActive
                  ? 'text-cyan-300'
                  : 'text-cyan-500 group-hover:text-cyan-200'
              }`}
            />
            <span className="mt-1 text-[9px] font-mono tracking-wide sm:text-[10px]">
              {item.label}
            </span>
            {win.isOpen && (
              <span
                aria-hidden="true"
                className={`absolute -bottom-1 h-1.5 w-1.5 rounded-full ${
                  isCurrentActive ? 'app-dock-indicator' : 'bg-cyan-700'
                }`}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
