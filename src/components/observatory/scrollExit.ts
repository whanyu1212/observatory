/**
 * How far the universe has receded as the page scrolls past it: 0 while it
 * fills the view, 1 once it is gone. Measured against the scroll the page
 * actually allows, so a short page below still completes the exit.
 */
export function scrollExitProgress(section: HTMLElement) {
  const bounds = section.getBoundingClientRect();
  const scrolled = Math.max(0, -bounds.top);
  const sectionTop = bounds.top + window.scrollY;
  const available = document.documentElement.scrollHeight - window.innerHeight - sectionTop;
  const span = Math.max(1, Math.min(bounds.height * 0.8, available));
  return { scrolled, progress: Math.min(1, scrolled / span) };
}
