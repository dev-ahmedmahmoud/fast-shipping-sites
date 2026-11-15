import type { Typography } from '@engine/contract';
// The faces are self-hosted: this import puts their @font-face rules into the page's CSS
// bundle (URLs follow the build's base path), wherever this type part is used.
import './fonts/fonts.css';

// Amiri is a Naskh revival of the Bulaq Press type cut in Cairo in 1905: dignified,
// familiar to Egyptian readers, and clear at heading sizes (names, titles). Aref Ruqaa
// is Ruqaa, the everyday Egyptian hand of shop signs and letters; it is only used for
// section titles, through --font-callig (set in layout/global.css). Body text is
// IBM Plex Sans Arabic: open, even and very legible on phones for older eyes.
// All three cover Arabic and Latin.
export const typography: Typography = {
  // Nothing to fetch: the faces arrive with the page CSS (fonts/fonts.css).
  fontsHref: 'data:text/css,',
  families: {
    display: '"Amiri", "IBM Plex Sans Arabic", "Times New Roman", serif',
    body: '"IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  // Body never drops below 18px; headings grow generously on wide screens.
  scale: {
    stepMinus1: 'clamp(1rem, 0.97rem + 0.15vw, 1.08rem)',
    step0: 'clamp(1.125rem, 1.08rem + 0.22vw, 1.25rem)',
    step1: 'clamp(1.32rem, 1.24rem + 0.42vw, 1.56rem)',
    step2: 'clamp(1.6rem, 1.45rem + 0.75vw, 2rem)',
    step3: 'clamp(1.95rem, 1.7rem + 1.25vw, 2.75rem)',
    step4: 'clamp(2.35rem, 1.95rem + 2vw, 3.6rem)',
    step5: 'clamp(2.75rem, 2.1rem + 3.2vw, 4.75rem)',
  },
  weights: { body: 400, strong: 600, display: 700 },
  // Arabic needs room above and below the letters; Amiri more so.
  lineHeights: { body: 1.85, heading: 1.45 },
  labelTracking: '0.12em',
};
