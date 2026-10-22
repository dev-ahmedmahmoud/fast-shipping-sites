import type { MotionTokens } from '@engine/contract';

// `out` overshoots a little, so panels and stickers land with a bounce.
export const motionTokens: MotionTokens = {
  durations: { fast: '140ms', base: '380ms', slow: '650ms' },
  easings: { out: 'cubic-bezier(0.34, 1.56, 0.64, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '28px',
};
