import type { Palette } from '@engine/contract';

// Drafting paper and blueprint ink. The light palette is cool white paper with
// navy ink and a strong drafting blue (close to Genesis's #0061FF); the deep
// blueprint bands (hero, call to action, footer) are mixed from accent and ink
// in the layout, so any palette mixed in still gets its own "blueprint".
// `highlight` is a safety-orange marker used for linework only, never behind text.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#F5F8FD',
    surface: '#FFFFFF',
    sunk: '#E8EEF9',
    ink: '#0A1A3F',
    muted: '#46526E',
    line: '#B7C6E4',
    accent: '#0057EE',
    accentInk: '#FFFFFF',
    accentSoft: '#DCE7FD',
    highlight: '#FF6B2C',
  },
  // The blueprint itself: white lines on deep blue, for builds that want it dark.
  dark: {
    bg: '#0A1C4A',
    surface: '#10275F',
    sunk: '#07143A',
    ink: '#EAF1FF',
    muted: '#AFC2EA',
    line: '#335AA8',
    accent: '#7DB0FF',
    accentInk: '#08163A',
    accentSoft: '#173579',
    highlight: '#FFA64D',
  },
};
