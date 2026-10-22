import type { Typography } from '@engine/contract';
import './fonts/fonts.css';

// Comic lettering in both scripts:
// - Bangers (Latin only) letters English headings like a comic book.
// - Lalezar (Arabic) is the bold Arabic display face; Arabic glyphs fall
//   through Bangers to it automatically.
// - Baloo Bhaijaan 2 (Arabic and Latin, variable 400–800) is the rounded,
//   friendly body face.
//
// The fonts are self-hosted (fonts/, SIL Open Font License) and declared in
// fonts/fonts.css, which the build bundles into the page's own stylesheet.
// The engine renders `fontsHref` as a render-blocking stylesheet, and a
// cross-origin Google Fonts one cost about 0.9 s of first paint on a mid-range
// phone, so `fontsHref` is an empty inline stylesheet here.
export const typography: Typography = {
  fontsHref: 'data:text/css,',
  families: {
    display: '"Bangers", "Lalezar", "Baloo Bhaijaan 2", "Arial Black", Tahoma, sans-serif',
    body: '"Baloo Bhaijaan 2", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(0.86rem, 0.83rem + 0.15vw, 0.95rem)',
    step0: 'clamp(1.02rem, 0.98rem + 0.2vw, 1.12rem)',
    step1: 'clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)',
    step2: 'clamp(1.55rem, 1.35rem + 1vw, 2.05rem)',
    step3: 'clamp(1.95rem, 1.6rem + 1.75vw, 2.9rem)',
    step4: 'clamp(2.4rem, 1.85rem + 2.75vw, 4rem)',
    step5: 'clamp(2.75rem, 1.9rem + 4.25vw, 5.4rem)',
  },
  // Bangers and Lalezar ship one weight; asking for more would fake bold.
  weights: { body: 400, strong: 600, display: 400 },
  lineHeights: { body: 1.65, heading: 1.12 },
  labelTracking: '0.08em',
};
