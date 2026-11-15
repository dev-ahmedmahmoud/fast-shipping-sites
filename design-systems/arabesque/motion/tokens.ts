import type { MotionTokens } from '@engine/contract';

// Slow and graceful: screens part, light sweeps, nothing bounces.
export const motionTokens: MotionTokens = {
  durations: { fast: '220ms', base: '700ms', slow: '1400ms' },
  easings: { out: 'cubic-bezier(0.22, 0.61, 0.21, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '18px',
};
