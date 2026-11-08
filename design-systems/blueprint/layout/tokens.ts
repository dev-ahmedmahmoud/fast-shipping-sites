import type { LayoutTokens } from '@engine/contract';

// Drafting sheets have square corners; only chips and the stamp are round.
export const layoutTokens: LayoutTokens = {
  space: {
    s1: '0.25rem', s2: '0.5rem', s3: '0.75rem', s4: '1rem', s5: '1.5rem',
    s6: '2rem', s7: '3rem', s8: '4.5rem', s9: '6.5rem',
  },
  radius: { s: '2px', m: '4px', l: '10px', pill: '999px' },
  maxWidth: '78rem',
  gutter: 'clamp(16px, 4vw, 44px)',
};
