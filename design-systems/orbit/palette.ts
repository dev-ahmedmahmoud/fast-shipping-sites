import type { Palette } from '@engine/contract';

// Day sky above, deep space below. The light palette is the dawn sky the page
// opens on; `ink` doubles as the night sky that the lower sections and the footer
// sink into (the layout paints those "night" sections with ink and writes on them
// with bg). The accent is an electric blue close to the Genesis logo, and the
// highlight is a warm star amber, used for glints and for text on the night sky,
// never for text on the light sky.
export const palette: Palette = {
  scheme: 'light',
  light: {
    bg: '#F3F7FF',
    surface: '#FFFFFF',
    sunk: '#E5EDFF',
    ink: '#0A1638',
    muted: '#465375',
    line: '#CAD7F2',
    accent: '#0058E6',
    accentInk: '#FFFFFF',
    accentSoft: '#DCE7FF',
    highlight: '#FFB23F',
  },
  // For builds that mix this palette with a dark-first layout.
  dark: {
    bg: '#070F2B',
    surface: '#0E1A40',
    sunk: '#050B21',
    ink: '#EAF1FF',
    muted: '#A6B4D6',
    line: '#24345F',
    accent: '#6EA2FF',
    accentInk: '#061030',
    accentSoft: '#142A63',
    highlight: '#FFC266',
  },
};
