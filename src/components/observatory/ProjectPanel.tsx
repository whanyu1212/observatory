import { useId } from 'react';
import { useProjectDialog } from './useProjectDialog';
import { projects, type ProjectId } from './curiosity';
import { ProjectTerminalContent } from './ProjectTerminalContent';
import '@/styles/project-panel.css';

interface ProjectPanelProps {
  projectId: ProjectId;
  motionEnabled: boolean;
  onClose: () => void;
}

export function ProjectPanel({ projectId, motionEnabled, onClose }: ProjectPanelProps) {
  const { dialogRef, closeButtonRef, requestClose, dialogEvents } = useProjectDialog(projectId, motionEnabled, onClose);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={dialogRef}
      className="project-panel"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-dialog-motion={motionEnabled ? 'on' : 'off'}
      {...dialogEvents}
    >
      <ProjectTerminalContent
        projectId={projectId}
        project={projects[projectId]}
        titleId={titleId}
        descriptionId={descriptionId}
        motionEnabled={motionEnabled}
        closeButtonRef={closeButtonRef}
        onClose={requestClose}
      />
    </dialog>
  );
}
