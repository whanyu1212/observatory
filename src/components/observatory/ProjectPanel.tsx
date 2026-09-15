import React, { useId } from 'react';
import { useProjectDialog } from './useProjectDialog';
import { ArrowUpRight, BookOpen, X } from 'lucide-react';
import { projects, trails, type ProjectId } from './curiosity';
import '@/styles/project-panel.css';

interface ProjectPanelProps {
  projectId: ProjectId;
  motionEnabled: boolean;
  onClose: () => void;
  onReadNotes: (id: ProjectId) => void;
}

export function ProjectPanel({ projectId, motionEnabled, onClose, onReadNotes }: ProjectPanelProps) {
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
            <p className="project-panel__kicker">FEATURED PROJECT / REPOSITORY</p>
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

          <section className="project-panel__gallery" aria-label={`${project.name} project screenshots`}>
            {project.gallery.map((image, index) => (
              <figure className="project-panel__preview" key={image.src}>
                <div className="project-panel__preview-bar"><span />{image.label}<em>{String(index + 1).padStart(2, '0')} / {String(project.gallery.length).padStart(2, '0')}</em></div>
                <img src={image.src} alt={image.alt} loading={index === 0 ? 'eager' : 'lazy'} />
                {image.caption && <figcaption>{image.caption}</figcaption>}
              </figure>
            ))}
          </section>

          <footer className="project-panel__footer">
            <button type="button" onClick={() => requestClose(() => onReadNotes(projectId))}><BookOpen size={16} aria-hidden="true" /> Read field notes</button>
            <a className="is-primary" href={project.repository} target="_blank" rel="noreferrer">View on GitHub <ArrowUpRight size={16} aria-hidden="true" /></a>
            {project.docs && <a href={project.docs} target="_blank" rel="noreferrer">Read the docs <ArrowUpRight size={15} aria-hidden="true" /></a>}
          </footer>
        </div>
      </div>
    </dialog>
  );
}
