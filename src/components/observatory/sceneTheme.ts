import * as THREE from 'three';
import type { SpectrumTheme } from '@/stores/osStore';

type PaletteKey = 'fog' | 'sky' | 'ground' | 'key' | 'rim' | 'rock' | 'sun' | 'stars' | 'accent';
type Palette = Record<PaletteKey, number>;

// Mirrors the CSS spectrum tokens in observatory.css so the world and the page
// change together. Only colours move: no shader recompiles, no new passes.
const palettes: Record<'observatory' | 'ultraviolet' | 'polar' | 'aurora', Palette> = {
  observatory: { fog: 0x080d20, sky: 0xc5d5f3, ground: 0x11162d, key: 0xfff5db, rim: 0xffcf94, rock: 0x92979d, sun: 0xffffff, stars: 0xffffff, accent: 0xd9f991 },
  ultraviolet: { fog: 0x1e0b33, sky: 0xe2c2ff, ground: 0x341445, key: 0xffd6f1, rim: 0xff8fc8, rock: 0xa293b8, sun: 0xffb8e2, stars: 0xf0d6ff, accent: 0xd5b4ff },
  // Earned by catching a comet: green curtains of light over a violet night.
  aurora: { fog: 0x0a1a28, sky: 0xb4ffdc, ground: 0x2a1648, key: 0xe4fff1, rim: 0xb48cff, rock: 0x86a39e, sun: 0xcfffe6, stars: 0xd4ffec, accent: 0x7cf2c4 },
  polar: { fog: 0x031f36, sky: 0xb4ecff, ground: 0x06344f, key: 0xdcf3ff, rim: 0x9fe6ff, rock: 0x86a3b8, sun: 0xc8f1ff, stars: 0xcff3ff, accent: 0x84e2ef },
};

const paletteFor = (theme: SpectrumTheme) => palettes[theme as keyof typeof palettes] ?? palettes.observatory;
const keys = Object.keys(palettes.observatory) as PaletteKey[];

/** Blends every bound colour toward the active spectrum over a short crossfade. */
export function createSceneTheme(bindings: Record<PaletteKey, THREE.Color[]>) {
  const from = Object.fromEntries(keys.map(key => [key, new THREE.Color()])) as Record<PaletteKey, THREE.Color>;
  const to = Object.fromEntries(keys.map(key => [key, new THREE.Color(palettes.observatory[key])])) as Record<PaletteKey, THREE.Color>;
  const mixed = new THREE.Color();
  let progress = 1;

  const apply = (amount: number) => {
    const eased = amount * amount * (3 - 2 * amount);
    keys.forEach(key => {
      mixed.copy(from[key]).lerp(to[key], eased);
      bindings[key].forEach(color => color.copy(mixed));
    });
  };

  return {
    set(theme: SpectrumTheme, animate: boolean) {
      const palette = paletteFor(theme);
      keys.forEach(key => {
        from[key].copy(bindings[key][0] ?? to[key]);
        to[key].setHex(palette[key]);
      });
      progress = animate ? 0 : 1;
      apply(progress);
    },
    /** Returns true while a crossfade is still running. */
    update(dt: number) {
      if (progress >= 1) return false;
      progress = Math.min(1, progress + dt / 0.7);
      apply(progress);
      return progress < 1;
    },
  };
}
