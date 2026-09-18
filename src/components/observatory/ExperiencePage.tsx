import { ChevronDown, GraduationCap } from 'lucide-react';
import { AgentWorkflow } from './AgentWorkflow';
import '@/styles/experience.css';

// Professional history and outcome qualifiers from Wu_Hanyu_Applied_AI.pdf.
const career = [
  {
    id: 'micron', company: 'Micron Technology',
    role: 'Senior Data Scientist', period: 'Jan 2022 — Present',
    domain: 'Manufacturing · AI agents & applied AI', theme: 'lime',
    description: 'Diagnostic agents, evaluation workflows, and production AI for manufacturing, built with process and equipment engineers.',
    agentFocus: {
      title: 'Manufacturing diagnostic agents',
      text: 'I built graph and state-machine agents around bounded manufacturing failure modes, translating diagnostic problems into testable workflows. I also built evaluation harnesses to improve reliability, interpretability, and troubleshooting speed.',
    },
    work: [
      { title: 'Automated root-cause detection', outcome: 'Projected saving: 36 engineering hours / week', text: 'Owned an automated root-cause detection system end to end, from the initial concept through production. The system triggers diagnostics for out-of-control manufacturing processes, with a projected saving of 36 engineering hours per week.', tags: ['Automated diagnostics', 'End-to-end ownership', 'Production delivery'] },
      { title: 'Global workstation monitoring', outcome: 'Deployed across hundreds of manufacturing workstations', text: 'Built and launched an Angular monitoring application covering hundreds of manufacturing workstations globally. Engineering teams gained a daily view of bottlenecks and process performance.', tags: ['Angular', 'Monitoring', 'Production delivery'] },
      { title: 'Energy-efficiency modeling', text: 'Partnered with process and equipment engineers to develop interpretable energy-efficiency models. Their domain knowledge helped turn model outputs into actionable opportunities to reduce cost.', tags: ['Interpretable models', 'Domain collaboration'] },
      { title: 'Consumable replacement analysis', outcome: 'Projected yield improvement: 2.5%', text: 'Designed a causal inference analysis of manufacturing consumables and recommended replacement thresholds. The recommendations were projected to improve yield by 2.5% while reducing unnecessary replacement cost.', tags: ['Causal inference', 'Yield optimization'] },
    ],
  },
  {
    id: 'kpmg', company: 'KPMG',
    role: 'Data Analytics Consultant', period: 'Feb 2021 — Dec 2021',
    domain: 'Consulting · Tourism & education', theme: 'blue',
    description: 'Analytics prototypes, predictive tools, and dashboards for tourism and education, shaped around stakeholder needs.',
    work: [
      { title: 'Tourism analytics and dashboards', outcome: '$1M engagement · 9 months', text: 'Delivered analytics prototypes and stakeholder-facing dashboards for a nine-month tourism engagement. Translated ambiguous requirements from hotels, attractions, and tour operators into usable data products.', tags: ['Analytics prototyping', 'Dashboards', 'Stakeholder collaboration'] },
      { title: 'Early warning for medical education', outcome: 'NUS School of Medicine', text: 'Developed an early-warning analytics tool for NUS School of Medicine. Combined rule-based detection, predictive modeling, and interpretable dashboards to help educators identify at-risk students and prioritize earlier intervention.', tags: ['Predictive modeling', 'Rule-based detection', 'Interpretability'] },
    ],
  },
  {
    id: 'stb', company: 'Singapore Tourism Board',
    role: 'Associate Data Scientist', period: 'Jun 2020 — Feb 2021',
    domain: 'Public sector · Research & analytics', theme: 'violet',
    description: 'Optimization, natural language processing, and privacy-preserving analytics for tourism research and planning.',
    work: [
      { title: 'Survey optimization', outcome: 'Projected completion time reduction: ~67%, preserving coverage', text: 'Designed a genetic-algorithm approach to survey optimization, converting long-form questionnaires into targeted micro-surveys. The approach was projected to reduce completion time by approximately 67% while maintaining statistical coverage.', tags: ['Genetic algorithms', 'Survey optimization', 'Statistics'] },
      { title: 'Aspect-based sentiment analysis', text: 'Built aspect-based sentiment analysis pipelines that transformed tourist reviews into insights about individual products and experiences, supporting tourism planning.', tags: ['NLP', 'Sentiment analysis', 'Data pipelines'] },
      { title: 'Privacy-preserving data collaboration', text: 'Prototyped differential-privacy techniques for secure cross-organization analytics and data collaboration.', tags: ['Differential privacy', 'Research prototypes'] },
    ],
  },
] as const;

export function ExperiencePage() {
  return <section className="experience" aria-labelledby="experience-title">
    <header className="experience-intro">
      <div>
        <p className="experience-label">EXPERIENCE <span>/</span> SINGAPORE</p>
        <h1 id="experience-title">Curiosity, <span>applied.</span></h1>
      </div>
      <div className="experience-intro-copy">
        <p className="experience-role">Applied AI engineer &amp; senior data scientist</p>
        <p>AI agents, analytics, and production systems across manufacturing, consulting, and tourism.</p>
      </div>
    </header>

    <div className="experience-entries">
      {career.map(item => <article key={item.id} id={`career-${item.id}`} data-tone={item.theme} className="career-entry" aria-labelledby={`career-${item.id}-title`}>
        <header className="career-header">
          <p className="career-period">{item.period}</p>
          <h2 id={`career-${item.id}-title`}>{item.company}</h2>
          <p className="career-role">{item.role}</p>
          <p className="career-domain">{item.domain}</p>
        </header>
        <div className="career-content">
          <p className="career-summary">{item.description}</p>
          <ul className="career-work-list" aria-label={`Work at ${item.company}`} role="list">
            {'agentFocus' in item && <li>
              <details className="career-point">
                <summary>
                  <span className="career-point-bullet" aria-hidden="true" />
                  <span className="career-point-title">{item.agentFocus.title}</span>
                  <ChevronDown size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <div className="career-point-body">
                  <p>{item.agentFocus.text}</p>
                  <AgentWorkflow />
                </div>
              </details>
            </li>}
            {item.work.map(work => <li key={work.title}>
              <details className="career-point">
                <summary>
                  <span className="career-point-bullet" aria-hidden="true" />
                  <span className="career-point-copy">
                    <span className="career-point-title">{work.title}</span>
                    {'outcome' in work && <span className="career-point-outcome">{work.outcome}</span>}
                  </span>
                  <ChevronDown size={20} strokeWidth={2.5} aria-hidden="true" />
                </summary>
                <div className="career-point-body">
                  <p>{work.text}</p>
                  <ul className="career-point-tags" aria-label="Methods and tools">{work.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
                </div>
              </details>
            </li>)}
          </ul>
        </div>
      </article>)}

      <section id="career-education" className="career-entry career-education" aria-labelledby="education-title">
        <header className="career-header">
          <p className="experience-label"><GraduationCap size={17} aria-hidden="true" /> EDUCATION</p>
          <h2 id="education-title">National University of Singapore</h2>
        </header>
        <div className="career-degrees">
          <article><h3>Master’s in Digital Financial Technology</h3><p>Aug 2023 — Nov 2025 <span>· Part time</span></p></article>
          <article><h3>Bachelor’s in Statistics</h3><p>Aug 2016 — May 2020</p></article>
        </div>
      </section>
    </div>
  </section>;
}
