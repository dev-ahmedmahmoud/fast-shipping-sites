// The design-system contract. Every system under design-systems/<name>/ provides
// these four parts; a build can take each part from a different system.

/** Color roles. Every component colors itself only through these. */
export interface ColorTokens {
  bg: string;
  surface: string;
  sunk: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  /** Optional second accent for highlights; falls back to accent. */
  highlight?: string;
}

/** palette.ts */
export interface Palette {
  light: ColorTokens;
  dark: ColorTokens;
  /** 'both' follows the visitor's OS setting; 'light' or 'dark' commits to one look. */
  scheme: 'both' | 'light' | 'dark';
}

/** type.ts. Families must cover both Arabic and Latin, or list a fallback that does. */
export interface Typography {
  /** Google Fonts stylesheet URL loading every face below. */
  fontsHref: string;
  families: { display: string; body: string; mono?: string };
  /** Fluid type scale, CSS values. step0 is body text. */
  scale: Record<'stepMinus1' | 'step0' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5', string>;
  weights: { body: number; strong: number; display: number };
  lineHeights: { body: number; heading: number };
  /** Latin-only letter-spacing for uppercase labels. Arabic never gets letter-spacing. */
  labelTracking: string;
}

/** layout/tokens.ts */
export interface LayoutTokens {
  space: Record<'s1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8' | 's9', string>;
  radius: { s: string; m: string; l: string; pill: string };
  maxWidth: string;
  gutter: string;
}

/** motion/tokens.ts */
export interface MotionTokens {
  durations: { fast: string; base: string; slow: string };
  easings: { out: string; inOut: string };
  /** Pixels a revealed element travels. 0 disables movement but keeps fades. */
  revealDistance: string;
}

/** The section components every layout must export from layout/index.ts. */
export const SECTION_COMPONENTS = ['Header', 'Hero', 'FeatureGrid', 'Stats', 'NewsList', 'CTA', 'Footer', 'Prose'] as const;
