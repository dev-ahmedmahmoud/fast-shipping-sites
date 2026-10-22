import type { Typography } from '@engine/contract';
import balooArabic from './type-fonts/baloo-bhaijaan-2-arabic.woff2?url';
import balooLatin from './type-fonts/baloo-bhaijaan-2-latin.woff2?url';
import rubikArabic from './type-fonts/rubik-arabic.woff2?url';
import rubikLatin from './type-fonts/rubik-latin.woff2?url';

// Baloo Bhaijaan 2 is rounded and bouncy in both Arabic and Latin; Rubik is a soft,
// readable body face that also covers both scripts. Both are variable fonts (OFL,
// from Google Fonts), self-hosted so that no cross-origin stylesheet holds up the
// first paint: `fontsHref` is a small inline stylesheet that the browser reads with
// no network request, and the font files come from the site itself.
const ARABIC = 'U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC';
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const face = (family: string, weights: string, url: string, range: string) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weights};font-display:swap;src:url(${url}) format("woff2");unicode-range:${range}}`;

const css = [
  face('Baloo Bhaijaan 2', '400 800', balooArabic, ARABIC),
  face('Baloo Bhaijaan 2', '400 800', balooLatin, LATIN),
  face('Rubik', '300 900', rubikArabic, ARABIC),
  face('Rubik', '300 900', rubikLatin, LATIN),
].join('');

export const typography: Typography = {
  fontsHref: `data:text/css;charset=utf-8,${encodeURIComponent(css)}`,
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
