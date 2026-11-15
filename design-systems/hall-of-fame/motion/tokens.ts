import type { MotionTokens } from '@engine/contract';

// Slow and settled: lights warm up, medals turn once, nothing bounces.
export const motionTokens: MotionTokens = {
  durations: { fast: '220ms', base: '650ms', slow: '1200ms' },
  easings: { out: 'cubic-bezier(0.22, 0.61, 0.36, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '22px',
};
