import type { LayoutTokens } from '@engine/contract';

// Generous space and modest corners: carved wood, not rounded plastic.
export const layoutTokens: LayoutTokens = {
  space: {
    s1: '0.25rem', s2: '0.5rem', s3: '0.85rem', s4: '1.15rem', s5: '1.6rem',
    s6: '2.25rem', s7: '3.25rem', s8: '5rem', s9: '7.5rem',
  },
  radius: { s: '4px', m: '10px', l: '18px', pill: '999px' },
  maxWidth: '72rem',
  gutter: 'clamp(18px, 4.5vw, 44px)',
};
