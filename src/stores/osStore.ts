import { atom } from 'nanostores';

export type SpectrumTheme = 'observatory' | 'polar' | 'ultraviolet' | 'aurora' | 'ember' | 'monochrome';

export const $theme = atom<SpectrumTheme>('observatory');
export const $audioEnabled = atom<boolean>(true);
