import React, { useId } from 'react';
import { useProjectDialog } from './useProjectDialog';
import { ArrowUpRight, X } from 'lucide-react';
import { projects, trails, type ProjectId } from './curiosity';
import '@/styles/field-notes.css';

export interface FieldNotesPanelProps {
  projectId: ProjectId;
  projectImage: string;
  motionEnabled: boolean;
  onClose: () => void;
}

export function FieldNotesPanel({ projectId, projectImage, motionEnabled, onClose }: FieldNotesPanelProps) {
  const { dialogRef, closeButtonRef, requestClose, dialogEvents } = useProjectDialog(projectId, motionEnabled, onClose, true);
  const titleId = useId();
  const descriptionId = useId();
  const project = projects[projectId];
  const trail = trails.find((item) => item.id === project.trail);

  return (
    <dialog
      ref={dialogRef}
      className="field-notes-panel"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-dialog-motion={motionEnabled ? 'on' : 'off'}
      {...dialogEvents}
    >
      <div className="field-notes-panel__shell">
        <header className="field-notes-panel__header">
          <div>
            <p className="field-notes-panel__kicker">THE CURIOSITY NOTEBOOK</p>
            <h2 id={titleId}>{project.name}</h2>
            <p id={descriptionId} className="field-notes-panel__trail">
              Field notes / {trail?.name ?? project.trail}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            className="field-notes-panel__close"
            type="button"
            onClick={() => requestClose()}
            aria-label={`Close field notes for ${project.name}`}
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="field-notes-panel__body">
          <section className="field-notes-panel__lead" data-page="01" aria-labelledby={`${titleId}-question`}>
            <p className="field-notes-panel__label">01 / THE QUESTION</p>
            <h3 id={`${titleId}-question`}>{project.question}</h3>
            <p className="field-notes-panel__annotation">The starting point.</p>
          </section>

          <section data-page="02" aria-labelledby={`${titleId}-approach`}>
            <p className="field-notes-panel__label">02 / THE APPROACH</p>
            <h3 id={`${titleId}-approach`}>Following the question</h3>
            <p>{project.description}</p>
            <ol className="field-notes-panel__flow" aria-label={`${project.name} project workflow`}>
              {project.flow.map((step, index) => (
                <li key={step}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{step}</strong>
                </li>
              ))}
            </ol>
          </section>

          {projectId === 'gem-dota' && (
            <figure className="field-notes-panel__figure">
              <img
                src={projectImage}
                alt="Gem Dota visualization of player movement reconstructed from a replay"
              />
              <figcaption>Player movement, reconstructed from a replay.</figcaption>
            </figure>
          )}

          <section data-page="03" aria-labelledby={`${titleId}-closer-look`}>
            <p className="field-notes-panel__label">03 / WORKING NOTES</p>
            <h3 id={`${titleId}-closer-look`}>A closer look</h3>
            <p>{project.detail}</p>
          </section>

          <section className="field-notes-panel__next" data-page="04" aria-labelledby={`${titleId}-next-question`}>
            <p className="field-notes-panel__label">04 / THE NEXT QUESTION</p>
            <h3 id={`${titleId}-next-question`}>{project.nextQuestion}</h3>
            <p className="field-notes-panel__annotation">To keep thinking about.</p>
          </section>

          <footer className="field-notes-panel__footer">
            <a href={project.repository} target="_blank" rel="noreferrer">
              Explore the repository <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            {project.docs && (
              <a href={project.docs} target="_blank" rel="noreferrer">
                Read the documentation <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </footer>
        </div>
      </div>
    </dialog>
  );
}
