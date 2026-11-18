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
- **Fonts.** Every family must cover Arabic and Latin, or list a fallback that does. Self-host them (a Google Fonts stylesheet costs first paint): put the `.woff2` files and a `fonts.css` with relative `url("./file.woff2")` rules in the system folder, `import` that CSS from `type.ts`, and set `fontsHref: 'data:text/css,'`. Never build `@font-face` rules in JavaScript from `?url` imports into an inline `data:` stylesheet: those URLs ignore the build's base path, so the fonts fail on every gallery sample. To preload the files a page needs first (worth it: it stops headings re-wrapping when the font swaps in), list them per language in `typography.preload` from `?url` imports, e.g. `preload: { ar: [arabicWoff2], en: [latinWoff2] }`; the engine adds the base path. A system may be type only (`cairo`) or palette only (`royal-blue`) and mix with any other.
- **Live design.** `client.json` `"live": "<sample id>"` names the sample the client chose. A live build takes every part from it that no `DS_*` variable sets, so `CLIENT=<slug> pnpm build` builds the live site and a design change in the repository reaches it on the next push.
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

Imported page bodies use a few class names that every layout should style inside `Prose`: `.gallery` (a grid of images, from old sliders), `.students` (captioned photo grid), `.downloads` (file list), `.actions` (buttons), `.embed` and `.embed--map` (video and map iframes), `.note`, `.form` (old-site forms shown as they were), and `.logos` (partner and accreditation logos; the engine's base CSS already shows them whole in a grid, so a layout only needs to style it if it wants a different look).

## Election sites

A client with `"kind": "elections"` in `client.json` (a club's election list, such as `clients/tantasportsclubelections`) gets its pages from `clients/<slug>/elections.json` through a second, optional set of section components. Systems that only serve schools can ignore all of this: a system that wants to style an election site adds `layout/elections/index.ts` exporting `electionComponents`, and any component it leaves out falls back to baseline's (`baseline/layout/elections/`). Header, Footer and the rules above apply unchanged. Don't re-export the set from `layout/index.ts`: the engine loads it only for election clients, so school sites never carry its code or styles.

```ts
// layout/elections/index.ts
import Countdown from './Countdown.astro';
export const electionComponents = { Countdown };   // the rest come from baseline
```

Types come from `@elections/data` (`VideoData`, `CandidateCard`, `FileCard`, `CountdownData`, `BallotGroup`, `Clip`, `VenturesData`, `ShareKitData`) and `Action` from `@engine/content`. Every component also gets `ctx`. Text arrives already written in the client's numerals.

| Component | Used on | Props besides `ctx` |
| --- | --- | --- |
| ElectionHero | home | `title`, `slogan`, `sub`, `actions: Action[]`, `image` (team photo or null), `imageAlt`, `crest` (or null) |
| Countdown | home | `countdown: CountdownData` (`at`, `timezone`, `title`, `labels {d,h,m,s}`, `today`, `after`, `dateText`) |
| ProgramFiles | home, files, file | `title?`, `lead?`, `hint?`, `files: FileCard[]` (`title`, `tagline`, `icon` as inline SVG using `currentColor`, `href`), `layout?: 'grid' \| 'strip'` (strip: one sideways-scrolling row on phones; home and "other files" use it) |
| LeaderSpotlight | home | `kicker`, `name`, `text`, `more {label, href}`, `video: VideoData \| null`, `photo` |
| CandidateGrid | home, candidates, candidate | `variant: 'strip' \| 'groups'`, `title?`, `lead?`, `groups: {label, candidates: CandidateCard[]}[]`, `more?`, `cardMore` (profile link label), `numberLabel` ("رقم") |
| InterviewStrip | home | `title`, `lead?`, `items: {name, seat, href, poster, cta}[]` |
| BallotCard | home, candidates | `id`, `title`, `text`, `groups: BallotGroup[]`, `share {label, href}` (WhatsApp), `support: Action \| null`, `download {label}` |
| PageBand | inner pages | `title`, `lead?`, `kicker?: Action \| null`, `action?: Action \| null`, `crest` |
| CandidateHero | candidate | `candidate: CandidateCard`, `kicker: Action \| null` (link to the group), `numberLabel` |
| MediaFrame | candidate | `video: VideoData` (the candidate's word), `label` |
| InterviewPlayer | candidate | `id`, `title`, `video`, `summary`, `chapters: {t, time, label, aria}[]` |
| PhotoRow | candidate | `photos: ImageMetadata[]`, `alt`, `label`, `hint?` |
| ClipGrid | candidate, file | `id?`, `title?`, `groups: {title?, href?, clips: Clip[]}[]` |
| Panel | candidate, file, support, complaints | `id?`, `label?`; the page body or an engine widget arrives in the slot |
| Ventures | candidate (when its `ventures` block in elections.json has items) | `id?`, `ventures: VenturesData` (`title`, `lead?`, `stats {value, label}[]`, `items: Venture[]` with `name`, `nameLatin?`, `sector`, `text`, `highlights[]`, `logo` (full colour, transparent 3:2) and `logoMono` (white) or null, `color?`, `url?` (the company's site: link the card to it); `numbers` (1…n in the client's numerals), `labels {list, prev, next, pause, play, pick, visit}`) |
| ShareKit | support (when `support.share` in elections.json has messages; else the supporters' app) | `kit: ShareKitData` (`url` to share, `host`, `steps[]`, `pick`, `messages {label, text}[]` with the link already in, `preview {image, title, description}` = the linked page's own share data, `labels {button, copy, copyLink, copied, note, preview}`, `chat {name, status, reply, input}`). Share links are `https://wa.me/?text=<message>` |

### Engine hooks

The engine owns the behaviour; a design only styles it. Keep these attributes in your markup:

- **Countdown**: a box with `data-el-countdown`, `data-at`, `data-zone`, `data-today`, `data-after`; number cells `[data-k="d|h|m|s"]`; the title `[data-el-countdown-title]`. The engine fills the cells every second in the client's numerals. On election day it shows `data-today` in the title and adds `.is-msg.is-today` (after it, `data-after` and `.is-msg.is-after`); hide the cells under `.is-msg`.
- **Ballot card**: the section carries `data-el-ballot` and an `id`; the download button is `<button type="button" data-el-card>`. The PNG is drawn on a canvas in `--font-display`, in colors read from `--el-card-bg`, `--el-card-bg2` (gradient end), `--el-card-accent`, `--el-card-accent2` and `--el-card-ink` set on that section (any CSS color, tokens included).
- **Interview player**: the section carries `data-el-interview`; each chapter is `<button data-el-seek="<seconds>">`, which starts the section's video at that moment. A `<details data-el-open-wide>` is opened by the engine on wide screens.
- **Videos**: render every video with `@elections/Video.astro` (props `video`, `widths?`, `sizes?`, `class?`, `showCaption?`). It outputs `.el-video[data-el-video][data-src]` holding a poster button `.el-video__play` (`.el-video__poster`, `.el-video__icon`, `.el-video__label`). The engine swaps in a `<video>` only when pressed (nothing downloads before), plays one at a time, and adds `.is-playing` and, while buffering, `.is-loading`.

### Engine widgets

These come from the engine as finished markup; a system restyles them through their classes (default styles in `apps/site/src/elections/elections.css` sit inside `:where()`, so any selector of yours wins):

- **Supporters' app** (`@elections/SupportApp.astro`, `.el-sup`): join, log in, WhatsApp code, password reset and the dashboard (personal link, copy, WhatsApp share, visit count, progress to the goal). Classes: `.el-sup__box`, `.el-sup__tabs`, `.el-sup__tab`, `.el-sup__f` (a field), `.el-sup__label`, `.el-sup__go` (`--alt`, `--wa`), `.el-sup__link`, `.el-sup__msg`, `.el-sup__err`, `.el-sup__card`, `.el-sup__url`, `.el-sup__num`, `.el-sup__track` and `.el-sup__fill` (progress), `.el-sup__demo`.
- **Complaints form** (`@elections/ComplaintForm.astro`, `.el-form`): `.el-form__field`, `.el-form__label`, `.el-form__input`, `.el-form__choice`, `.el-form__file-btn`, `.el-form__help`, `.el-form__err`, `.el-form__go`, `.el-form__msg` (`.is-good` / `.is-bad`), `.el-form__demo`.

Both talk to the backend through one adapter (`apps/site/src/elections/client/api.ts`): `"api": {"mode": "demo"}` keeps everything in the visitor's browser and labels it as a preview; `"live"` calls the routes in `clients/<slug>/API.md`.
