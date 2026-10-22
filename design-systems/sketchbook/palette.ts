import type { Palette } from '@engine/contract';

// Notebook paper, ballpoint ink, blue rules, a highlighter and the teacher's red pen.
// The layout derives the rest of its crayon box from accent and highlight, so any
// palette dropped onto this layout gets a matching set of crayons.
export const palette: Palette = {
  // Paper is the identity of this system, so it stays light.
  scheme: 'light',
  light: {
    bg: '#FDFBF4',
    surface: '#FFFFFF',
    sunk: '#F1E8D3',
    ink: '#1E2846',
    muted: '#4A5470',
    line: '#BDD5EE',
    accent: '#2457D6',
    accentInk: '#FFFFFF',
    accentSoft: '#FFF0A0',
    highlight: '#E0392F',
  },
  // A chalkboard, for layouts or builds that choose the dark scheme.
  dark: {
    bg: '#1C2523',
    surface: '#24302D',
    sunk: '#17201E',
    ink: '#F2F5EF',
    muted: '#B8C5BF',
    line: '#3A4844',
    accent: '#8DB4FF',
    accentInk: '#14201D',
    accentSoft: '#4A4520',
    highlight: '#FF8A80',
  },
};
