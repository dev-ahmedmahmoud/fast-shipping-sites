import type { Typography } from '@engine/contract';
// The @font-face rules live in a real stylesheet so their URLs follow the build's base path.
import './type-fonts/fonts.css';

// Baloo Bhaijaan 2 is rounded and bouncy in both Arabic and Latin; Rubik is a soft,
// readable body face that also covers both scripts. Both are variable fonts (OFL,
// from Google Fonts), self-hosted so that no cross-origin stylesheet holds up the
// first paint: the @font-face rules ship in the page CSS and the font files come from the
// site itself.
export const typography: Typography = {
  // Nothing to fetch: the faces arrive with the page CSS (type-fonts/fonts.css).
  fontsHref: 'data:text/css,',
  families: {
    display: '"Baloo Bhaijaan 2", "Rubik", "Arial Rounded MT Bold", system-ui, sans-serif',
    body: '"Rubik", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(0.86rem, 0.83rem + 0.15vw, 0.94rem)',
    step0: 'clamp(1rem, 0.96rem + 0.2vw, 1.12rem)',
    step1: 'clamp(1.22rem, 1.12rem + 0.5vw, 1.5rem)',
    step2: 'clamp(1.5rem, 1.3rem + 0.95vw, 2rem)',
    step3: 'clamp(1.85rem, 1.5rem + 1.6vw, 2.8rem)',
    step4: 'clamp(2.25rem, 1.7rem + 2.7vw, 3.9rem)',
    step5: 'clamp(2.5rem, 1.7rem + 4vw, 5rem)',
  },
  weights: { body: 400, strong: 700, display: 800 },
  lineHeights: { body: 1.7, heading: 1.2 },
  labelTracking: '0.08em',
};
