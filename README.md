# The Observatory

> An interactive portfolio for **Hanyu Wu** — AI builder, data scientist, and open-source contributor.

The Observatory is a small, explorable universe that doubles as a portfolio. Instead of scrolling a list of projects, you steer an explorer through a starfield and *visit* them: ten featured projects sit on faceted asteroid islands, each a handcrafted sculpture of the thing it represents. Case studies, field notes, and open questions open in place, so the work is discovered rather than listed.

Built with **Astro**, **React**, and **Three.js**.

## Highlights

- **A playable overview** — a dense, independently twinkling starfield and blue-violet nebula clouds. Travel with WASD/arrow keys, a direct project menu, or a three-stop guided tour.
- **Projects as places** — ten asteroid islands with orbiting fragments and hand-built geometry: gem, wisp, prawn, sofa, agent team, trading chart, fractional coin, deployment rocket, brain with a barbell, and a layered terminal with an inspection lens.
- **Repository artifacts to inspect** — Explore panels pair concise project descriptions with screenshots and visuals sourced from each project repository.
- **Contextual reading** — project case studies and field notes as wide side panels on desktop, full-screen sheets on mobile.
- **Experience as chapters** — résumé-backed career pages (Micron Technology, KPMG, Singapore Tourism Board) with connected milestones and a scroll-aware chapter index.
- **Curiosity Map** — an interactive atlas of exploration trails and the questions behind each project.
- **An OS-style workspace** — a HUD, dock, and app windows (dossier, deployments, comms, terminal, transmissions) framing the universe.

## Navigating

| Action | Desktop | Touch |
| --- | --- | --- |
| Move the explorer | WASD / arrow keys, or click a landmark | Tap a landmark |
| Orbit the world (360°) | Drag with the mouse | Two-finger drag |
| Zoom | Ctrl + scroll, or camera buttons | Pinch |
| Scroll the page | Ordinary scroll | One-finger swipe |
| Return to the opening shot | Reset view | Reset view |

Camera buttons are keyboard accessible, and tilt/zoom limits keep the universe in reach. Project labels separate as the camera moves and draw connecting lines when shifted; mobile keeps numbered markers with a project legend. Discovery progress lasts for the current page session.

## Accessibility and fallbacks

Audio starts disabled. Motion follows the system preference by default; visitors can explicitly enable or pause it, and the choice is remembered in their browser. World, map, and star animations stop when inactive or out of view. With motion paused, deliberate destination selection still works. The world offers a project-button fallback if WebGL is unavailable, and mobile opens one workspace app at a time.

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
- `src/components/observatory/Playground.tsx` and `src/styles/playground.css`: world HUD, guided tour, discoveries, and project menu.
- `src/components/observatory/ExplorationScene.tsx`: Three.js world, explorer movement, camera, and accessible destinations.
- `src/components/observatory/worldGeometry.ts` and `projectLandmarks.ts`: handcrafted project sculptures—gem, wisp, prawn, sofa, agent team, trading chart, fractional coin, deployment rocket, brain with a barbell, and a layered terminal with an inspection lens for Claude Code Anatomy.
- `src/components/observatory/FieldNotesPanel.tsx` and `src/styles/field-notes.css`: project journal, accessible modal, and mobile reading layout.
- `src/components/observatory/ProjectPanel.tsx` and `src/styles/project-panel.css`: project descriptions and repository galleries opened from the universe.
- `src/components/observatory/CuriosityMap.tsx` and `src/styles/curiosity-map.css`: the interactive atlas, project anchors, and motion.
- `src/components/observatory/curiosity.ts`: project details, exploration trails, and open questions.
- `src/components/observatory/OpenSource.tsx` and `src/styles/open-source.css`: contribution highlights with direct pull-request links.
- `src/components/observatory/BackgroundStars.tsx` and `src/styles/background-stars.css`: decorative stars and their animation lifecycle.
- `src/components/observatory/MeteorShower.tsx` and `src/styles/meteor-shower.css`: occasional meteor trails, with viewport, visibility, and motion controls.
- `src/stores/osStore.ts`: workspace state and actions.
- `src/components/apps/`: individual workspace views.

## Project images

Explore galleries use local, optimized copies of public visuals from the linked repositories. The Gem Dota field-note preview remains sourced from [whanyu1212/gem-dota](https://github.com/whanyu1212/gem-dota/blob/main/assets/interactive_movement_trail.png). Project text and public contact links were checked against [Hanyu's GitHub profile](https://github.com/whanyu1212) on 12 September 2026.
