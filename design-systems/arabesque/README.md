# Arabesque (أرابيسك)

Classic Egyptian craft for election sites. Pages open through carved mashrabiya screens, titles are written in Ruqaa calligraphy over a gold rule, ballot numbers sit in gold-inlaid eight-point stars, and the palette is deep emerald, gold leaf and ivory. It is meant for a club's board election in the Nile Delta, read mostly by members aged 40 and over, so it is calm, dignified and easy to read first, and impressive second. Motion is slow and graceful. Nothing bounces, and there is no music.

The first client is `tantasportsclubelections` (Arabic only, right to left). The core components also dress any other client, so a school site builds and reads well in it too.

```
CLIENT=tantasportsclubelections SYSTEM=arabesque pnpm build
CLIENT=lfis SYSTEM=arabesque pnpm build
```

Previews: `previews/home-ar-desktop.jpg`, `previews/home-ar-phone.jpg`, `previews/candidate-ar-desktop.jpg`, `previews/ballot-ar-desktop.jpg`.

## Signature moments

1. **Mashrabiya reveal.** The home hero's gateway, the leader's portrait and every candidate's portrait are covered by two carved lattice screens (`Doors.astro`, a CSS mask of an SVG lattice). When the frame comes into view, the screens slide apart from a gold seam over about two seconds, and the photo stands in warm light falling through a lattice behind it.
2. **Calligraphic titles.** Section and page titles are set in Aref Ruqaa with a gold rule and a small eight-point star (`SectionTitle.astro`, `Rule.astro`). Words rise one after another. Whole words only, so Arabic letters always stay joined.
3. **Gold star medallions.** Ballot numbers sit in an eight-point star with a gold rim and an emerald disc (`Medal.astro`). As each medal comes into view it turns into place, and a sheen of light passes over it once, travelling along the row.
4. **The ornamental clock.** The countdown is a round dial with twelve star marks. A slow cone of light sweeps around it (14 s per turn), and the days, hours, minutes and seconds sit in small pointed arches.
5. **The ballot certificate.** The ballot card is an ivory certificate inside an emerald band, with a double gold frame, a gold star in each corner, the title in Ruqaa and every candidate's number in a medal. The engine's `--el-card-*` variables carry these colors into the downloadable PNG.

## Palette (`palette.ts`)

| Token | Light | Role |
| --- | --- | --- |
| `bg` | `#F5F0E4` | ivory paper |
| `surface` | `#FFFCF5` | cards and the certificate |
| `sunk` | `#ECE4D2` | wells, tabs and inputs |
| `ink` | `#10231D` | text, near-black green (14.4:1 on `bg`) |
| `muted` | `#3D4A44` | secondary text (8.2:1 on `bg`) |
| `line` | `#D3C5A6` | hairlines |
| `accent` | `#0B5A42` | deep emerald: bands, buttons, titles (7.2:1 on `bg`) |
| `accentInk` | `#FFFCF3` | text on emerald (8.0:1) |
| `accentSoft` | `#DCE9DF` | soft emerald tint |
| `highlight` | `#CDA44F` | gold leaf: rims, rules, medals, and labels on the band, which is darker than `accent` |

The scheme is `light`. The dark set (night emerald with the same gold) is there for builds that choose it.

