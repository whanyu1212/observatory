import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ChevronDown, GitBranch, GraduationCap } from 'lucide-react';
import { AgentWorkflow } from './AgentWorkflow';
import '@/styles/experience.css';

// Professional history and outcome qualifiers from Wu_Hanyu_Applied_AI.pdf.
const career = [
  {
    id: 'micron', company: 'Micron Technology', shortName: 'Micron', chapter: '01',
    role: 'Senior Data Scientist', period: 'Jan 2022 — Present', year: '2022 — Now',
    domain: 'Manufacturing · AI agents & applied AI', theme: 'lime',
    title: 'Engineering AI for the factory floor.',
    description: 'At Micron, I build diagnostic agents, evaluation workflows, and production AI systems. I work closely with process and equipment engineers to turn manufacturing problems into tools for troubleshooting, energy efficiency, and yield improvement.',
    agentFocus: {
      title: 'AI agents for manufacturing diagnostics.',
      text: 'I built graph and state-machine agents around bounded manufacturing failure modes, translating diagnostic problems into testable workflows. I also built evaluation harnesses to improve reliability, interpretability, and troubleshooting speed.',
    },
    metrics: [
      { value: '36', unit: 'hrs / week', label: 'Projected engineering time saved', context: 'Automated root-cause detection' },
      { value: 'Global', unit: 'deployment', label: 'Hundreds of manufacturing workstations', context: 'Monitoring application launched' },
      { value: '2.5%', unit: 'yield', label: 'Projected yield improvement', context: 'Consumable replacement thresholds' },
    ],
    work: [
      { title: 'Root-cause detection, from concept to production', text: 'Owned an automated root-cause detection system end to end, from the initial concept through production. The system triggers diagnostics for out-of-control manufacturing processes, with a projected saving of 36 engineering hours per week.', tags: ['Automated diagnostics', 'End-to-end ownership', 'Production delivery'] },
      { title: 'Operational visibility across the factory floor', text: 'Built and launched an Angular monitoring application covering hundreds of manufacturing workstations globally. Engineering teams gained a daily view of bottlenecks and process performance.', tags: ['Angular', 'Monitoring', 'Production delivery'] },
      { title: 'Energy efficiency with domain experts', text: 'Partnered with process and equipment engineers to develop interpretable energy-efficiency models. Their domain knowledge helped turn model outputs into actionable opportunities to reduce cost.', tags: ['Interpretable models', 'Domain collaboration'] },
      { title: 'Causal analysis for consumable replacement', text: 'Designed a causal inference analysis of manufacturing consumables and recommended replacement thresholds. The recommendations were projected to improve yield by 2.5% while reducing unnecessary replacement cost.', tags: ['Causal inference', 'Yield optimization'] },
    ],
  },
  {
    id: 'kpmg', company: 'KPMG', shortName: 'KPMG', chapter: '02',
    role: 'Data Analytics Consultant', period: 'Feb 2021 — Dec 2021', year: '2021',
    domain: 'Consulting · Tourism & education', theme: 'blue',
    title: 'Making ambiguous briefs useful.',
    description: 'I worked across tourism and education, translating stakeholder requirements into analytics prototypes, predictive tools, and dashboards people could use in their decisions.',
    metrics: [
      { value: '$1M', unit: 'engagement', label: 'Tourism analytics engagement', context: 'Prototypes and dashboards delivered' },
      { value: '9', unit: 'months', label: 'Working across the tourism sector', context: 'Hotels, attractions, and tour operators' },
    ],
    work: [
      { title: 'Analytics for tourism businesses', text: 'Delivered analytics prototypes and stakeholder-facing dashboards for a nine-month tourism engagement. Translated ambiguous requirements from hotels, attractions, and tour operators into usable data products.', tags: ['Analytics prototyping', 'Dashboards', 'Stakeholder collaboration'] },
      { title: 'Early warning for medical education', text: 'Developed an early-warning analytics tool for NUS School of Medicine. Combined rule-based detection, predictive modeling, and interpretable dashboards to help educators identify at-risk students and prioritize earlier intervention.', tags: ['Predictive modeling', 'Rule-based detection', 'Interpretability'] },
    ],
  },
  {
    id: 'stb', company: 'Singapore Tourism Board', shortName: 'Tourism Board', chapter: '03',
    role: 'Associate Data Scientist', period: 'Jun 2020 — Feb 2021', year: '2020',
    domain: 'Public sector · Research & analytics', theme: 'violet',
    title: 'Finding more signal in the data.',
    description: 'My first professional chapter explored how optimization, natural language processing, and privacy-preserving methods could improve tourism research and planning.',
    metrics: [
      { value: '~67%', unit: 'less time', label: 'Projected reduction in survey completion time', context: 'While maintaining statistical coverage' },
    ],
    work: [
      { title: 'Shorter surveys, preserved coverage', text: 'Designed a genetic-algorithm approach to survey optimization, converting long-form questionnaires into targeted micro-surveys. The approach was projected to reduce completion time by approximately 67% while maintaining statistical coverage.', tags: ['Genetic algorithms', 'Survey optimization', 'Statistics'] },
      { title: 'Understanding the experience behind a review', text: 'Built aspect-based sentiment analysis pipelines that transformed tourist reviews into insights about individual products and experiences, supporting tourism planning.', tags: ['NLP', 'Sentiment analysis', 'Data pipelines'] },
      { title: 'Exploring privacy-preserving collaboration', text: 'Prototyped differential-privacy techniques for secure cross-organization analytics and data collaboration.', tags: ['Differential privacy', 'Research prototypes'] },
    ],
  },
] as const;

