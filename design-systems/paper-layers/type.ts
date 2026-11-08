import type { Typography } from '@engine/contract';
// The @font-face rules live in a real stylesheet so their URLs follow the build's base path.
import './type-fonts/fonts.css';

// Alexandria (display) is a geometric face drawn for Arabic and Latin together,
// named after the Egyptian city; it reads confident without shouting. IBM Plex
// Sans Arabic (body) is calm and very readable in both scripts. Both are OFL and
// self-hosted: the @font-face rules ship in the page CSS, so no cross-origin request holds
// up the first paint, and unicode-range means a page only downloads the script it uses.
export const typography: Typography = {
  // Nothing to fetch: the faces arrive with the page CSS (type-fonts/fonts.css).
  fontsHref: 'data:text/css,',
  families: {
    display: '"Alexandria", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, system-ui, sans-serif',
    body: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, system-ui, -apple-system, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(0.86rem, 0.84rem + 0.1vw, 0.92rem)',
    step0: 'clamp(1rem, 0.97rem + 0.15vw, 1.08rem)',
    step1: 'clamp(1.18rem, 1.1rem + 0.4vw, 1.4rem)',
    step2: 'clamp(1.42rem, 1.28rem + 0.7vw, 1.8rem)',
    step3: 'clamp(1.72rem, 1.48rem + 1.2vw, 2.4rem)',
    step4: 'clamp(2.05rem, 1.66rem + 1.95vw, 3.2rem)',
    step5: 'clamp(2.35rem, 1.8rem + 2.9vw, 4.1rem)',
  },
  weights: { body: 400, strong: 600, display: 700 },
  lineHeights: { body: 1.7, heading: 1.18 },
  labelTracking: '0.12em',
};
