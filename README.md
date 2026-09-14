# The Observatory — Hanyu Wu

An interactive portfolio built with Astro, React, and Three.js. The overview is a playable small universe with a dense, independently twinkling starfield and blue-violet nebula clouds: steer an explorer with WASD/arrow keys or click a project landmark to travel. Ten featured projects sit on separate faceted asteroid islands, surrounded by slow orbiting fragments. They become places to discover, with a direct project menu and a three-stop guided tour. Gem Dota includes a guided walkthrough of genuine replay output. Discovery progress and the replay badge last for the current page session.

Drag the world with a mouse to orbit through 360 degrees. Ordinary scrolling moves down the page; hold Ctrl while scrolling, pinch, or use the camera buttons to zoom. On touchscreens, one-finger swipes scroll the page and two-finger gestures control the camera. Reset view returns to the opening composition. Tilt and zoom limits keep the universe in reach. Camera buttons also offer keyboard access. Project labels separate as the camera moves, with connecting lines when shifted; mobile keeps numbered markers and a project legend.

Project case studies and field notes open contextually from the universe, using wide side panels on desktop and full-screen sheets on mobile. The landing introduction identifies Hanyu as an AI builder, data scientist, and open-source contributor, linking to ai-agent-book contribution highlights below the universe. The Overview flows from the universe to these contributions, then the contact footer; project questions and field notes carry the curiosity theme. Experience presents résumé-backed career chapters across Micron Technology, KPMG, and Singapore Tourism Board, followed by education. Micron leads with a visible agent-engineering highlight covering graph/state-machine agents and evaluation harnesses; production root-cause detection has its own work entry. Connected milestones and a scroll-aware chapter index navigate the page; each role pairs clearly qualified impact figures with expandable accounts of the work. About contains the personal profile, AdaL community role, and a contact section with email, LinkedIn, and GitHub links.

## Development

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm astro dev --background
pnpm astro dev status
pnpm astro dev logs
pnpm astro dev stop
```

The configured port is 4399; Astro reports a fallback port if it is occupied.

```sh
pnpm build
pnpm preview
```

## Editing

- `src/components/observatory/Observatory.tsx`: opening composition, project panels, biography, and navigation.
- `src/components/observatory/ExperiencePage.tsx` and `src/styles/experience.css`: professional history, career navigation, work details, outcomes, and education.
- `src/styles/observatory.css`: typography, responsive layouts, and the three environment palettes.
- `src/components/observatory/Playground.tsx` and `src/styles/playground.css`: world HUD, guided tour, discoveries, project menu, and challenge entry.
- `src/components/observatory/ExplorationScene.tsx`: Three.js world, explorer movement, camera, and accessible destinations.
- `src/components/observatory/worldGeometry.ts` and `projectLandmarks.ts`: handcrafted project sculptures—gem, wisp, prawn, sofa, agent team, trading chart, fractional coin, deployment rocket, brain with a barbell, and a layered terminal with an inspection lens for Claude Code Anatomy.
- `src/components/observatory/FieldNotesPanel.tsx` and `src/styles/field-notes.css`: project journal, accessible modal, and mobile reading layout.
- `src/components/observatory/ProjectPanel.tsx` and `src/styles/project-panel.css`: expanded project case studies opened from the universe.
- `src/components/observatory/GemChallenge.tsx` and `src/styles/gem-challenge.css`: guided walkthrough of an actual Gem Dota replay visualization.
- `src/components/observatory/CuriosityMap.tsx` and `src/styles/curiosity-map.css`: the interactive atlas, project anchors, and motion.
- `src/components/observatory/curiosity.ts`: project details, exploration trails, and open questions.
- `src/components/observatory/OpenSource.tsx` and `src/styles/open-source.css`: contribution highlights with direct pull-request links.
- `src/components/observatory/BackgroundStars.tsx` and `src/styles/background-stars.css`: decorative stars and their animation lifecycle.
- `src/components/observatory/MeteorShower.tsx` and `src/styles/meteor-shower.css`: occasional meteor trails, with viewport, visibility, and motion controls.
- `src/stores/osStore.ts`: workspace state and actions.
- `src/components/apps/`: individual workspace views.

Audio starts disabled. Motion follows the system preference by default; visitors can explicitly enable or pause it, and the choice is remembered in their browser. World, map, and star animations stop when inactive or out of view. With motion paused, deliberate destination selection still works; idle animation is stopped. The world offers a project-button fallback if WebGL is unavailable. Mobile opens one workspace app at a time.

## Project image

The Gem Dota preview is the original report screenshot from [whanyu1212/gem-dota](https://github.com/whanyu1212/gem-dota/blob/main/assets/interactive_movement_trail.png), stored in `src/assets/gem-dota-preview.png`. Astro and Sharp generate an optimized WebP at build time. Project text and public contact links were checked against [Hanyu's GitHub profile](https://github.com/whanyu1212) on 12 September 2026.