const chapters = [...career.map(({ id, shortName, period }) => ({ id, label: shortName, detail: period })), { id: 'education', label: 'Education', detail: 'National University of Singapore' }];

interface Props { hidden: boolean; motionEnabled: boolean }

export function ExperiencePage({ hidden, motionEnabled }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeChapter, setActiveChapter] = useState('micron');

  useEffect(() => {
    if (hidden || !rootRef.current || typeof IntersectionObserver === 'undefined') return;
    const sections = Array.from(rootRef.current.querySelectorAll<HTMLElement>('[data-career-chapter]'));
    let observer: IntersectionObserver;
    const updateChapter = () => {
      const line = Math.round(window.innerHeight * .25) + 2;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section;
      }
      if (current) setActiveChapter(current.dataset.careerChapter!);
    };
    const observeChapters = () => {
      observer?.disconnect();
      const top = Math.round(window.innerHeight * .25);
      // Vertical percentage root margins resolve against width, so use pixels.
      observer = new IntersectionObserver(updateChapter, {
        rootMargin: `-${top}px 0px -${window.innerHeight - top - 2}px 0px`, threshold: 0,
      });
      sections.forEach(section => observer.observe(section));
      updateChapter();
    };
    observeChapters();
    window.addEventListener('resize', observeChapters);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', observeChapters);
    };
  }, [hidden]);

  const goTo = (id: string) => {
    const target = rootRef.current?.querySelector<HTMLElement>(`#career-${id}`);
    if (!target) return;
    setActiveChapter(id);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'instant', block: 'start' });
  };

  return <section ref={rootRef} className="experience" hidden={hidden} aria-labelledby="experience-title">
    <header className="experience-intro">
      <div>
        <p className="experience-label">EXPERIENCE <span>/</span> SINGAPORE</p>
        <h1 id="experience-title">Curiosity,<br /><span>applied.</span></h1>
      </div>
      <div className="experience-intro-copy">
        <p className="experience-role">Applied AI engineer & senior data scientist</p>
        <p>I build AI agents, evaluation workflows, and production data products. At Micron, I apply that work to manufacturing diagnostics, working alongside the engineers closest to the problem.</p>
        <button onClick={() => goTo('micron')} className="experience-read">Follow the work <ArrowDown size={16} aria-hidden="true" /></button>
      </div>
    </header>

    <div className="experience-route" aria-label="Career progression">
      {[...career].reverse().map(item => <button key={item.id} onClick={() => goTo(item.id)} data-tone={item.theme}>
        <span className="experience-route-year">{item.year}</span>
        <span className="experience-route-node" aria-hidden="true" />
        <strong>{item.company}</strong>
        <span className="experience-route-domain">{item.domain}</span>
      </button>)}
    </div>

    <div className="experience-layout">
      <nav className="experience-index" aria-label="Career chapters">
        <p className="experience-label">THE JOURNEY</p>
        <div className="experience-index-items">
          {chapters.map((item, index) => <button key={item.id} onClick={() => goTo(item.id)} aria-current={activeChapter === item.id ? 'location' : undefined} aria-controls={`career-${item.id}`}>
            <span className="experience-index-number">0{index + 1}</span>
            <span><strong>{item.label}</strong><small>{item.detail}</small></span>
          </button>)}
        </div>
        <p className="experience-index-note">Data. Decisions.<br />Systems people can use.</p>
      </nav>

      <div className="experience-chapters">
        {career.map(item => <article key={item.id} id={`career-${item.id}`} data-career-chapter={item.id} data-tone={item.theme} className="career-chapter" tabIndex={-1} aria-labelledby={`career-${item.id}-title`}>
          <header className="career-header">
            <div className="career-meta"><span>{item.domain}</span><span>{item.period}</span></div>
            <div className="career-employer"><div><h2 id={`career-${item.id}-title`}>{item.company}</h2><p>{item.role}</p></div><span className="career-chapter-number" aria-hidden="true">{item.chapter}</span></div>
          </header>
          <div className="career-story"><h3>{item.title}</h3><p>{item.description}</p></div>
          {'agentFocus' in item && <section className="career-agent-focus" aria-labelledby={`career-${item.id}-agents`}>
            <p className="experience-label"><GitBranch size={18} aria-hidden="true" /> AI AGENT ENGINEERING</p>
            <h4 id={`career-${item.id}-agents`}>{item.agentFocus.title}</h4>
            <p>{item.agentFocus.text}</p>
            <AgentWorkflow />
          </section>}
          <dl className="career-impact" style={{ '--metric-count': item.metrics.length } as React.CSSProperties}>
            {item.metrics.map(metric => <div key={metric.label}>
              <dt>{metric.label}<small>{metric.context}</small></dt>
              <dd><strong>{metric.value}</strong><span>{metric.unit}</span></dd>
            </div>)}
          </dl>
          <div className="career-work">
            <div className="career-work-heading"><p className="experience-label">INSIDE THE WORK</p><span>Expand to explore</span></div>
            {item.work.map((work, index) => <details key={work.title} className="career-detail" open={index === 0}>
              <summary><span className="career-detail-number">0{index + 1}</span><h4>{work.title}</h4><ChevronDown size={18} aria-hidden="true" /></summary>
              <div className="career-detail-body"><p>{work.text}</p><ul aria-label="Methods and tools">{work.tags.map(tag => <li key={tag}>{tag}</li>)}</ul></div>
            </details>)}
          </div>
        </article>)}

        <section id="career-education" data-career-chapter="education" className="career-education" tabIndex={-1} aria-labelledby="education-title">
          <p className="experience-label"><GraduationCap size={19} aria-hidden="true" /> THE FOUNDATIONS</p>
          <h2 id="education-title">Still a student<br /><span>of new things.</span></h2>
          <p className="career-university">National University of Singapore</p>
          <div className="career-degrees">
            <article><span>2023 — 2025</span><h3>Master’s in Digital Financial Technology</h3><p>Aug 2023 — Nov 2025 · Part time</p></article>
            <article><span>2016 — 2020</span><h3>Bachelor’s in Statistics</h3><p>Aug 2016 — May 2020</p></article>
          </div>
        </section>

      </div>
    </div>
  </section>;
}
