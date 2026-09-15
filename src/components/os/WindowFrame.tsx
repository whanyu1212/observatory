import React, { useEffect, useRef } from 'react';
import {
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion';
import { Minus, Square, X, Cpu } from 'lucide-react';
import {
  type WindowState,
  focusApp,
  closeApp,
  minimizeApp,
  toggleMaximizeApp,
  updatePosition,
} from '@/stores/osStore';
import { soundEffects } from '@/components/effects/AudioEngine';

interface WindowFrameProps {
  window: WindowState;
  isActive: boolean;
  isMobile: boolean;
  isVisible: boolean;
  children: React.ReactNode;
}

const HEADER_CLEARANCE = 90;
const DOCK_CLEARANCE = 85;
const TITLEBAR_HEIGHT = 42;

function clampPosition(
  position: { x: number; y: number },
  size: WindowState['size'],
) {
  if (typeof window === 'undefined') return position;

  const renderedWidth = Math.min(size.width, window.innerWidth);
  const renderedHeight = Math.min(
    size.height,
    Math.max(TITLEBAR_HEIGHT, window.innerHeight - HEADER_CLEARANCE - DOCK_CLEARANCE),
  );
  const maxX = Math.max(0, window.innerWidth - renderedWidth);
  const maxY = Math.max(
    HEADER_CLEARANCE,
    window.innerHeight - DOCK_CLEARANCE - renderedHeight,
  );

  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, HEADER_CLEARANCE), maxY),
  };
}

