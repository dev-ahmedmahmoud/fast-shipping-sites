import type { Typography } from '@engine/contract';
// The faces are self-hosted: this import puts their @font-face rules into the
// page's CSS bundle, wherever this type part is used.
import './fonts/fonts.css';

// Alexandria (Arabic and Latin, variable 500–800) is a confident geometric face
// with a slightly engineered feel: headings read like mission titles without
// turning cold. Readex Pro (Arabic and Latin, variable 300–600, built on Lexend)
// is wide and calm for long paragraphs in both scripts, and its tabular figures
// suit dates and counters.
export const typography: Typography = {
  // Nothing to fetch: the fonts arrive with the page CSS (see fonts/fonts.css).
  // An empty inline stylesheet keeps the engine's <link> harmless and non-blocking.
  fontsHref: 'data:text/css,',
  families: {
    display: '"Alexandria", "Readex Pro", "Segoe UI", Tahoma, system-ui, sans-serif',
    body: '"Readex Pro", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(0.84rem, 0.81rem + 0.14vw, 0.92rem)',
    step0: 'clamp(1rem, 0.96rem + 0.2vw, 1.1rem)',
    step1: 'clamp(1.18rem, 1.1rem + 0.42vw, 1.4rem)',
    step2: 'clamp(1.42rem, 1.27rem + 0.78vw, 1.86rem)',
    step3: 'clamp(1.72rem, 1.45rem + 1.35vw, 2.5rem)',
    step4: 'clamp(2.1rem, 1.66rem + 2.2vw, 3.4rem)',
    step5: 'clamp(2.45rem, 1.7rem + 3.75vw, 4.75rem)',
  },
  weights: { body: 380, strong: 560, display: 700 },
  lineHeights: { body: 1.7, heading: 1.12 },
  labelTracking: '0.16em',
};
