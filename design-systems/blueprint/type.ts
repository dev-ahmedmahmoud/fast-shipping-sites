import type { Typography } from '@engine/contract';
import './type-fonts/fonts.css';

// Engineering lettering in both scripts:
// - Changa (Arabic and Latin, variable 400–800): a squared, slightly condensed
//   display face that reads like stencilled drawing titles.
// - IBM Plex Sans Arabic (Arabic and Latin, 400 and 600): a precise, engineered
//   body face from the same family as the mono below.
// - IBM Plex Mono (Latin): sheet numbers, scales and labels. Arabic labels fall
//   through to Plex Sans Arabic.
// All SIL OFL (licenses in type-fonts/), self-hosted and declared in
// type-fonts/fonts.css, which the build bundles into the page's own stylesheet,
// so no cross-origin request holds up the first paint. `fontsHref` is therefore
// empty and the engine adds no font stylesheet of its own.
export const typography: Typography = {
  fontsHref: '',
  families: {
    display: '"Changa", "IBM Plex Sans Arabic", "Arial Narrow", Tahoma, sans-serif',
    body: '"IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
    mono: '"IBM Plex Mono", "IBM Plex Sans Arabic", ui-monospace, "SFMono-Regular", Menlo, monospace',
  },
  scale: {
    stepMinus1: 'clamp(0.84rem, 0.81rem + 0.15vw, 0.92rem)',
    step0: 'clamp(1rem, 0.96rem + 0.2vw, 1.1rem)',
    step1: 'clamp(1.2rem, 1.1rem + 0.5vw, 1.45rem)',
    step2: 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
    step3: 'clamp(1.9rem, 1.55rem + 1.75vw, 2.85rem)',
    step4: 'clamp(2.35rem, 1.8rem + 2.75vw, 3.9rem)',
    step5: 'clamp(2.7rem, 1.9rem + 4vw, 5.2rem)',
  },
  weights: { body: 400, strong: 600, display: 700 },
  lineHeights: { body: 1.7, heading: 1.08 },
  labelTracking: '0.14em',
};
