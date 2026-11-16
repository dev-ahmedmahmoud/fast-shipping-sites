import type { Typography } from '@engine/contract';
// The @font-face rules live in a real stylesheet so their URLs follow the build's base path.
import './type-fonts/fonts.css';
import kufiArabic from './type-fonts/reem-kufi-arabic.woff2?url';
import naskhArabic from './type-fonts/noto-naskh-arabic.woff2?url';
import kufiLatin from './type-fonts/reem-kufi-latin.woff2?url';
import naskhLatin from './type-fonts/noto-naskh-latin.woff2?url';

// - Reem Kufi (Arabic and Latin, variable 400–700): a calm geometric Kufi with the
//   upright, even strokes of hand-painted enamel station signs. Headings, numbers, boards.
// - Noto Naskh Arabic (Arabic and Latin, variable 400–700): the Naskh that Egyptian
//   newspapers and forms taught every reader over 40; set large and loose for long reading.
// Both SIL OFL (licenses in type-fonts/), self-hosted and bundled into the page CSS, so
// no cross-origin request holds up the first paint.
export const typography: Typography = {
  // Nothing to fetch: the faces arrive with the page CSS (type-fonts/fonts.css).
  fontsHref: 'data:text/css,',
  families: {
    display: '"Reem Kufi", "Noto Naskh Arabic", Tahoma, system-ui, sans-serif',
    body: '"Noto Naskh Arabic", "Reem Kufi", Tahoma, "Segoe UI", system-ui, sans-serif',
    mono: '"Reem Kufi", ui-monospace, Menlo, monospace',
  },
  // Body text is 18–20px at every width: the list's voters read on phones held at arm's length.
  scale: {
    stepMinus1: 'clamp(1rem, 0.97rem + 0.15vw, 1.08rem)',
    step0: 'clamp(1.125rem, 1.08rem + 0.25vw, 1.25rem)',
    step1: 'clamp(1.3rem, 1.2rem + 0.5vw, 1.55rem)',
    step2: 'clamp(1.55rem, 1.35rem + 1vw, 2.05rem)',
    step3: 'clamp(1.9rem, 1.55rem + 1.75vw, 2.8rem)',
    step4: 'clamp(2.3rem, 1.8rem + 2.6vw, 3.7rem)',
    step5: 'clamp(2.65rem, 1.9rem + 3.8vw, 4.8rem)',
  },
  weights: { body: 400, strong: 700, display: 600 },
  lineHeights: { body: 1.9, heading: 1.4 },
  labelTracking: '0.12em',
  // The page's two faces at once (the same files fonts.css bundles).
  preload: { ar: [kufiArabic, naskhArabic], en: [kufiLatin, naskhLatin] },
};
