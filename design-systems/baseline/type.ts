import type { Typography } from '@engine/contract';

// Readex Pro and IBM Plex Sans Arabic both carry Arabic and Latin glyphs.
export const typography: Typography = {
  fontsHref:
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Readex+Pro:wght@500;600;700&display=swap',
  families: {
    display: '"Readex Pro", "IBM Plex Sans Arabic", system-ui, sans-serif',
    body: '"IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif',
  },
  scale: {
    stepMinus1: 'clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem)',
    step0: 'clamp(1rem, 0.96rem + 0.2vw, 1.1rem)',
    step1: 'clamp(1.2rem, 1.12rem + 0.4vw, 1.4rem)',
    step2: 'clamp(1.44rem, 1.3rem + 0.7vw, 1.8rem)',
    step3: 'clamp(1.73rem, 1.5rem + 1.15vw, 2.4rem)',
    step4: 'clamp(2.07rem, 1.7rem + 1.85vw, 3.2rem)',
    step5: 'clamp(2.49rem, 1.9rem + 2.9vw, 4.3rem)',
  },
  weights: { body: 400, strong: 600, display: 600 },
  lineHeights: { body: 1.7, heading: 1.25 },
  labelTracking: '0.06em',
};
