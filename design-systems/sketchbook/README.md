# Sketchbook

A child's school notebook come alive. Pages sit on ruled paper with a red margin line and a spiral binding. Headings are hand-lettered. Crayon doodles (stars, suns, rockets, paper planes, lightbulbs, arrows) draw themselves as you scroll. Content is held by washi tape, sticky notes, paper clips and printed photos. A paper plane flies down the margin as you read.

Built for school clients: fun and colorful, but light on phones. The art is all generated in code (SVG and CSS), so it works with any client's photos and never needs figurative illustration.

```
CLIENT=lfis SYSTEM=sketchbook pnpm build
```

Previews: `previews/home-ar-1280.jpg`, `previews/home-en-1280.jpg`, `previews/home-ar-390.jpg`, `previews/about-en-390.jpg`.

## Palette (`palette.ts`)

Notebook paper (`bg`), white sheets (`surface`), a kraft back cover (`sunk`), ballpoint ink (`ink`), blue rules (`line`), a blue crayon (`accent`), a highlighter (`accentSoft`) and the teacher's red pen (`highlight`). The scheme is `light`: paper is the identity. The `dark` set is a chalkboard, for builds that choose it.

**The crayon box.** `layout/global.css` defines `--crayon-1` to `--crayon-6` from the palette alone: accent and highlight, plus colors turned around the color wheel from them with CSS relative color syntax (`oklch(from var(--c-accent) … calc(h - 118))`). Any palette dropped onto this layout brings its own matching crayons. Browsers without relative colors fall back to accent and highlight.

## Type (`type.ts`, `fonts/`)

- Display: **Marhey**, hand-lettered in both Arabic and Latin.
- Body: **Baloo Bhaijaan 2**, round and friendly, readable in long Arabic and English text.

Both are variable fonts, **self-hosted** in `fonts/` (Arabic and Latin subsets only, SIL Open Font License 1.1, license files included). `type.ts` imports `fonts/fonts.css`, so the `@font-face` rules travel with the type part into any build that uses it. `fontsHref` is an empty inline stylesheet (`data:text/css,`), so the engine's `<link>` costs nothing. This removed about 860 ms of render-blocking time on mobile compared with the Google Fonts stylesheet, and visitors' browsers never contact Google.

The hero title sits between step 4 and step 5 because Marhey is wide and school names are long.

## Layout (`layout/`)

| Component | Look |
| --- | --- |
| Header | White strip with a spiral binding along the top. The logo is a taped sticker, and the language switch is a round yellow sticker. The current page is circled in crayon, and hover draws a crayon squiggle. Sub-menus are sticky notes. On mobile, the menu is a ruled notebook page. |
| Hero | Hand-lettered title, a crayon underline, and the motto with a lit lightbulb (the motto is about thinking) under a highlighter swipe. A curly arrow points to the first button. Photos form a collage: the first as a portrait print, the next two as panorama strips taped across it. A sun, rocket, paper plane and sparkles sit around it. |
| FeatureGrid | Sticky notes in crayon tints with a push pin, a doodle icon and a folded corner. On hover they lift toward you (CSS 3D) and the corner folds further. |
| Stats | Big numbers circled in crayon, with a gold star. |
| NewsList | Pages torn out of a spiral notebook, with punched holes (a mask), blue rules, a red margin, a paper clip, and the date as a red teacher's stamp. |
| CTA | One big sticky note taped across the page, with a gold star and a pencil. |
| Footer | The kraft back cover, with the notebook's name label ("Name / Motto") as a sticker. |
| Prose | A graph-paper sheet with a red margin line, taped at the corners. Section headings get crayon squiggles that cycle through the crayon box, and list bullets are crayon stars. Galleries and student photos are taped prints with handwritten captions. Tables are graph paper with a highlighted header. Downloads are a checklist, and old-site forms are a fill-in worksheet with dotted lines. |

`Doodle.astro` is the doodle library (19 hand-drawn shapes). Every stroke has `pathLength="1"`, so the motion part can draw it. Doodles are `aria-hidden` decoration.

All layout CSS uses logical properties. Directional doodles (arrows, the plane) get `flip-rtl`, and folded corners and tape mirror on Arabic pages.

## Motion (`motion/`)

No GSAP: CSS animations plus one IntersectionObserver keep the motion script at about 4 KB.

- **Doodles** (`[data-draw]`) draw stroke by stroke when they scroll into view. The bulb lights up once drawn.
- **Headings** (`[data-split-words]`) bounce word by word. Words only, never letters, so Arabic stays joined. The bounce starts from the resting state, so the title paints at once and never delays LCP.
- **Entrances**: sticky notes flip down like pages (`[data-reveal="flip"]`), photos drop and settle (`"drop"`), notes pop (`"pop"`), and everything else fades up (`[data-reveal]`). Siblings are staggered.
- **Highlighter** (`[data-highlight]`) sweeps across the motto.
- **Ambient loops** (`[data-loop]`: spin, twinkle, bob, float) start after the entrance and pause off screen.
- **A paper plane** flies down the margin line as you scroll. It is a CSS scroll timeline, on screens 1100px and wider in browsers that support it; others simply don't show it.
- **Capable desktops only** (fine pointer, 4+ cores, 4+ GB, no Save-Data): the photo collage tilts toward the pointer (CSS 3D), and Lenis smooths scrolling. Lenis loads when the browser is idle.

Layouts set `--d` to choreograph start delays. The hero runs its whole entrance within about 1.1 s.

An inline script sets the entrance "before" states before first paint, so nothing flashes. If the motion module never starts, everything is shown after 3 s. With JavaScript off, or under `prefers-reduced-motion: reduce`, nothing moves and every doodle is shown fully drawn.

## Measured

Lighthouse 12.8, mobile (simulated slow 4G and a 4× CPU slowdown). LFIS content, served with Brotli as Cloudflare Pages does:

| Page | Performance | Accessibility | Best practices | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/ar/` (home) | 97 | 100 | 96 | 1.8 s | 2.2 s | 0 ms | 0 |
| `/en/` (home) | 97 | 100 | 96 | 1.6 s | 2.0 s | 0 ms | 0 |
| `/ar/about-us-ar/` | 95 | 100 | 96 | 1.9 s | 2.3 s | 0 ms | 0 |
| `/ar/admission-ar/` | 97 | 100 | 96 | 1.8 s | 2.3 s | 0 ms | 0 |

The best-practices point lost is `/favicon.ico` returning 404, which is the client's or engine's to add.

All 51 LFIS pages were checked at 390px and 1280px in both languages: no horizontal overflow, and no console errors from this system. The News pages log errors from the YouTube embeds in the imported content.