`layout/global.css` derives the craft colors from the palette: `--ar-gold`, `--ar-deep` and `--ar-deeper` (the band's gradient), `--ar-on-deep` and `--ar-shadow`. It also holds the three ornaments as SVG data-URI masks, colored by tokens: `--ar-lattice` (a 48 px mashrabiya tile), `--ar-girih` (a 96 px eight-point star pattern) and `--ar-arch` (a pointed arch).

## Type (`type.ts`, `fonts/`)

- **Display: Amiri**, a classic Naskh in the Bulaq tradition, for names, headings and the clock's numbers.
- **Calligraphy: Aref Ruqaa** (`--font-callig`), for section and page titles, slogans and the footer motto. Display sizes only.
- **Body: IBM Plex Sans Arabic**, a clear, open sans for every paragraph, label, button and form.

Body text is at least 18 px on phones (`step0` is 18 to 20 px) with a line height of 1.85. Headings use 1.45.

All three are self-hosted in `fonts/` under the SIL Open Font License (licences included). `type.ts` imports `fonts/fonts.css`, and `fontsHref` is `data:text/css,`, so the engine's link costs nothing and visitors never contact Google.

The Arabic files of the two display faces are subset with fontTools to the Arabic letters, digits and marks the site writes. The subset keeps the shaping features (joining forms, required ligatures, marks, kerning) and drops the optional ones, which halves their weight: Amiri goes from 109 KB to 54 KB and Ruqaa from 46 KB to 39 KB. The punctuation Arabic text borrows from Latin (`. : « » —` and so on) is copied in from the family's own Latin file, and each `unicode-range` lists exactly what its file holds, so an Arabic title never downloads a Latin file for a full stop. IBM Plex Sans Arabic is served unmodified, because its licence reserves the name "Plex".

On right-to-left pages, `Header.astro` preloads the four faces every page sets above the fold: Ruqaa, Amiri Bold, and Plex Regular and SemiBold. Every page also preloads Plex's Latin file, which holds the footer's © and names. The preloads let titles appear in their own face sooner. They also keep the calligraphic titles from reflowing, because a Ruqaa title can drop from two lines to one when its face arrives.

## Layout (`layout/`)

| Component | Look |
| --- | --- |
| Header | An ivory bar with a double gold hairline: crest, name in Amiri, the menu in large type with a gold underline for the current page, and an emerald call-to-action button with a gold edge. Below 1240 px the menu folds into a large labelled button (52 px). On phones, the call to action moves into the menu. |
| Hero | An emerald band with the star pattern, the title in words, a gold rule and buttons. The first photo stands in a pointed arch whose screens part. Two smaller arched photos flank it, and a soft light drifts across the band. |
| FeatureGrid | Inlaid panels: ivory cards with a gold-capped edge and a small star. Gold light runs along the edge on hover. |
| Stats | Figures set like brass plaques: large Amiri numerals between two gold rules. |
| NewsList | A fine ledger: a gold date, an Amiri title, and a rule between entries. |
| CTA | An invitation in an emerald panel, with a pointed-arch window of gold tracery. |
| Footer | A deep emerald band with faint gold tracery, crowned by a lattice strip. It holds the crest, the name, the motto in Ruqaa, and link, contact and social columns. |
| Prose | A reading page: an Amiri title over a gold rule and a comfortable column of about 62 characters. Lists use gold diamond bullets and Eastern Arabic numbering. Galleries, tables, downloads and forms are styled quietly. |

**Election sections** (`layout/elections/index.ts` exports all 14 in `electionComponents`, and imports `elections.css`):

| Section | Look |
| --- | --- |
| ElectionHero | The crest, the election in a gold-ruled label, the list's name (h1) and its slogan in gold Ruqaa, three buttons, then the whole team standing in a wide gold gateway whose screens part, with a lattice strip below. |
| Countdown | The ornamental clock: a dial ring with star marks, a sweeping light, the title in Ruqaa and four arched cells. The engine's message states (`.is-msg`, `.is-today`, `.is-after`) replace the cells with the message. |
| ProgramFiles | The four files as tall arched niches with a star badge holding the icon. They form two columns on phones. |
| LeaderSpotlight | The leader's portrait in an arch with screens, the words beside it, and the video below in a gold-ringed frame. |
| CandidateGrid | Each candidate in a gold arch, the cut-out photo over a lattice, the number in a medal overlapping the frame, then name, seat and a link. Groups get a ruled heading. |
| InterviewStrip | An emerald band with a row of framed posters and star play marks. |
| BallotCard | The certificate (see above), with WhatsApp sharing, a support link and the PNG download (`data-el-card`). |
| PageBand | An inner page's emerald title band: crest, back link, the title (h1) in Ruqaa, a gold rule and the lead. |
| CandidateHero | The name (h1) in Amiri, the seat, a large medal with the ballot number, and the portrait in an arch whose screens part. |
| MediaFrame, InterviewPlayer | Gold-ringed video frames. The player's chapter list sits in a framed panel with timestamps (`data-el-seek`). |
| PhotoRow, ClipGrid, Panel | Arched photos, clip groups under star titles, and an ivory reading panel. |

The engine's widgets are restyled through their class hooks:

- **Supporters' app** (`.el-sup__*`): an ivory card with a gold top edge, emerald and gold tabs, 54 px fields, and a large emerald button. Its room is held before the script builds it, so nothing jumps.
- **Complaints form** (`.el-form__*`): large choices (52 px), a clear file button, and visible error messages.
- **Videos** (`.el-video`): gold rings, and a star-shaped play mark.

All layout CSS uses logical properties. The one physical side is the play triangle, which points right in every language.

## Motion (`motion/`)

No libraries: CSS animations plus a short script around one IntersectionObserver.

- **Screens** (`[data-ar-screen]`) part when their frame comes into view.
- **Words** (`[data-split-words]`) rise and come into focus one after another, using the engine's `splitWords`. Whole words only.
- **Entrances** (`[data-reveal]`): a gentle rise and fade.
- **Medals** (`[data-ar-medal]`) turn into place, and light passes over each one once, staggered along the row.
- **Ambient loops** (`[data-ar-loop]`): the breathing glow behind the hero, the light through the gateway, the drifting light and the clock's sweep. They run only on capable devices (4+ cores, 4+ GB, no Save-Data), and pause while off screen.

Entrances start as soon as an element's top edge passes the lowest tenth of the screen, whatever its height. Durations are 220, 700 and 1400 ms with a soft ease-out. The screens take about two seconds.

Under `prefers-reduced-motion: reduce`, nothing moves: the screens are not drawn at all, and every word, medal and photo is shown at rest. Without JavaScript, everything is also shown at rest, because the starting states hang off `html.ar-motion`, which the script sets.

## Accessibility

- Contrast is AAA (7:1 or more) for text and emerald on ivory. The Lighthouse contrast audit is clean on every measured page, including the gold labels on the band.
- Tap targets are at least 48 px, and buttons are 52 px.
- Focus shows a 3 px emerald ring with an ivory halo.
- Headings come in order, and ornaments are `aria-hidden`.
- Medals can carry a visually hidden label that screen readers announce before the number ("رقم ٢").

## Measured

Lighthouse 12.8.2, mobile (simulated slow 4G and a 4× CPU slowdown), on the Tanta election content, served compressed:

| Page | Performance | Accessibility | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` (home) | 93 | 100 | 1.2 s | 3.0 s | 0 ms | 0.061 |
| `/team/ashraf-moharam/` (candidate) | 93 | 100 | 1.7 s | 3.1 s | 0 ms | 0.001 |
| `/support/` | 98 | 100 | 1.1 s | 2.4 s | 0 ms | 0.002 |

All 20 election pages were checked at 390 px and 1280 px, and they pass every check:

- No console errors and no horizontal overflow.
- All three faces load.
- The countdown ticks.
- The ballot card downloads as a PNG.
- The supporters' demo flow works: join, confirmation code, dashboard, log out and log back in.
- Sending the complaints form empty shows five messages, and a demo send succeeds.

Sixteen LFIS pages, in Arabic and English, were checked at both widths with no overflow. The only console errors come from the YouTube embeds in the imported news content.

## Engine notes

- A design system cannot add `<link rel="preload">` to the `<head>`. The font preloads sit at the top of the header in `<body>`, where browsers honour them as well. An engine hook for head links would be cleaner.
- The supporters' widget mounts with no height of its own, which pushes the footer down when it appears. Arabesque holds about 44rem for it with `@media (scripting: enabled)`. The engine could hold that room itself.
