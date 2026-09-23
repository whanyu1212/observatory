import { atom, map } from 'nanostores';

export type AppId = 'dossier' | 'deployments' | 'terminal' | 'transmissions' | 'comms';

export interface WindowState {
  id: AppId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export type SpectrumTheme = 'observatory' | 'polar' | 'ultraviolet' | 'aurora' | 'ember' | 'monochrome';

export const $theme = atom<SpectrumTheme>('observatory');
export const $audioEnabled = atom<boolean>(true);
export const $activeWindow = atom<AppId | null>(null);

export const $windows = map<Record<AppId, WindowState>>({
  dossier: {
    id: 'dossier',
    title: 'ABOUT // HANYU WU',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    position: { x: 40, y: 104 },
    size: { width: 560, height: 480 },
  },
  deployments: {
    id: 'deployments',
    title: 'PROJECTS // SELECTED WORK',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 9,
    position: { x: 120, y: 104 },
    size: { width: 680, height: 520 },
  },
  terminal: {
    id: 'terminal',
    title: 'TERMINAL // WORKSPACE',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 8,
    position: { x: 200, y: 120 },
    size: { width: 600, height: 400 },
  },
  transmissions: {
    id: 'transmissions',
    title: 'NOTES // BUILD LOG',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 7,
    position: { x: 260, y: 90 },
    size: { width: 620, height: 480 },
  },
  comms: {
    id: 'comms',
    title: 'CONTACT // DIRECT LINKS',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 6,
    position: { x: 300, y: 140 },
    size: { width: 500, height: 420 },
  },
});

let highestZIndex = 20;

function getTopVisibleWindow(excludeId?: AppId): AppId | null {
  const windows = $windows.get();
  const next = Object.values(windows)
    .filter((win) => win.id !== excludeId && win.isOpen && !win.isMinimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0];

  return next?.id ?? null;
}

export function openApp(id: AppId) {
  const current = $windows.get();
  const target = current[id];
  if (!target) return;

  highestZIndex += 1;
  $windows.setKey(id, {
    ...target,
    isOpen: true,
    isMinimized: false,
    zIndex: highestZIndex,
  });
  $activeWindow.set(id);
}

export function closeApp(id: AppId) {
  const current = $windows.get();
  const target = current[id];
  if (!target) return;

  $windows.setKey(id, {
    ...target,
    isOpen: false,
    isMinimized: false,
  });

  if ($activeWindow.get() === id) {
    $activeWindow.set(getTopVisibleWindow(id));
  }
}

export function minimizeApp(id: AppId) {
  const current = $windows.get();
  const target = current[id];
  if (!target) return;

  $windows.setKey(id, {
    ...target,
    isMinimized: true,
  });

  if ($activeWindow.get() === id) {
    $activeWindow.set(getTopVisibleWindow(id));
  }
}

export function toggleMaximizeApp(id: AppId) {
  const current = $windows.get();
  const target = current[id];
  if (!target) return;

  $windows.setKey(id, {
    ...target,
    isMaximized: !target.isMaximized,
  });
  focusApp(id);
}

export function focusApp(id: AppId) {
  const current = $windows.get();
  const target = current[id];
  if (!target || !target.isOpen) return;

  highestZIndex += 1;
  $windows.setKey(id, {
    ...target,
    zIndex: highestZIndex,
    isMinimized: false,
  });
  $activeWindow.set(id);
}

export function updatePosition(id: AppId, position: { x: number; y: number }) {
  const current = $windows.get();
  const target = current[id];
  if (!target || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
  if (target.position.x === position.x && target.position.y === position.y) return;

  $windows.setKey(id, {
    ...target,
    position,
  });
}
