import type { Typography } from '@engine/contract';
import alexArabic from './type-fonts/alexandria-arabic.woff2?url';
import alexLatin from './type-fonts/alexandria-latin.woff2?url';
import plex400Arabic from './type-fonts/plex-arabic-400-arabic.woff2?url';
import plex400Latin from './type-fonts/plex-arabic-400-latin.woff2?url';
import plex600Arabic from './type-fonts/plex-arabic-600-arabic.woff2?url';
import plex600Latin from './type-fonts/plex-arabic-600-latin.woff2?url';

// Alexandria (display) is a geometric face drawn for Arabic and Latin together,
// named after the Egyptian city; it reads confident without shouting. IBM Plex
// Sans Arabic (body) is calm and very readable in both scripts. Both are OFL and
// self-hosted: `fontsHref` is a tiny inline stylesheet, so no cross-origin request
// holds up the first paint, and unicode-range means a page only downloads the
// script it uses.
const ARABIC = 'U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC';
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const face = (family: string, weights: string, url: string, range: string) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weights};font-display:swap;src:url(${url}) format("woff2");unicode-range:${range}}`;

const css = [
  face('Alexandria', '400 800', alexArabic, ARABIC),
  face('Alexandria', '400 800', alexLatin, LATIN),
  face('IBM Plex Sans Arabic', '400', plex400Arabic, ARABIC),
  face('IBM Plex Sans Arabic', '400', plex400Latin, LATIN),
  face('IBM Plex Sans Arabic', '600', plex600Arabic, ARABIC),
  face('IBM Plex Sans Arabic', '600', plex600Latin, LATIN),
].join('');

export const typography: Typography = {
  fontsHref: `data:text/css;charset=utf-8,${encodeURIComponent(css)}`,
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
