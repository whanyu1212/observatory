# The Observatory

An interactive portfolio for **Hanyu Wu**—AI builder, data scientist, and open-source contributor.

Explore ten projects as handcrafted islands in a playable Three.js universe. Each project opens a concise gallery with repository visuals, technical context, and source links.

Built with **Astro**, **React**, and **Three.js**.

## Highlights

- Playable project universe with keyboard, mouse, and touch controls
- Repository galleries for ten featured projects
- Career experience, skills, and education
- Clearly attributed open-source participation
- Responsive design with motion, sound, and WebGL fallbacks

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Visit a project | Click a landmark or use WASD / arrow keys | Tap a landmark |
| Orbit | Drag | Two-finger drag |
| Zoom | Ctrl + scroll or camera controls | Pinch |
| Scroll | Scroll normally | One-finger swipe |

Sound begins after the first interaction and can be muted. Motion follows the system preference and can be paused.

## Development

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm astro dev --background
```

Production preview:

```sh
pnpm build
pnpm preview
```
