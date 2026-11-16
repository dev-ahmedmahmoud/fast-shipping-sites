import type { Typography } from '@engine/contract';
// The @font-face rules live in a real stylesheet so their URLs follow the build's base path.
import './type-fonts/fonts.css';
import cairoArabic from './type-fonts/cairo-arabic.woff2?url';
import cairoLatin from './type-fonts/cairo-latin.woff2?url';

// Cairo for everything (Arabic and Latin, variable): a clean modern Arabic sans with wide,
// open letters that stays readable on phones. Headings bold (700), body regular. SIL OFL,
// self-hosted and bundled into the page CSS, so no cross-origin request holds up the first
// paint.
export const typography: Typography = {
  // Nothing to fetch: the faces arrive with the page CSS (type-fonts/fonts.css).
  fontsHref: 'data:text/css,',
  families: {
    display: '"Cairo", Tahoma, "Segoe UI", system-ui, sans-serif',
    body: '"Cairo", Tahoma, "Segoe UI", system-ui, sans-serif',
    mono: '"Cairo", ui-monospace, Menlo, monospace',
  },
  // Body text is 18–20px at every width, for readers on phones held at arm's length.
  scale: {
    stepMinus1: 'clamp(1rem, 0.97rem + 0.15vw, 1.08rem)',
    step0: 'clamp(1.125rem, 1.08rem + 0.25vw, 1.25rem)',
    step1: 'clamp(1.3rem, 1.2rem + 0.5vw, 1.55rem)',
    step2: 'clamp(1.55rem, 1.35rem + 1vw, 2.05rem)',
    step3: 'clamp(1.9rem, 1.55rem + 1.75vw, 2.8rem)',
    step4: 'clamp(2.3rem, 1.8rem + 2.6vw, 3.7rem)',
    step5: 'clamp(2.65rem, 1.9rem + 3.8vw, 4.8rem)',
  },
  weights: { body: 400, strong: 700, display: 800 },
  lineHeights: { body: 1.85, heading: 1.4 },
  labelTracking: '0.04em',
  // Arabic pages also show Latin (names, NOLL), so they get both small files.
  preload: { ar: [cairoArabic, cairoLatin], en: [cairoLatin] },
};
