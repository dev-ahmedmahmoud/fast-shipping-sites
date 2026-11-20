import type { Palette } from '@engine/contract';

// Royal Blue, now the campaign's navy and gold (Nov 2026: the client's agent sent a new
// design; colours sampled from it). The folder keeps its name because the live build picks
// the palette by it (DS_PALETTE=royal-blue); renaming means changing the build command too.
// - accent: the design's deep navy (hero gradient #123462 to #143966); layouts that mix
//   accent with ink (Station's night bands) land on a darker navy.
// - highlight: the metallic gold (light #E1CB92, mid #E1B964, deep #BD8F33); Station derives
//   its light and dark golds from it. Decorative, or text on the navy bands.
// - bg: the warm cream under the hero buttons (#FCF8F5 / #F8F3EF); surface white.
// - ink: a near-black navy.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#FAF6EF',
    surface: '#FFFFFF',
    sunk: '#F2EBDD',
    ink: '#0D1E3A',
    muted: '#4A5570',
    line: '#E2D6C0',
    accent: '#15396A',
    accentInk: '#FFFFFF',
    accentSoft: '#E3E9F3',
    highlight: '#D2A24C',
  },
  dark: {
    bg: '#0A1426',
    surface: '#0F1D36',
    sunk: '#0C182E',
    ink: '#F2EEE6',
    muted: '#C3C9D6',
    line: '#2A3A58',
    accent: '#9DB8E6',
    accentInk: '#0A1426',
    accentSoft: '#1B2F55',
    highlight: '#E1B964',
  },
};
