import type { Palette } from '@engine/contract';

// Tanta Station: station-green enamel and brass on ticket card stock.
// - accent: the deep green of enamel platform signs and old carriages
// - highlight: brass (clock rims, rivets, number plates); decorative, or text on the green
// - bg / surface: the stock of an old railway ticket, cool rather than cream
// One committed light look: the night-green bands (hero, board, footer) are derived from
// these roles in layout/global.css, so the page already has its own dark rooms.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#F2F1EA',
    surface: '#FFFEF9',
    sunk: '#E6E4D8',
    ink: '#121D18',
    muted: '#3F4B45',
    line: '#C9C4B2',
    accent: '#0D4633',
    accentInk: '#FFF9EA',
    accentSoft: '#DCE6DC',
    highlight: '#A6782A',
  },
  dark: {
    bg: '#0B1612',
    surface: '#11201A',
    sunk: '#0E1A15',
    ink: '#EFEBDD',
    muted: '#B9C2BC',
    line: '#2C3D35',
    accent: '#7FC4A4',
    accentInk: '#0B1612',
    accentSoft: '#173328',
    highlight: '#D9B061',
  },
};
