# Hanyu portfolio: hackathon art direction

Reviewed 12 September 2026. This is an exploratory design recommendation, based on the source and the running desktop site at 1280 × 720. The hackathon rubric, time remaining, and real project assets were not supplied; priorities below are design judgments, not predictions of a judging result. No application source was changed during this exploration.

## Recommendation: The Observatory

Give Hanyu's portfolio the identity of an instrument for exploring intelligent systems. A dimensional sculpture anchors the first screen. The visitor's actions reshape it: interface becomes an orbital structure, intelligence becomes a flowing signal, and infrastructure becomes an exposed lattice. Pair the instrument with a large name, a clear description of the work, and a direct route into selected projects.

The key creative move is to connect the spectacle to the portfolio's engineering. The signature interaction should be **X-ray mode**: the sculpture separates into an inspectable map of the real page. Select Window Manager, State, Motion, or Audio to reveal a short explanation and a working example. Dragging a window should update the corresponding diagram. Muting audio should visibly disconnect the audio branch. This is a proposed feature, not something the current site or concept already implements.

The inline concept demonstrates visual hierarchy, three art treatments, a procedural point sculpture, discipline-driven form changes, an example CYBER_OS project view, and a visual disassembly. Its disassembly is illustrative; it does not introspect the application. The current repository is the only project used as evidence in that concept.

## What the current experience communicates

The site already has a coherent sci-fi vocabulary: boot diagnostics, a HUD, window controls, a dock, environment themes, and synthesized audio. The first post-boot view opens a 560 × 480 dossier near the upper-left corner. Most of the remaining desktop is ambient space. Your name, skill tags, operational copy, and chrome use similar small type. That gives the frame more visual weight than the person and the work.

The backgrounds and translucency add atmosphere, but there is no dominant image or object to remember. The project view is also text-led, with no screenshots or demonstrable outcome. A judge can explore several controls without reaching a concrete example of what you built.

## Three coherent directions

| Direction | Visual language | Main interaction | Tradeoff |
| --- | --- | --- | --- |
| **The Observatory — recommended** | Graphite, warm white, restrained chartreuse; large geometric type; instrument markings; orbital sculpture | Project selection reconfigures a central instrument; X-ray mode reveals the actual architecture | Strong continuity with the current OS, with a new visual centerpiece. Requires disciplined compositing so panels do not hide the hero. |
| **The Signal Studio** | Near-black aubergine, pale violet; flowing filaments; softer light; fewer technical borders | Inputs propagate through a visible signal field and resolve into project previews | Expressive and appropriate for AI work, but should be attached to a real example to avoid becoming an abstract screensaver. |
| **The Systems Atlas** | Deep blueprint blue, ice cyan, white; precise spatial grids; exploded structures | Projects open as inspectable layers in a spatial technical drawing | Clearest engineering story and easiest to keep consistent with the existing UI; needs bold scale to stand out from familiar HUD designs. |

## The first 30 seconds

This is a proposed demo sequence, not a measured visitor behavior model.

1. **0–3 seconds:** HANYU WU and “Full-stack / AI systems” are visible immediately. A short calibration happens behind the content. Avoid making the introduction wait for the current boot gate.
2. **3–10 seconds:** One pointer movement gently perturbs the sculpture. “Explore my work” selects a flagship project and transforms the object. The change has a clear beginning and end.
3. **10–22 seconds:** The project displays a large real capture, a one-sentence problem, Hanyu's contribution, and a verified result or an honest current status. A live demo and repository open at their actual destinations.
4. **22–30 seconds:** “Inspect the system” exposes a piece of the real implementation. A judge changes something and sees its effect. Keep conventional navigation available throughout.

## Visual decisions to make together

- **Scale:** Use one dominant object and one dominant headline. Keep telemetry subordinate. Body text should be readable without zooming; reserve mono type for short labels and commands.
- **Light:** Most surfaces should be matte and quiet. Use bright edges on the selected object, active control, and meaningful transitions. Reduce all-over neon bloom and the vignette over readable content.
- **Space:** Establish a home composition before opening windows. Start with the dossier closed; make About a deliberate destination. Preserve the desktop as an exploration mode.
- **Motion:** Use three levels: nearly still ambient movement, immediate control feedback, and one stronger transition on selection. Avoid simultaneous glitch, pulse, and sweep effects. Sound should be an explicit opt-in with a persistent mute control.
- **Project imagery:** Give each real project an individual visual treatment grounded in a capture or functioning demo. An agent tool might reveal a real execution trace; a telemetry tool might show recorded sample data explicitly labeled as such. Do not invent usage, latency, awards, or deployment claims.
- **Mobile:** Reflow the same story as stacked content and a compact illustration. Open one app at a time, without dragging. Essential actions must work by touch and keyboard, with no hover dependency.

