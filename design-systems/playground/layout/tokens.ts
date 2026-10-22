import type { LayoutTokens } from '@engine/contract';

// Chunky and soft: generous spacing, big rounded corners.
export const layoutTokens: LayoutTokens = {
  space: {
    s1: '0.25rem', s2: '0.5rem', s3: '0.75rem', s4: '1rem', s5: '1.5rem',
    s6: '2rem', s7: '3rem', s8: '4.5rem', s9: '6.5rem',
  },
  radius: { s: '10px', m: '18px', l: '28px', pill: '999px' },
  maxWidth: '76rem',
  gutter: 'clamp(16px, 4vw, 40px)',
};
