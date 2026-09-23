import { atom, computed } from 'nanostores';

const COMETS_KEY = 'hanyu:comets';
const ALL_CHARTED_KEY = 'hanyu:all-charted';

/** Comets this visitor has caught, across visits. */
export const $cometCatches = atom(0);
/** Whether this visitor has charted every public island at least once. */
export const $allCharted = atom(false);

/** Aurora: earned by catching one comet, or by charting every island (for visitors with motion paused). */
export const $auroraUnlocked = computed([$cometCatches, $allCharted], (catches, charted) => catches >= 1 || charted);
/** A comet-coloured wake for the explorer, earned on the third catch. */
export const $cometWakeUnlocked = computed($cometCatches, catches => catches >= 3);

export function loadProgress() {
  try {
    $cometCatches.set(Math.max(0, Number(localStorage.getItem(COMETS_KEY) ?? 0) || 0));
    $allCharted.set(localStorage.getItem(ALL_CHARTED_KEY) === 'true');
  } catch { /* Without storage, progress lasts for this visit only. */ }
}

export function recordCometCatch() {
  const catches = $cometCatches.get() + 1;
  $cometCatches.set(catches);
  try { localStorage.setItem(COMETS_KEY, String(catches)); } catch { /* This visit only. */ }
  return catches;
}

export function recordAllCharted() {
  if ($allCharted.get()) return;
  $allCharted.set(true);
  try { localStorage.setItem(ALL_CHARTED_KEY, 'true'); } catch { /* This visit only. */ }
}
