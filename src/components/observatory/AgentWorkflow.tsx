import { useId, useState } from 'react';
import { GitBranch, ScanSearch, ListChecks } from 'lucide-react';

const steps = [
  { label: 'Define the problem', Icon: ScanSearch, title: 'Start with a bounded failure mode.', text: 'Work with process and equipment engineers to frame manufacturing problems as specific diagnostic workflows.' },
  { label: 'Build the agent', Icon: GitBranch, title: 'Make the diagnostic reasoning explicit.', text: 'Build graph and state-machine agents around those failure modes, turning diagnostic problems into testable workflows.' },
  { label: 'Evaluate & refine', Icon: ListChecks, title: 'Make reliability part of the work.', text: 'Build evaluation harnesses to assess and improve the reliability, interpretability, and speed of diagnostic workflows.' },
];

export function AgentWorkflow() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const step = steps[selected];
  return <div className="agent-workflow">
    <div className="agent-workflow-steps" role="group" aria-label="Explore my approach to diagnostic agents">
      {steps.map(({ label, Icon }, index) => <button key={label} type="button" aria-pressed={selected === index} aria-controls={`${id}-detail`} onClick={() => setSelected(index)}>
        <span className="agent-workflow-step-number">0{index + 1}</span><Icon size={24} aria-hidden="true" /><strong>{label}</strong>
      </button>)}
    </div>
    <div id={`${id}-detail`} className="agent-workflow-detail" aria-live="polite" aria-atomic="true"><strong>{step.title}</strong><p>{step.text}</p></div>
    <p className="agent-workflow-caption">An overview of my approach to agent engineering.</p>
  </div>;
}
