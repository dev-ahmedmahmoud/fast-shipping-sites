import type { MotionTokens } from '@engine/contract';

// Unhurried: card settles into place with a long, soft ease-out and no overshoot.
export const motionTokens: MotionTokens = {
  durations: { fast: '180ms', base: '480ms', slow: '950ms' },
  easings: { out: 'cubic-bezier(0.22, 1, 0.36, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '26px',
};
