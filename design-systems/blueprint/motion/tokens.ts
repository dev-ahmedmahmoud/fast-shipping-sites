import type { MotionTokens } from '@engine/contract';

// Precise and mechanical: a firm ease-out with no overshoot, like a plotter arm
// arriving on its mark.
export const motionTokens: MotionTokens = {
  durations: { fast: '160ms', base: '420ms', slow: '800ms' },
  easings: { out: 'cubic-bezier(0.22, 1, 0.36, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '14px',
};
