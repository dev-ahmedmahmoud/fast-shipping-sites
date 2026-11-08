import type { LayoutTokens } from '@engine/contract';

// Generous space and soft, round corners: planets and capsules, not boxes.
export const layoutTokens: LayoutTokens = {
  space: {
    s1: '0.25rem', s2: '0.5rem', s3: '0.75rem', s4: '1rem', s5: '1.5rem',
    s6: '2.25rem', s7: '3.25rem', s8: '5rem', s9: '7.5rem',
  },
  radius: { s: '8px', m: '18px', l: '32px', pill: '999px' },
  maxWidth: '76rem',
  gutter: 'clamp(16px, 4.5vw, 48px)',
};
