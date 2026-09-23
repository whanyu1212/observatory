const ZONE = 'Asia/Singapore';

/**
 * Hanyu's local time in Singapore, a line about it, and how much daylight the
 * universe should have: 0 at night, 1 through the working day.
 */
export function singaporeClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 12);
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? 0);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(now);
  const h = hour + minute / 60;
  const ramp = (from: number, to: number) => { const t = Math.min(1, Math.max(0, (h - from) / (to - from))); return t * t * (3 - 2 * t); };
  const daylight = h < 12 ? ramp(5, 8) : 1 - ramp(18, 22);
  const mood = h < 6 || h >= 23 ? 'Hanyu is probably asleep. The observatory is quiet.'
    : h < 9 ? 'Early here. The day is just starting.'
      : h < 18 ? 'Working hours here. Probably building something.'
        : 'Evening here. Still curious.';
  return { time, daylight, mood };
}
