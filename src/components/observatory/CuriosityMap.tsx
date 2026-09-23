import React, { useEffect, useId, useRef, useState } from 'react';
import type { PublicProjectId as ProjectId, TrailId } from './curiosity';
import { projects, trails } from './curiosity';
import { BackgroundStars } from './BackgroundStars';
import '@/styles/curiosity-map.css';

export interface CuriosityMapProps {
  activeTrail: TrailId;
  selectedProject: ProjectId;
  onSelectTrail: (id: TrailId) => void;
  onSelectProject: (id: ProjectId) => void;
  motionEnabled: boolean;
  expanded: boolean;
}

const projectOrder: ProjectId[] = [
  'gem-dota', 'nimble', 'wisp', 'fractional-bonds', 'krill', 'opencouch',
  'shipping-ml', 'quantrl', 'mental-gym', 'claude-code-anatomy',
];

const trailLabels: Record<TrailId, string> = {
  replays: 'Gaming',
  agents: 'AI agents',
  systems: 'Applied systems',
  learning: 'Learning to learn',
};

const trailPositions: Record<TrailId, { x: number; y: number }> = {
  replays: { x: 26, y: 31.25 },
  agents: { x: 72, y: 45 },
  systems: { x: 26, y: 54 },
  learning: { x: 43, y: 77 },
};

const projectPositions: Record<ProjectId, { x: number; y: number }> = {
  'gem-dota': { x: 10, y: 15 },
  wisp: { x: 88, y: 22 },
  krill: { x: 89, y: 53 },
  opencouch: { x: 82, y: 64 },
  nimble: { x: 66, y: 14 },
  'fractional-bonds': { x: 14, y: 41.5 },
  'shipping-ml': { x: 14, y: 66 },
  quantrl: { x: 15, y: 87 },
  'mental-gym': { x: 52, y: 87 },
  'claude-code-anatomy': { x: 89, y: 37 },
};

