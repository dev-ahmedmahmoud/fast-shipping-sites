import type { MotionTokens } from '@engine/contract';

// Springy: the "out" easing overshoots a little, like a ball landing.
export const motionTokens: MotionTokens = {
  durations: { fast: '160ms', base: '420ms', slow: '700ms' },
  easings: { out: 'cubic-bezier(0.34, 1.56, 0.64, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '28px',
};
