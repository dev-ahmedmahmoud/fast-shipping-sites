import type { LayoutTokens } from '@engine/contract';

// Radii are uneven on purpose: corners cut with child scissors, not a ruler.
export const layoutTokens: LayoutTokens = {
  space: {
    s1: '0.25rem', s2: '0.5rem', s3: '0.75rem', s4: '1rem', s5: '1.5rem',
    s6: '2rem', s7: '3rem', s8: '4.75rem', s9: '7rem',
  },
  radius: {
    s: '7px 3px 6px 4px / 4px 6px 3px 7px',
    m: '14px 5px 12px 6px / 6px 13px 5px 14px',
    l: '26px 9px 22px 11px / 10px 24px 9px 26px',
    pill: '999px',
  },
  maxWidth: '72rem',
  gutter: 'clamp(16px, 4.5vw, 44px)',
};
