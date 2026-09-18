import type { Ref } from 'react';
import { projects, trails, type ProjectId } from './curiosity';
import { ProjectRippleImage } from './ProjectRippleImage';

interface ProjectTerminalContentProps {
  projectId: ProjectId;
  project: (typeof projects)[ProjectId];
  titleId: string;
  descriptionId: string;
  motionEnabled: boolean;
  closeButtonRef: Ref<HTMLButtonElement>;
  onClose: () => void;
}

export function ProjectTerminalContent({ projectId, project, titleId, descriptionId, motionEnabled, closeButtonRef, onClose }: ProjectTerminalContentProps) {
  const trail = trails.find((item) => item.id === project.trail);
  const nameLength = project.name.length;
  const nameClass = nameLength > 18 ? 'project-terminal__name--long' : nameLength > 10 ? 'project-terminal__name--medium' : '';

  return (
    <div className="project-terminal">
      <header className="project-terminal__bar">
        <div className="project-terminal__lights">
          <button ref={closeButtonRef} className="project-terminal__close" type="button" onClick={onClose} aria-label={`Close ${project.name} project view`}>
            <span aria-hidden="true" />
          </button>
          <span className="project-terminal__light project-terminal__light--yellow" aria-hidden="true" />
          <span className="project-terminal__light project-terminal__light--green" aria-hidden="true" />
        </div>
        <span className="project-terminal__path" title={`~/projects/${projectId}`}>~/projects/{projectId}</span>
        <span className="project-terminal__file">README.md</span>
      </header>

      <div className="project-terminal__body">
        <p className="project-terminal__command"><span>hanyu@observatory</span> <span aria-hidden="true">›</span> cat README.md</p>

        <div className="project-terminal__intro">
          <div>
            <p className="project-terminal__eyebrow">{trail?.name ?? project.trail}</p>
            <h2 id={titleId} className={nameClass}>{project.name}</h2>
            <p className="project-terminal__tagline">{project.title.join(' ')}</p>
          </div>
          <p id={descriptionId} className="project-terminal__description">{project.description}</p>
        </div>

        <div className="project-terminal__keywords" aria-label="Project keywords">
          <span className="project-terminal__keywords-label">keyword:</span>
          <div>{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <section className="project-terminal__gallery" aria-label={`${project.name} project screenshots`}>
          {project.gallery.map((image, index) => (
            <figure className="project-terminal__preview" key={image.src}>
              <ProjectRippleImage
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                loading={index === 0 ? 'eager' : 'lazy'}
                motionEnabled={motionEnabled}
              />
              <figcaption>
                <span>{image.label}</span>
                {image.caption && <span>{image.caption}</span>}
              </figcaption>
            </figure>
          ))}
        </section>
      </div>

      <footer className="project-terminal__footer">
        <div className="project-terminal__links">
          <a href={project.repository} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span> open github</a>
          {project.docs && <a href={project.docs} target="_blank" rel="noreferrer"><span aria-hidden="true">↗</span> read docs</a>}
        </div>
        <span className="project-terminal__hint">esc to close</span>
      </footer>
    </div>
  );
}
