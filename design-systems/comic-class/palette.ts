import type { Palette } from '@engine/contract';

// Comic print on warm paper: one pop blue (close to the LFIS logo blue) and one
// comic yellow (close to its gold crown), drawn with near-black ink. `line` is
// the ink itself, because comic panels are outlined, not hairlined.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#FFF9EF',
    surface: '#FFFFFF',
    sunk: '#FFF0D6',
    ink: '#17142B',
    muted: '#4A4562',
    line: '#17142B',
    accent: '#2154E8',
    accentInk: '#FFFFFF',
    accentSoft: '#DDE6FF',
    highlight: '#FFD12E',
  },
  // A "night edition" for builds that mix this palette with a dark-first layout.
  dark: {
    bg: '#15122A',
    surface: '#1F1B3A',
    sunk: '#100E22',
    ink: '#FFF6E6',
    muted: '#CBC5E2',
    line: '#FFF6E6',
    accent: '#8AA8FF',
    accentInk: '#15122A',
    accentSoft: '#26305E',
    highlight: '#FFD12E',
  },
};
