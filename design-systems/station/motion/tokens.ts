import type { MotionTokens } from '@engine/contract';

// Weighty and precise: things arrive like a train easing into the platform, then settle.
export const motionTokens: MotionTokens = {
  durations: { fast: '180ms', base: '620ms', slow: '1100ms' },
  easings: { out: 'cubic-bezier(0.22, 0.9, 0.24, 1)', inOut: 'cubic-bezier(0.7, 0, 0.3, 1)' },
  revealDistance: '22px',
};
