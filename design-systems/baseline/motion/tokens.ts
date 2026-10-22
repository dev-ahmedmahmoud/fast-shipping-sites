import type { MotionTokens } from '@engine/contract';

export const motionTokens: MotionTokens = {
  durations: { fast: '150ms', base: '450ms', slow: '800ms' },
  easings: { out: 'cubic-bezier(0.2, 0.7, 0.2, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '16px',
};