## Build order

| Priority | Work | Concrete completion criterion |
| --- | --- | --- |
| 1 | Repair broken destinations and establish truthful project content | Every visible dock item opens a real view; links identify actual destinations; no form reports a send that never occurred. |
| 2 | Build the Observatory landing composition | Name, role, flagship work action, and sculpture are visible together. Main content is available before animation completes. |
| 3 | Make one exceptional project presentation | Real capture or working demo, clear contribution, honest status, verified live/repository URLs. |
| 4 | Implement the X-ray interaction | At least one real application action updates the architecture view. A judge can discover, trigger, and understand it within the demo sequence. |
| 5 | Finish motion, audio, and responsive behavior | Keyboard/touch access, reduced motion, audio opt-in, recoverable windows, no console errors, production build passes. |
| Stretch | Replay mode | A user-started short guided sequence visits the flagship project and the real X-ray interaction; it can be stopped immediately. |

If time is very short, complete priorities 1–3. A strong composition with one convincing project is a more feasible deliverable than implementing all three directions. Prototype the central form using Canvas or SVG first; add a 3D dependency only if lighting, camera movement, or actual spatial inspection justifies it.

## Implementation map and verified issues

- `src/pages/index.astro` composes the current boot sequence, background, HUD, desktop, and dock. A new home composition can be introduced here while retaining the apps.
- `src/stores/osStore.ts` initially opens the dossier. Introduce explicit home/explore state and distinguish the selected project from the active app. The same state can drive both project content and the sculpture.
- `src/components/os/Desktop.tsx` renders dossier, deployments, terminal, and comms, but never renders the `transmissions` state present in the store and dock. Implement a real mission-log view or remove that destination consistently.
- `src/components/apps/DeploymentsApp.tsx:16` contains three project records. All supplied live/repository destinations are `https://github.com`; the project descriptions and performance claims require verification before presentation as Hanyu's work.
- `src/components/apps/CommsApp.tsx:10` only calls `setSent(true)` after checking a nonempty message. There is no transmission. The email destination is `contact@example.com`. Prefer a verified direct contact link until a real sending path exists.
- `src/components/os/WindowFrame.tsx` enables drag without bounds. The mobile CSS forces dimensions but does not remove the drag transform. Add constraints, reset/recenter behavior, and a no-drag mobile mode.
- `src/components/os/TopHUDBar.tsx` displays simulated CPU load as CPU percentage. Replace it with truthful UI state or label the simulation; avoid decorative numbers masquerading as system measurements.
- `src/components/effects/CanvasGrid.astro` continues scheduling animation frames under reduced motion. Any replacement should render once in reduced-motion mode, stop work offscreen or when hidden, and cap pixel density.
- `src/styles/global.css` provides the existing theme tokens. Extend the theme system rather than hardcoding a separate palette in every app. Make backgrounds less transparent where they sit over moving artwork.

## Verification for implementation

The exploration inspected the running desktop site and source. The proposed replacement has not been integrated or production-tested. During implementation, check 390px, 768px, and a desktop viewport; reduced-motion preference; keyboard flow; touch behavior; close/minimize/restore; all project and contact destinations; and production build output. Measure animation cost on a representative device before claiming a frame-rate or loading target. Core content and navigation should still render if the visual canvas fails.

## References and what to borrow

- [Bruno Simon's portfolio](https://bruno-simon.com/) makes driving through a world the navigation mechanism, with quality and audio controls. Borrow the principle that an interaction embodies the creator's craft. Do not reproduce its car game. This informed the proposed instrument and real architecture inspection.
- [Lusion](https://lusion.co/) explicitly combines design, motion, 3D, and development, and foregrounds featured project experiences. Borrow the integration of a visual idea with actual work and a clear route into it. The proposed Observatory treatment is our own design inference, not a claim that Lusion uses this layout.
- [Astro routing](https://docs.astro.build/en/guides/routing/) and [Astro styling](https://docs.astro.build/en/guides/styling/) are the implementation references consulted for a possible new home surface and scoped visual system.

Before final scope is committed, the missing inputs are the hackathon's rubric/deadline and Hanyu's real project links/captures. These affect which project should lead and whether the X-ray feature fits the available time.
