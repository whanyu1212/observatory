import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from 'react';
import type { ProjectId } from './curiosity';

function islandOrigin(projectId: ProjectId) {
  const marker = document.querySelector<HTMLElement>(`.world-project-label[data-project="${projectId}"]`);
  const world = marker?.closest('[data-exploration-world]')?.getBoundingClientRect();
  const markerRect = marker?.getBoundingClientRect();
  // The scene publishes the sculpture's projection, before label collision handling.
  // Convert here so page scrolling and the world's CSS recession stay aligned.
  const hasAnchor = world && marker?.dataset.anchorVisible === 'true';
  const x = hasAnchor ? world.left + Number(marker.dataset.anchorX) * world.width
    : markerRect ? markerRect.left + markerRect.width / 2 : window.innerWidth * .7;
  const y = hasAnchor ? world.top + Number(marker.dataset.anchorY) * world.height
    : markerRect ? markerRect.top + markerRect.height / 2 : window.innerHeight * .45;
  return { x: Math.max(24, Math.min(window.innerWidth - 24, x)), y: Math.max(24, Math.min(window.innerHeight - 24, y)) };
}

/** Keep the native modal and scroll lock alive until its return animation finishes. */
export function useProjectDialog(projectId: ProjectId, motionEnabled: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const optionsRef = useRef({ motionEnabled, onClose });
  const outsidePointerDown = useRef(false);
  optionsRef.current = { motionEnabled, onClose };

  const collapsedFrame = useCallback(() => {
    const dialog = dialogRef.current!;
    // Layout offsets stay stable through transforms and locate the centered
    // terminal window even when a viewport change adjusts its size.
    const width = dialog.offsetWidth;
    const height = dialog.offsetHeight;
    const origin = islandOrigin(projectId);
    const dx = origin.x - (dialog.offsetLeft + width / 2);
    const dy = origin.y - (dialog.offsetTop + height / 2);
    return {
      transform: `translate(${dx}px, ${dy}px) scale(.08)`,
      opacity: 0,
    };
  }, [projectId]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    closingRef.current = false;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.dataset.phase = 'opening';

    if (optionsRef.current.motionEnabled && typeof dialog.animate === 'function') {
      const animation = dialog.animate([collapsedFrame(), { transform: 'none', opacity: 1 }], {
        duration: 280, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards',
      });
      animationRef.current = animation;
      animation.onfinish = () => { dialog.dataset.phase = 'open'; animationRef.current = null; };
    } else dialog.dataset.phase = 'open';
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      if (animationRef.current) animationRef.current.onfinish = null;
      animationRef.current?.cancel();
      animationRef.current = null;
      document.body.style.overflow = previousBodyOverflow;
      if (dialog.open) dialog.close();
      if (previouslyFocused?.isConnected && !previouslyFocused.closest('[hidden]')) previouslyFocused.focus({ preventScroll: true });
    };
  }, [collapsedFrame]);

  useEffect(() => {
    // Also completes an in-flight exit if the motion preference changes.
    if (!motionEnabled) animationRef.current?.finish();
  }, [motionEnabled]);

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current) return;
    closingRef.current = true;
    const opening = animationRef.current;
    dialog.dataset.phase = 'closing';
    const finish = () => {
      // Retain the finished animation so unmount cleanup releases its fill state.
      optionsRef.current.onClose();
    };
    if (!optionsRef.current.motionEnabled || typeof dialog.animate !== 'function') {
      if (opening) opening.onfinish = null;
      opening?.cancel();
      animationRef.current = null;
      return finish();
    }
    if (opening) {
      // Reversing keeps an interrupted entrance at its current transform.
      opening.onfinish = finish;
      opening.playbackRate = -280 / 180;
      opening.play();
      return;
    }
    const animation = dialog.animate([{ transform: 'none', opacity: 1 }, collapsedFrame()], {
      duration: 180, easing: 'cubic-bezier(.55, 0, .8, .4)', fill: 'forwards',
    });
    animationRef.current = animation;
    animation.onfinish = finish;
  }, [collapsedFrame]);

  const isOutside = (event: ReactPointerEvent<HTMLDialogElement>) => {
    if (event.target !== dialogRef.current) return false;
    const bounds = dialogRef.current!.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };

  return {
    dialogRef, closeButtonRef, requestClose,
    dialogEvents: {
      onCancel: (event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); requestClose(); },
      onPointerDown: (event: ReactPointerEvent<HTMLDialogElement>) => { outsidePointerDown.current = isOutside(event); },
      onPointerUp: (event: ReactPointerEvent<HTMLDialogElement>) => {
        const shouldClose = outsidePointerDown.current && isOutside(event);
        outsidePointerDown.current = false;
        if (shouldClose) requestClose();
      },
      onPointerCancel: () => { outsidePointerDown.current = false; },
    },
  };
}
