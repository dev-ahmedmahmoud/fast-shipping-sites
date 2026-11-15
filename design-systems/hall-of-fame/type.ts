import type { Typography } from '@engine/contract';
// The @font-face rules live in a real stylesheet so their URLs follow the build's base path.
import './fonts/fonts.css';

// Amiri Bold carries the honour-hall voice: engraved plaques, names, ballot medals.
// Almarai is the reading face: open, steady and large-eyed, so club members past forty
// read long programme text without effort. Body text never drops below 18px.
export const typography: Typography = {
  // Nothing to fetch: the faces arrive with the page CSS (fonts/fonts.css).
  fontsHref: 'data:text/css,',
  families: {
    display: '"Amiri", "Almarai", "Traditional Arabic", Georgia, serif',
    body: '"Almarai", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(1rem, 0.97rem + 0.15vw, 1.08rem)',
    step0: 'clamp(1.15rem, 1.1rem + 0.25vw, 1.28rem)',
    step1: 'clamp(1.35rem, 1.25rem + 0.5vw, 1.62rem)',
    step2: 'clamp(1.6rem, 1.42rem + 0.9vw, 2.15rem)',
    step3: 'clamp(1.95rem, 1.65rem + 1.5vw, 2.9rem)',
    step4: 'clamp(2.35rem, 1.9rem + 2.3vw, 3.9rem)',
    step5: 'clamp(2.7rem, 2rem + 3.6vw, 5.2rem)',
  },
  weights: { body: 400, strong: 700, display: 700 },
  lineHeights: { body: 1.85, heading: 1.45 },
  labelTracking: '0.14em',
};
