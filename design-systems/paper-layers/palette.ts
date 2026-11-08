import type { Palette } from '@engine/contract';

// Cool paper board and white card, a strong school blue, and one warm marigold
// card. The layout derives two more card colours (mint and coral) from these by
// turning the hue, so any palette mixed in still gets a matching set of sheets.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#EDF0F5',
    surface: '#FFFFFF',
    sunk: '#E1E6EF',
    ink: '#0E1B33',
    muted: '#4A576F',
    line: '#C8D1E0',
    accent: '#0061FF',
    accentInk: '#FFFFFF',
    accentSoft: '#DCE7FF',
    highlight: '#FFB547',
  },
  // Used only when this palette is mixed into a build that follows the OS setting.
  dark: {
    bg: '#0C1424',
    surface: '#152036',
    sunk: '#10192C',
    ink: '#E9EFFA',
    muted: '#A3B0C8',
    line: '#27334D',
    accent: '#5C9BFF',
    accentInk: '#0C1424',
    accentSoft: '#1A2B4F',
    highlight: '#FFC46A',
  },
};
