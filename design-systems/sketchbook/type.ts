import type { Typography } from '@engine/contract';
// The faces are self-hosted: this import puts their @font-face rules into the page's CSS
// bundle, wherever this type part is used.
import './fonts/fonts.css';

// Marhey is hand-lettered in both Arabic and Latin: the headings look written with a
// marker. Baloo Bhaijaan 2 is round and friendly but stays readable in long Arabic
// and English paragraphs. Both are variable fonts, so one file per script covers
// every weight used here.
export const typography: Typography = {
  // Nothing to fetch: the fonts arrive with the page CSS (see fonts/fonts.css). An empty
  // inline stylesheet keeps the engine's <link> harmless and non-blocking.
  fontsHref: 'data:text/css,',
  families: {
    display: '"Marhey", "Baloo Bhaijaan 2", "Comic Sans MS", "Segoe Print", system-ui, sans-serif',
    body: '"Baloo Bhaijaan 2", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(0.86rem, 0.83rem + 0.15vw, 0.95rem)',
    step0: 'clamp(1.02rem, 0.98rem + 0.22vw, 1.14rem)',
    step1: 'clamp(1.22rem, 1.13rem + 0.45vw, 1.45rem)',
    step2: 'clamp(1.46rem, 1.3rem + 0.8vw, 1.9rem)',
    step3: 'clamp(1.75rem, 1.48rem + 1.35vw, 2.55rem)',
    step4: 'clamp(2.1rem, 1.65rem + 2.25vw, 3.45rem)',
    step5: 'clamp(2.35rem, 1.65rem + 3.5vw, 4.6rem)',
  },
  weights: { body: 400, strong: 600, display: 700 },
  lineHeights: { body: 1.8, heading: 1.3 },
  labelTracking: '0.08em',
};
