import type { MotionTokens } from '@engine/contract';

// A little overshoot on the way out: things land like a sticker slapped on a page.
export const motionTokens: MotionTokens = {
  durations: { fast: '160ms', base: '520ms', slow: '900ms' },
  easings: { out: 'cubic-bezier(0.34, 1.45, 0.64, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '22px',
};
