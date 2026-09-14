import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { GemReplay } from './GemReplay';
import '@/styles/gem-challenge.css';

export interface GemChallengeProps {
  mapImage: string;
  motionEnabled: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const stages = [
  {
    label: 'Decode',
    title: 'Replay bytes become game state.',
    body: 'Gem reads the binary replay stream and turns protobuf messages into structured events that Python can inspect.',
  },
  {
    label: 'Reconstruct',
    title: 'Every player leaves a trail.',
    body: 'Position updates are assembled into movement paths, preserving who moved, where they went, and when it happened.',
  },
  {
    label: 'Explore',
    title: 'A match becomes a question you can see.',
    body: 'The report layers all ten player paths over the map and adds timeline controls, making rotations and team movement easier to investigate.',
  },
] as const;

export function GemChallenge({ mapImage, motionEnabled, onClose, onComplete }: GemChallengeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const completedRef = useRef(false);
  const [stage, setStage] = useState(0);
  const titleId = useId();
  const descriptionId = useId();

  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    if (!dialog) return;

    document.body.style.overflow = 'hidden';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  const selectStage = (index: number) => {
    setStage(index);
    if (index === stages.length - 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  const current = stages[stage];

  return (
    <dialog
      ref={dialogRef}
      className="gem-challenge"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
    >
      <div className="gem-challenge__shell">
        <header className="gem-challenge__header">
          <div>
            <p className="gem-challenge__kicker">GEM DOTA / REAL REPLAY OUTPUT</p>
            <h2 id={titleId}>See what Gem reconstructs.</h2>
          </div>
          <button ref={closeButtonRef} className="gem-challenge__close" type="button" onClick={onClose} aria-label="Close replay walkthrough">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <p id={descriptionId} className="gem-challenge__brief">
          Scrub through a real match, highlight a hero, and follow their movement. Then explore how Gem turns replay bytes into player paths.
        </p>

        <div className="gem-challenge__meta" aria-label="Replay walkthrough information">
          <span>ACTUAL GEM DOTA REPORT</span>
          <span>REPLAY BYTES → PLAYER PATHS → QUESTIONS</span>
        </div>

        <GemReplay mapImage={mapImage} motionEnabled={motionEnabled} />

        <div className="gem-challenge__stages" role="group" aria-label="How Gem Dota reads a replay">
          {stages.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={stage === index}
              aria-controls={`${titleId}-stage`}
              className={stage === index ? 'is-active' : ''}
              onClick={() => selectStage(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.label}
            </button>
          ))}
        </div>

        <section id={`${titleId}-stage`} className="gem-challenge__explanation" aria-live="polite">
          <p>{current.label.toUpperCase()}</p>
          <h3>{current.title}</h3>
          <div>
            <p>{current.body}</p>
            {stage < stages.length - 1 && <button type="button" onClick={() => selectStage(stage + 1)}>Continue <ArrowUpRight size={14} aria-hidden="true" /></button>}
          </div>
        </section>

        <footer className="gem-challenge__footer">
          <p>Built to make Dota 2 replay data readable, inspectable, and useful for new analysis.</p>
          <div>
            <a href="https://whanyu1212.github.io/gem-dota/" target="_blank" rel="noreferrer">Read the docs <ArrowUpRight size={13} aria-hidden="true" /></a>
            <a href="https://github.com/whanyu1212/gem-dota" target="_blank" rel="noreferrer">View on GitHub <ArrowUpRight size={13} aria-hidden="true" /></a>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
