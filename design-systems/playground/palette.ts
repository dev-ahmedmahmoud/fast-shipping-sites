import type { Palette } from '@engine/contract';

// Playground blue and sunshine yellow (the logo's crown). The layout derives its
// extra toy colors (red, green, purple, orange) from accent and highlight, so this
// palette, or any other, drives the whole rainbow.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#F4F8FF',
    surface: '#FFFFFF',
    sunk: '#E7EFFC',
    ink: '#18204A',
    muted: '#4A5479',
    line: '#CCD8EE',
    accent: '#1F4FE0',
    accentInk: '#FFFFFF',
    accentSoft: '#DCE6FF',
    highlight: '#FFC21A',
  },
  // Used only when this palette is mixed into a build that follows the OS setting.
  dark: {
    bg: '#121634',
    surface: '#1A2046',
    sunk: '#151A3C',
    ink: '#EEF2FF',
    muted: '#AEB6DA',
    line: '#2C3566',
    accent: '#86A4FF',
    accentInk: '#121634',
    accentSoft: '#243063',
    highlight: '#FFD34D',
  },
};
