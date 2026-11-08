import type { MotionTokens } from '@engine/contract';

// Smooth, weighty easing: things glide into orbit rather than bounce.
export const motionTokens: MotionTokens = {
  durations: { fast: '160ms', base: '420ms', slow: '900ms' },
  easings: { out: 'cubic-bezier(0.16, 1, 0.3, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  revealDistance: '36px',
};
