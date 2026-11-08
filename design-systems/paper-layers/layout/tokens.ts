import type { LayoutTokens } from '@engine/contract';

// Calm and generous: room around every sheet, gently cut corners like trimmed card.
export const layoutTokens: LayoutTokens = {
  space: {
    s1: '0.25rem', s2: '0.5rem', s3: '0.75rem', s4: '1rem', s5: '1.5rem',
    s6: '2rem', s7: '3.25rem', s8: '5rem', s9: '7rem',
  },
  radius: { s: '6px', m: '12px', l: '20px', pill: '999px' },
  maxWidth: '74rem',
  gutter: 'clamp(16px, 4vw, 44px)',
};