function focusAfterDismiss(id: WindowState['id']) {
  window.requestAnimationFrame(() => {
    const dockButton = document.querySelector<HTMLButtonElement>(`[data-dock-app="${id}"]`);
    const soundButton = document.querySelector<HTMLButtonElement>('.obs-sound-control');
    (dockButton ?? soundButton)?.focus();
  });
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window: win,
  isActive,
  isMobile,
  isVisible,
  children,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const wasVisibleRef = useRef(false);
  const draggingRef = useRef(false);
  const pendingPositionRef = useRef<WindowState['position'] | null>(null);
  const publishTimerRef = useRef<number | null>(null);
  const dragControls = useDragControls();
  const x = useMotionValue(win.position.x);
  const y = useMotionValue(win.position.y);
  const shouldReduceMotion = useReducedMotion();
  const isMax = win.isMaximized && !isMobile;

  useEffect(() => {
    if (isMobile || isMax || draggingRef.current) return;

    const next = clampPosition(win.position, win.size);
    x.set(next.x);
    y.set(next.y);
    if (next.x !== win.position.x || next.y !== win.position.y) {
      updatePosition(win.id, next);
    }
  }, [isMax, isMobile, win.id, win.position.x, win.position.y, win.size, x, y]);

  useEffect(() => {
    if (isMobile || isMax) return;

    const recoverPosition = () => {
      if (draggingRef.current) return;
      const next = clampPosition({ x: x.get(), y: y.get() }, win.size);
      x.set(next.x);
      y.set(next.y);
      updatePosition(win.id, next);
    };

    window.addEventListener('resize', recoverPosition);
    return () => window.removeEventListener('resize', recoverPosition);
  }, [isMax, isMobile, win.id, win.size, x, y]);

  useEffect(() => {
    const becameVisible = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;

    if (becameVisible && isActive) {
      window.requestAnimationFrame(() => {
        const firstControl = frameRef.current?.querySelector<HTMLElement>(
          '[data-window-content] input:not([disabled]), [data-window-content] textarea:not([disabled]), [data-window-content] button:not([disabled]), [data-window-content] a[href]',
        );
        (firstControl ?? frameRef.current)?.focus({ preventScroll: true });
      });
    }
  }, [isActive, isVisible]);

  useEffect(() => () => {
    if (publishTimerRef.current !== null) {
      window.clearTimeout(publishTimerRef.current);
    }
  }, []);

  const handlePointerDown = () => {
    if (!isActive) {
      focusApp(win.id);
      soundEffects.playBlip(720, 0.02);
    }
  };

  const handleTitlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile && !isMax && event.button === 0) {
      dragControls.start(event);
    }
  };

  const getClampedMotionPosition = () => {
    const next = clampPosition({ x: x.get(), y: y.get() }, win.size);
    x.set(next.x);
    y.set(next.y);
    return next;
  };

  const publishPosition = (position: WindowState['position'], immediate = false) => {
    pendingPositionRef.current = position;

    if (immediate && publishTimerRef.current !== null) {
      window.clearTimeout(publishTimerRef.current);
      publishTimerRef.current = null;
    }

    if (publishTimerRef.current !== null) return;

    const flush = () => {
      const pending = pendingPositionRef.current;
      pendingPositionRef.current = null;
      publishTimerRef.current = null;
      if (pending) updatePosition(win.id, pending);
    };

    if (immediate) flush();
    else publishTimerRef.current = window.setTimeout(flush, 50);
  };

  const handleDrag = () => {
    publishPosition(getClampedMotionPosition());
  };

  const handleDragEnd = () => {
    const next = getClampedMotionPosition();
    draggingRef.current = false;
    publishPosition(next, true);
  };

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    soundEffects.playDisengage();
    closeApp(win.id);
    focusAfterDismiss(win.id);
  };

  const handleMinimize = (event: React.MouseEvent) => {
    event.stopPropagation();
    soundEffects.playBlip(540, 0.03);
    minimizeApp(win.id);
    focusAfterDismiss(win.id);
  };

  const handleMaximize = (event: React.MouseEvent) => {
    event.stopPropagation();
    soundEffects.playBlip(620, 0.03);
    toggleMaximizeApp(win.id);
  };

  const desktopStyle = isMax
    ? {
        top: HEADER_CLEARANCE,
        right: 12,
        bottom: DOCK_CLEARANCE,
        left: 12,
      }
    : {
        top: 0,
        left: 0,
        width: win.size.width,
        maxWidth: '100vw',
        height: win.size.height,
        maxHeight: 'calc(100dvh - 175px)',
        x,
        y,
      };

  const mobileStyle = {
    top: 'calc(var(--workspace-top, 132px) + env(safe-area-inset-top, 0px))',
    right: 8,
    bottom: 'calc(85px + env(safe-area-inset-bottom, 0px))',
    left: 8,
  };

  return (
    <motion.div
      ref={frameRef}
      hidden={!isVisible}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`window-title-${win.id}`}
      tabIndex={-1}
      drag={!isMobile && !isMax}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => {
        draggingRef.current = true;
      }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        closeApp(win.id);
        focusAfterDismiss(win.id);
      }}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeOut' }}
      style={{
        zIndex: win.zIndex,
        position: 'absolute',
        ...(isMobile ? mobileStyle : desktopStyle),
      }}
      className={`workspace-window pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-sm cyber-panel focus:outline-none ${
        isActive ? 'window-active' : 'border-cyan-900/50 opacity-95'
      }`}
    >
      <div
        onPointerDown={handleTitlePointerDown}
        onDoubleClick={() => !isMobile && toggleMaximizeApp(win.id)}
        className={`flex min-h-10 items-center justify-between gap-2 border-b px-3 py-1.5 select-none ${
          !isMobile && !isMax ? 'cursor-move' : ''
        } ${
          isActive
            ? 'bg-cyan-950/40 border-cyan-400/40 text-cyan-300'
            : 'bg-black/60 border-cyan-950 text-cyan-700'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs font-mono tracking-wider">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isActive ? 'bg-cyan-400 shadow-[0_0_6px_#00f3ff]' : 'bg-cyan-800'
            }`}
            aria-hidden="true"
          />
          <Cpu className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
          <span id={`window-title-${win.id}`} className="truncate font-bold">
            {win.title}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-cyan-400">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleMinimize}
            aria-label={`Minimize ${win.title}`}
            className="rounded p-1 transition-colors hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-200"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {!isMobile && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleMaximize}
              aria-label={`${isMax ? 'Restore' : 'Maximize'} ${win.title}`}
              className="rounded p-1 transition-colors hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-200"
            >
              <Square className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleClose}
            aria-label={`Close ${win.title}`}
            className="rounded p-1 transition-colors hover:bg-red-500/30 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-red-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        data-window-content
        className="relative min-h-0 flex-1 overflow-auto bg-black/55 p-4 text-sm text-slate-200"
      >
        {children}
      </div>

      <div className="flex h-5 shrink-0 items-center justify-between border-t border-cyan-950 bg-black/70 px-3 font-mono text-[10px] text-cyan-500/70">
        <span>APP: OPEN</span>
        <span>{isMobile || isMax ? 'VIEW: FULL' : `X:${Math.round(win.position.x)} Y:${Math.round(win.position.y)}`}</span>
      </div>
    </motion.div>
  );
};
