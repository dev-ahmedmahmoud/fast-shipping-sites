import type { Palette } from '@engine/contract';

// The club's honour hall: oxblood walls, brushed gold, and a warm grey stone for the
// reading rooms. One committed look (light stone pages, deep wine halls); the dark set
// exists so other layouts can borrow these colors.
// Contrast on stone: ink 15:1, muted 7.6:1 (AAA). Gold is never body text on stone.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#EFECE6',
    surface: '#FBFAF7',
    sunk: '#E5E0D7',
    ink: '#1F1517',
    muted: '#4E4144',
    line: '#CFC6B8',
    accent: '#6B1625',
    accentInk: '#FBF6EC',
    accentSoft: '#F1E3E1',
    highlight: '#B38B3F',
  },
  dark: {
    bg: '#1C0609',
    surface: '#2A0B11',
    sunk: '#160407',
    ink: '#F4EDE3',
    muted: '#CDBDB2',
    line: '#4A2128',
    accent: '#D4B06A',
    accentInk: '#1C0609',
    accentSoft: '#3A1219',
    highlight: '#E2C47F',
  },
};
