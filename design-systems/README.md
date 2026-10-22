# Design systems

Each folder here is one complete look. A build takes four **parts** (palette, type, layout and motion), and each part can come from a different system, so a client can ask for "Aurora's layout with Mashrabiya's colors".

```
CLIENT=lfis SYSTEM=aurora pnpm build                          # all four parts from aurora
CLIENT=lfis SYSTEM=aurora DS_PALETTE=mashrabiya pnpm build    # aurora, with mashrabiya's colors
```

Types for everything below live in `apps/site/src/lib/contract.ts`.

## Folder layout

```
design-systems/<name>/
  meta.ts            name, Arabic/English label and summary (shown in the client gallery)
  palette.ts         export const palette: Palette        light + dark color roles
  type.ts            export const typography: Typography  Google Fonts URL, families, fluid scale
  layout/
    tokens.ts        export const layoutTokens: LayoutTokens  spacing, radius, max width, gutter
    global.css       page-wide styles (body, headings, .container, .btn, .label, .todo-note)
    index.ts         export { layoutTokens }; export const components = { Header, Hero, ... }
    Header.astro  Hero.astro  FeatureGrid.astro  Stats.astro
    NewsList.astro  CTA.astro  Footer.astro  Prose.astro
  motion/
    tokens.ts        export const motionTokens: MotionTokens
    Motion.astro     client-side motion island (a <script>), rendered once per page
```

Copy `baseline/` to start a new system, then change it.

## Rules every system follows

- **Color only through tokens.** Components use `var(--c-bg)`, `var(--c-ink)`, `var(--c-accent)` and so on, never literal colors, so any palette fits any layout. Spacing uses `--space-1` to `--space-9`, radius `--radius-s|m|l|pill`, type `--step--1` to `--step-5` with `--font-display` and `--font-body`, motion `--dur-*`, `--ease-*` and `--reveal-distance`.
- **Logical CSS only.** Use `margin-inline-start`, `padding-block`, `inset-inline-end`, `text-align: start`. Never `left` or `right` for layout, so Arabic (right-to-left) works with no overrides. Directional icons get the `flip-rtl` class.
- **Scoped component styles.** Component `<style>` blocks stay scoped. Only `layout/global.css` and `motion/Motion.astro` may write global CSS.
- **Arabic text.** Never split Arabic into letters: the letters join, and per-letter spans break them. Animate whole words: put `data-split-words` on an element and use `splitWords` from `@engine/split`. Never add letter-spacing to Arabic; `--label-tracking` is already 0 on Arabic pages.
- **Fonts.** Every family must cover Arabic and Latin, or list a fallback that does.
- **Motion.** Load GSAP, Lenis, WebGL and the like inside `Motion.astro` with dynamic `import()`. Skip all of it under `prefers-reduced-motion: reduce`, and gate heavy effects behind a device-capability check. Content must be visible with JavaScript off, so animate *from* the visible state.
- **Media rules.** No music, no autoplay sound, and no seasonal themes unless a client asks. Images follow the client's media rules in `clients/<slug>/intake.json`.
- **Runtime libraries.** Any library a system uses at runtime is declared in `design-systems/package.json`.

## What components receive

Every component gets `ctx: PageContext`: locale, direction, UI strings, site name, motto and logo, nav, footer links, the header call to action, language links, contact (address, phones, WhatsApp, department emails, hours, map), social, the footer's legal line and credit (`ctx.legal`), and formatters for numbers, years and dates in the client's numerals.

- `ctx.site.logo` is image metadata (or null): render it with `<Image>` from `astro:assets` so it is resized and served as WebP.
- `ctx.nav` items can have `children` (a sub-menu, e.g. Admission ▸ New registration). External items (portals, careers) come last with `external: true`.

Section components also get their section data, with links already resolved:

| Component | Props besides `ctx` |
| --- | --- |
| Header, Footer | none |
| Hero | `eyebrow?`, `title`, `lead?`, `actions: {label, href, external}[]`, `images?: ImageMetadata[]` (the client's hero photos; show any, all or none), `video?: HeroVideo \| null` (a silent clip; render the first frame with `@engine/HeroMedia.astro`, which shows its poster and handles loading) |
| FeatureGrid | `title?`, `items: {title, text?, href?, external?}[]` |
| Stats | `title?`, `items: {value, label}[]` (values already formatted) |
| NewsList | `title?`, `items: {title, href, date?, excerpt?}[]`, `more?`, `headingLevel?` |
| CTA | `title`, `text?`, `action` |
| Prose | `title`, `lead?`, `todo?`, `headingLevel?` (1 for a page title, 2 when several share a page, e.g. news items), `id?` (anchor); the page body arrives in the default slot |

Imported page bodies use a few class names that every layout should style inside `Prose`: `.gallery` (a grid of images, from old sliders), `.students` (captioned photo grid), `.downloads` (file list), `.actions` (buttons), `.embed` and `.embed--map` (video and map iframes), `.note`, and `.form` (old-site forms shown as they were).
