// Turns the four design-system parts into one block of CSS custom properties.
import type { ColorTokens, LayoutTokens, MotionTokens, Palette, Typography } from './contract';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function colorVars(c: ColorTokens): string {
  return Object.entries({ ...c, highlight: c.highlight ?? c.accent })
    .map(([k, v]) => `--c-${kebab(k)}:${v};`)
    .join('');
}

const STEP_NAMES: Record<keyof Typography['scale'], string> = {
  stepMinus1: '--step--1', step0: '--step-0', step1: '--step-1', step2: '--step-2',
  step3: '--step-3', step4: '--step-4', step5: '--step-5',
};

export function tokensCss(p: Palette, t: Typography, l: LayoutTokens, m: MotionTokens): string {
  const vars = [
    colorVars(p.scheme === 'dark' ? p.dark : p.light),
    `--font-display:${t.families.display};--font-body:${t.families.body};--font-mono:${t.families.mono ?? 'ui-monospace, monospace'};`,
    Object.entries(t.scale).map(([k, v]) => `${STEP_NAMES[k as keyof Typography['scale']]}:${v};`).join(''),
    `--weight-body:${t.weights.body};--weight-strong:${t.weights.strong};--weight-display:${t.weights.display};`,
    `--lh-body:${t.lineHeights.body};--lh-heading:${t.lineHeights.heading};--label-tracking:${t.labelTracking};`,
    Object.entries(l.space).map(([k, v]) => `--space-${k.slice(1)}:${v};`).join(''),
    Object.entries(l.radius).map(([k, v]) => `--radius-${k}:${v};`).join(''),
    `--max-width:${l.maxWidth};--gutter:${l.gutter};`,
    `--dur-fast:${m.durations.fast};--dur-base:${m.durations.base};--dur-slow:${m.durations.slow};`,
    `--ease-out:${m.easings.out};--ease-in-out:${m.easings.inOut};--reveal-distance:${m.revealDistance};`,
  ].join('');

  let css = `:root{${vars}color-scheme:${p.scheme === 'dark' ? 'dark' : 'light'}}`;
  // Arabic letters join; spacing them apart breaks words.
  css += `:root:lang(ar){--label-tracking:0}`;
  if (p.scheme === 'both') {
    const dark = colorVars(p.dark) + 'color-scheme:dark';
    css += `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
  }
  return css;
}
