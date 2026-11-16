import type { Palette } from '@engine/contract';

// Royal Blue: a palette-only system, sampled from the Tanta Sports Club list's campaign
// poster (royal-blue gradient, white names, campaign yellow on ties and crest).
// Pair it with any layout through a sample's `palette` part, e.g. Station's layout:
// - accent: the poster's main royal blue; layouts that derive dark bands from accent
//   and ink (Station's night bands) land on the poster's deep navy.
// - highlight: the poster's gold-yellow; decorative, or text on the blue bands.
// - ink: the near-black navy of the members' suits.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#F1F3F8',
    surface: '#FFFFFF',
    sunk: '#E3E8F2',
    ink: '#141B3A',
    muted: '#3D4766',
    line: '#C4CCDD',
    accent: '#23449A',
    accentInk: '#F7F6FA',
    accentSoft: '#DCE4F5',
    highlight: '#EDD427',
  },
  dark: {
    bg: '#0B1024',
    surface: '#111834',
    sunk: '#0D1430',
    ink: '#EEF1F8',
    muted: '#B7C0D6',
    line: '#2A3558',
    accent: '#8FB0F0',
    accentInk: '#0B1024',
    accentSoft: '#1A2A57',
    highlight: '#F2D545',
  },
};
