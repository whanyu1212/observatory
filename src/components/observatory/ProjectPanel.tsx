import React, { lazy, Suspense, useId } from 'react';
import { useProjectDialog } from './useProjectDialog';
import { ArrowUpRight, BookOpen, X } from 'lucide-react';
import { projects, trails, type ProjectId } from './curiosity';
import '@/styles/project-panel.css';

const GemReplay = lazy(() => import('./GemReplay').then(module => ({ default: module.GemReplay })));

interface ProjectPanelProps {
  projectId: ProjectId;
  mapImage: string;
  motionEnabled: boolean;
  onClose: () => void;
  onReadNotes: (id: ProjectId) => void;
}

export function ProjectPanel({ projectId, mapImage, motionEnabled, onClose, onReadNotes }: ProjectPanelProps) {
  const { dialogRef, closeButtonRef, requestClose, dialogEvents } = useProjectDialog(projectId, motionEnabled, onClose);
  const titleId = useId();
  const descriptionId = useId();
  const project = projects[projectId];
  const trail = trails.find((item) => item.id === project.trail);

  return (
    <dialog
      ref={dialogRef}
      className="project-panel"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-dialog-motion={motionEnabled ? 'on' : 'off'}
      {...dialogEvents}
    >
      <div className="project-panel__shell">
        <header className="project-panel__header">
          <div>
            <p className="project-panel__kicker">FEATURED PROJECT / CASE STUDY</p>
            <p className="project-panel__trail">{trail?.name ?? project.trail}</p>
          </div>
          <button ref={closeButtonRef} className="project-panel__close" type="button" onClick={() => requestClose()} aria-label={`Close ${project.name} case study`}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="project-panel__body">
          <section className="project-panel__intro">
            <p className="project-panel__number">PROJECT / {project.name.toUpperCase()}</p>
            <h2 id={titleId}>{project.title[0]}<br /><span>{project.title[1]}</span></h2>
            <p id={descriptionId}>{project.description}</p>
            <div className="project-panel__stack">{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
          </section>

          {projectId === 'gem-dota' ? (
            <Suspense fallback={<p role="status">Loading recorded match positions…</p>}><GemReplay mapImage={mapImage} motionEnabled={motionEnabled} /></Suspense>
          ) : (
            <section className="project-panel__diagram" aria-labelledby={`${titleId}-question`}>
              <p>A QUESTION, MADE TANGIBLE</p>
              <h3 id={`${titleId}-question`}>{project.question}</h3>
              <ol>{project.flow.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>)}</ol>
            </section>
          )}

          <section className="project-panel__detail">
            <div><p>THE WORK</p><h3>What I explored</h3></div>
            <p>{project.detail}</p>
          </section>

          <section className="project-panel__next">
            <p>THE NEXT QUESTION</p>
            <h3>{project.nextQuestion}</h3>
          </section>

          <footer className="project-panel__footer">
            <button type="button" onClick={() => requestClose(() => onReadNotes(projectId))}><BookOpen size={16} aria-hidden="true" /> Read field notes</button>
            <a className="is-primary" href={project.repository} target="_blank" rel="noreferrer">Explore the code <ArrowUpRight size={16} aria-hidden="true" /></a>
            {project.docs && <a href={project.docs} target="_blank" rel="noreferrer">Read the docs <ArrowUpRight size={15} aria-hidden="true" /></a>}
          </footer>
        </div>
      </div>
    </dialog>
  );
}