export function CuriosityMap({
  activeTrail,
  selectedProject,
  onSelectTrail,
  onSelectProject,
  motionEnabled,
  expanded,
}: CuriosityMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [canAnimate, setCanAnimate] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<ProjectId | null>(null);
  const [focusedProject, setFocusedProject] = useState<ProjectId | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectId | null>(null);
  const preview = previewProject ? projects[previewProject] : null;
  const uid = useId().replace(/:/g, '');
  const glowId = `${uid}-atlas-glow`;
  const mobileGlowId = `${uid}-atlas-glow-mobile`;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let isVisible = !document.hidden;
    let isIntersecting = true;
    const sync = () => setCanAnimate(motionEnabled && isVisible && isIntersecting);
    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      sync();
    };
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? false;
      sync();
    }, { threshold: 0.05 });

    observer.observe(root);
    document.addEventListener('visibilitychange', onVisibilityChange);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [motionEnabled]);

  return (
    <div className="curiosity-atlas">
    <div
      ref={rootRef}
      className={`curiosity-map ${expanded ? 'is-expanded' : ''} ${canAnimate ? 'is-moving' : ''}`}
      data-active-trail={activeTrail}
      data-preview-trail={preview?.trail}
      role="group"
      aria-label="A star atlas of Hanyu Wu's curiosity, connecting four trails to nine featured projects"
    >
      <BackgroundStars variant="map" motionEnabled={canAnimate} />

      <svg className="curiosity-map__field curiosity-map__field--desktop" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0" stopColor="var(--obs-accent)" stopOpacity=".16" />
            <stop offset=".32" stopColor="var(--trail-learning)" stopOpacity=".05" />
            <stop offset="1" stopColor="var(--obs-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse className="curiosity-map__aura" cx="500" cy="360" rx="330" ry="255" fill={`url(#${glowId})`} />

        <g className="curiosity-map__nebulae">
          <path className="curiosity-map__nebula curiosity-map__nebula--replays" d="M-62 178C34 64 164 17 292 62c85 30 153 91 169 158-89-15-174 11-251 69C107 367 1 326-62 178Z" />
          <path className="curiosity-map__nebula curiosity-map__nebula--agents" d="M542 26c147-66 334-30 459 84l42 293c-100 59-210 66-315 9-99-53-121-128-112-209-50-49-74-108-74-177Z" />
          <path className="curiosity-map__nebula curiosity-map__nebula--systems" d="M-36 316c118-53 275-45 381 37 74 57 102 131 69 205-67 79-179 125-314 120L-31 568Z" />
          <path className="curiosity-map__nebula curiosity-map__nebula--learning" d="M151 578c126-74 253-85 379-32 96 40 184 112 227 196H128c-29-56-22-111 23-164Z" />
        </g>

        <g className="curiosity-map__wisps">
          <path className="curiosity-map__wisp curiosity-map__wisp--replays" d="M-20 268C98 112 255 87 421 194C321 162 217 204 145 296" />
          <path className="curiosity-map__wisp curiosity-map__wisp--agents" d="M575 90c118-50 282-3 395 132M626 435c111-75 247-76 388-3" />
          <path className="curiosity-map__wisp curiosity-map__wisp--systems" d="M-10 425c116-77 247-67 373 28M17 577c95-43 197-37 310 29" />
          <path className="curiosity-map__wisp curiosity-map__wisp--learning" d="M193 691c130-92 287-106 459-39" />
        </g>

        <g className="curiosity-map__contours">
          <path d="M73 235c73-118 183-162 320-132M778 63c99 17 170 68 213 154M931 498c-54 117-140 181-260 194M80 679c88 25 173 18 256-22" />
          <path d="M46 289c102-123 227-151 374-82M691 93c109-10 204 30 286 121M988 540c-78 104-176 147-294 130M33 618c91 52 193 59 304 20" />
          <path d="M156 93c84-28 169-17 256 34M852 168c61 25 105 68 133 129M856 630c-58 40-120 55-188 46M91 499c78 70 167 91 269 63" />
        </g>

        <g className="curiosity-map__paths">
          <path className="curiosity-map__path curiosity-map__path--replays" pathLength="1" d="M500 360C420 332 348 280 260 225S153 128 100 108" />
          <path className="curiosity-map__path curiosity-map__path--agents" pathLength="1" d="M500 360C585 351 648 335 720 324" />
          <path className="curiosity-map__path curiosity-map__path--agents" pathLength="1" d="M720 324C773 270 824 210 880 158" />
          <path className="curiosity-map__path curiosity-map__path--agents" pathLength="1" d="M720 324C775 350 835 372 890 382" />
          <path className="curiosity-map__path curiosity-map__path--agents" pathLength="1" d="M720 324C750 371 780 421 820 461" />
          <path className="curiosity-map__path curiosity-map__path--agents" pathLength="1" d="M720 324C698 246 682 169 660 101" />
          <path className="curiosity-map__path curiosity-map__path--systems" pathLength="1" d="M500 360C410 358 334 373 260 389" />
          <path className="curiosity-map__path curiosity-map__path--systems" pathLength="1" d="M260 389C215 354 179 322 140 299" />
          <path className="curiosity-map__path curiosity-map__path--systems" pathLength="1" d="M260 389C220 426 183 456 140 475" />
          <path className="curiosity-map__path curiosity-map__path--learning" pathLength="1" d="M500 360C472 427 454 493 430 554" />
          <path className="curiosity-map__path curiosity-map__path--learning" pathLength="1" d="M430 554C340 580 242 608 150 626" />
          <path className="curiosity-map__path curiosity-map__path--learning" pathLength="1" d="M430 554C452 584 485 612 520 626" />
        </g>

        <g className="curiosity-map__frontier">
          <path d="M500 360C604 422 641 509 706 566s144 55 221 87" />
          <path d="M706 566c35-14 65-48 91-91M706 566c19 39 63 75 119 99" />
          <circle cx="797" cy="475" r="3" /><circle cx="825" cy="665" r="3" /><circle cx="927" cy="653" r="3" />
        </g>

        <g className="curiosity-map__expanded-structure">
          <path d="M260 225c42-12 70-43 92-88M720 324c-7-72 6-143 39-213M720 324c62 24 115 70 160 137M260 389c-34 3-69-6-102-26M430 554c62 3 113 17 158 42" />
          <text x="275" y="145">EVENTS → PATHS</text>
          <text x="726" y="132">TOOLS + MEMORY</text>
          <text x="764" y="430">RUNTIMES → COMPANIONS</text>
          <text x="106" y="352">MARKETS → MODELS</text>
          <text x="620" y="596">OBSERVE → ACT → FEEDBACK</text>
        </g>

        <g className="curiosity-map__travelers">
          {canAnimate && <>
            <circle className="curiosity-map__traveler curiosity-map__traveler--replays" r="3"><animateMotion dur="8s" repeatCount="indefinite" path="M500 360C420 332 348 280 260 225S153 128 100 108" /></circle>
            <circle className="curiosity-map__traveler curiosity-map__traveler--agents" r="2.5"><animateMotion dur="10s" begin="1.9s" repeatCount="indefinite" path="M500 360C585 351 648 335 720 324C773 270 824 210 880 158" /></circle>
            <circle className="curiosity-map__traveler curiosity-map__traveler--systems" r="2.5"><animateMotion dur="9.5s" begin=".8s" repeatCount="indefinite" path="M500 360C410 358 334 373 260 389C220 426 183 456 140 475" /></circle>
            <circle className="curiosity-map__traveler curiosity-map__traveler--learning" r="2.5"><animateMotion dur="9s" begin="3.6s" repeatCount="indefinite" path="M500 360C472 427 454 493 430 554C340 580 242 608 150 626" /></circle>
          </>}
        </g>
      </svg>

      <svg className="curiosity-map__field curiosity-map__field--mobile" viewBox="0 0 320 780" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id={mobileGlowId}>
            <stop offset="0" stopColor="var(--obs-accent)" stopOpacity=".14" />
            <stop offset=".4" stopColor="var(--trail-learning)" stopOpacity=".045" />
            <stop offset="1" stopColor="var(--obs-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse className="curiosity-map__aura" cx="160" cy="390" rx="130" ry="210" fill={`url(#${mobileGlowId})`} />
        <g className="curiosity-map__nebulae">
          <path className="curiosity-map__nebula curiosity-map__nebula--replays" d="M-27 18c94-35 180 31 201 146 12 65-17 129-85 170C14 303-20 196-27 18Z" />
          <path className="curiosity-map__nebula curiosity-map__nebula--agents" d="M171 28c95-40 170 46 177 177l-8 335c-70 31-132-15-151-117-15-80 7-141 47-183-47-70-68-141-65-212Z" />
          <path className="curiosity-map__nebula curiosity-map__nebula--systems" d="M-33 314c101-31 174 32 178 154 4 111-59 194-163 210Z" />
          <path className="curiosity-map__nebula curiosity-map__nebula--learning" d="M21 599c95-51 208-30 318 81v123H8c-19-81-15-149 13-204Z" />
        </g>
        <g className="curiosity-map__wisps">
          <path className="curiosity-map__wisp curiosity-map__wisp--replays" d="M-8 256C56 124 120 101 184 188" />
          <path className="curiosity-map__wisp curiosity-map__wisp--agents" d="M173 109c70-45 127 19 167 142M191 448c47-61 98-54 153 13" />
          <path className="curiosity-map__wisp curiosity-map__wisp--systems" d="M-6 420c58-59 108-42 151 50" />
          <path className="curiosity-map__wisp curiosity-map__wisp--learning" d="M21 705c87-70 185-62 294 24" />
        </g>
        <g className="curiosity-map__contours">
          <path d="M7 228c41-95 96-124 165-86M246 49c45 34 70 88 76 163M295 537c-17 66-53 109-109 130M1 618c45 39 92 48 142 29" />
          <path d="M-2 278c55-90 115-104 181-42M218 70c54 29 86 79 99 152M315 563c-32 66-77 100-136 103M-4 566c45 57 96 78 153 60" />
        </g>
        <g className="curiosity-map__paths">
          <path className="curiosity-map__path curiosity-map__path--replays" pathLength="1" d="M160 390C126 345 101 282 80 226S61 143 58 101" />
          <path className="curiosity-map__path curiosity-map__path--agents" pathLength="1" d="M160 390C190 371 220 344 250 320M250 320C259 272 266 224 269 187M250 320C261 355 266 386 269 421M250 320C253 391 252 465 250 523M250 320C242 238 232 156 221 94" />
          <path className="curiosity-map__path curiosity-map__path--systems" pathLength="1" d="M160 390C130 411 101 440 70 476M70 476C64 414 61 358 64 312M70 476C65 506 61 539 58 562" />
          <path className="curiosity-map__path curiosity-map__path--learning" pathLength="1" d="M160 390C160 478 162 559 166 624M166 624C132 644 91 665 58 679M166 624C197 646 228 666 256 679" />
        </g>
        <g className="curiosity-map__frontier">
          <path d="M160 390c38 38 62 113 85 157s39 41 57 69M245 547c18-20 28-45 36-75M245 547c4 31 17 57 35 82" />
          <circle cx="281" cy="472" r="2" /><circle cx="280" cy="629" r="2" /><circle cx="302" cy="616" r="2" />
        </g>
        <g className="curiosity-map__expanded-structure">
          <path d="M80 226c16-10 26-28 31-54M250 320c-3-58 1-110 11-151M250 320c20 45 30 99 31 159M70 476c-17 3-32 13-45 29M166 624c13 6 26 19 36 39" />
        </g>
        <g className="curiosity-map__travelers">
          {canAnimate && <>
            <circle className="curiosity-map__traveler curiosity-map__traveler--replays" r="2.5"><animateMotion dur="8s" repeatCount="indefinite" path="M160 390C126 345 101 282 80 226S61 143 58 101" /></circle>
            <circle className="curiosity-map__traveler curiosity-map__traveler--agents" r="2"><animateMotion dur="10s" begin="1.9s" repeatCount="indefinite" path="M160 390C190 371 220 344 250 320C259 272 266 224 269 187" /></circle>
            <circle className="curiosity-map__traveler curiosity-map__traveler--systems" r="2"><animateMotion dur="9.5s" begin=".8s" repeatCount="indefinite" path="M160 390C130 411 101 440 70 476C65 506 61 539 58 562" /></circle>
            <circle className="curiosity-map__traveler curiosity-map__traveler--learning" r="2"><animateMotion dur="9s" begin="3.6s" repeatCount="indefinite" path="M160 390C160 478 162 559 166 624C132 644 91 665 58 679" /></circle>
          </>}
        </g>
      </svg>

      <div className="curiosity-map__origin" aria-hidden="true">
        <span className="curiosity-map__origin-star" />
        <span className="curiosity-map__origin-copy">YOU ARE HERE</span>
        <span className="curiosity-map__origin-name">Hanyu</span>
      </div>

      {trails.map((trail, index) => (
        <button
          key={trail.id}
          type="button"
          className="curiosity-map__trail"
          style={{ '--map-x': `${trailPositions[trail.id].x}%`, '--map-y': `${trailPositions[trail.id].y}%` } as React.CSSProperties}
          data-trail={trail.id}
          aria-label={`${trailLabels[trail.id]}: ${trail.question}`}
          aria-pressed={activeTrail === trail.id}
          onClick={() => onSelectTrail(trail.id)}
        >
          <span className="curiosity-map__trail-index">0{index + 1}</span>
          <span>{trailLabels[trail.id]}</span>
        </button>
      ))}

      {projectOrder.map(projectId => {
        const project = projects[projectId];
        return (
          <button
            key={projectId}
            type="button"
            className="curiosity-map__project"
            style={{ '--map-x': `${projectPositions[projectId].x}%`, '--map-y': `${projectPositions[projectId].y}%` } as React.CSSProperties}
            data-project={projectId}
            data-trail={project.trail}
            aria-label={`${project.name}: ${project.question}`}
            aria-pressed={selectedProject === projectId}
            onMouseEnter={() => {
              setHoveredProject(projectId);
              setPreviewProject(projectId);
            }}
            onMouseLeave={() => {
              setHoveredProject(null);
              setPreviewProject(focusedProject);
            }}
            onFocus={() => {
              setFocusedProject(projectId);
              setPreviewProject(projectId);
            }}
            onBlur={() => {
              setFocusedProject(null);
              setPreviewProject(hoveredProject);
            }}
            onClick={() => onSelectProject(projectId)}
          >
            <span className="curiosity-map__project-signal" aria-hidden="true" />
            <span className="curiosity-map__project-name">{project.mapName ?? project.name}</span>
          </button>
        );
      })}

    </div>
      <div className={`curiosity-map__readout ${preview ? 'is-reading' : ''}`} aria-live="polite" aria-atomic="true">
        <span className="curiosity-map__readout-label">{preview ? `${preview.name} / THE QUESTION` : 'FOLLOW A STAR / FIND A QUESTION'}</span>
        <span className="curiosity-map__readout-question">{preview?.question ?? `${projectOrder.length} featured projects across ${trails.length} trails.`}</span>
      </div>
    </div>
  );
}
