import type { Palette } from '@engine/contract';

// Ivory parchment, deep emerald and gold leaf: the colors of turned-wood screens, inlaid
// brass and old club ledgers. One committed light look: voters are 40+, and dark ink on
// ivory reads best (ink on bg is about 15:1, muted on bg about 8:1, both AAA).
// Gold is decoration and large type on emerald, never small text on ivory.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#F5F0E4',
    surface: '#FFFCF5',
    sunk: '#ECE4D2',
    ink: '#10231D',
    muted: '#3D4A44',
    line: '#D3C5A6',
    accent: '#0B5A42',
    accentInk: '#FFFCF3',
    accentSoft: '#DCE9DF',
    highlight: '#CDA44F',
  },
  // Kept for systems that mix this palette into a light/dark layout.
  dark: {
    bg: '#0A1F19',
    surface: '#0F2A22',
    sunk: '#0C241D',
    ink: '#F3ECDC',
    muted: '#C3CCC5',
    line: '#28483D',
    accent: '#DDBB6B',
    accentInk: '#0A1F19',
    accentSoft: '#163A30',
    highlight: '#DDBB6B',
  },
};
