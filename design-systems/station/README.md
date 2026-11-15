# Tanta Station (محطة طنطا)

An election design system built around the grand old railway junction of the Nile Delta. The election is a journey, and the list is the train everyone catches together: a split-flap departure board flips the ballot numbers into place, a station clock counts down to election day, the ballot is a punched railway ticket, and section titles hang as enamel platform signs on brass chains. Light falls through the roof glass and steam drifts in the hall.

It was built for `clients/tantasportsclubelections`, a sports-club board election in Tanta, where most voters are over 40. The look is dignified, warm and a little nostalgic, everything is easy to read, and the motion is slow and mechanical, never playful. The colours are station green, ink navy, polished brass and ticket card stock. There is no cream, serif or terracotta.

```
CLIENT=tantasportsclubelections SYSTEM=station pnpm build
CLIENT=lfis SYSTEM=station pnpm build      # a non-election client also builds
```

Previews: `previews/home-desktop.jpg`, `previews/home-phone.jpg`, `previews/candidate-desktop.jpg`, `previews/ballot-desktop.jpg`.

## Palette (`palette.ts`)

| Token | Light | Role |
| --- | --- | --- |
| `bg` | `#F2F1EA` | Ticket card stock |
| `surface` | `#FFFEF9` | Fresh tickets, cards |
| `sunk` | `#E6E4D8` | Worn platform stone |
| `ink` | `#121D18` | Printing ink (15.3:1 on `bg`) |
| `muted` | `#3F4B45` | Secondary text (8.1:1 on `bg`, 7.1:1 on `sunk`) |
| `line` | `#C9C4B2` | Rules, dividers |
| `accent` | `#0D4633` | Station green enamel (9.6:1 on `bg`) |
| `accentInk` | `#FFF9EA` | Lettering on enamel (10.3:1) |
| `accentSoft` | `#DCE6DC` | Pale green wash |
| `highlight` | `#A6782A` | Brass (decorative only; text uses `--st-brass-hi` on night, 6.4:1) |

The scheme is `light`. The `dark` set (a station at night) exists for builds that choose it.

`layout/global.css` derives the station's own variables from the palette, so another palette re-colours the whole station:

- `--st-night` and `--st-night-2`: the night hall (the accent mixed toward ink).
- `--st-brass`, `--st-brass-hi` and `--st-brass-lo`: brass from the highlight, lit and shaded.
- `--st-enamel` and `--st-enamel-ink`: platform-sign enamel.
- `--st-flap` and `--st-flap-ink`: split-flap tiles.
- `--st-shadow` and `--st-tap` (52px, the minimum for controls).

All body text passes AAA (7:1 or more).

## Type (`type.ts`, `type-fonts/`)

- Display: **Reem Kufi**, the geometric Kufi of old Egyptian station and shop signs. It is used for h1 and h2, the big signs, numbers, the countdown title, the slogan, and the site name.
- Body: **Noto Naskh Arabic**, the most readable Arabic text face. It is also used, in bold, for everything small that a Kufi makes harder to read: buttons, the menu, labels, h3 and h4, names, seats, captions, and widget labels.

Both are variable (400–700). They are **self-hosted** in `type-fonts/`, with Arabic and Latin subsets (146 KB in total) and the SIL OFL licence files. `type.ts` imports `type-fonts/fonts.css`, and `fontsHref` is `data:text/css,`, so the engine's font link costs nothing and visitors never contact Google.

`Header.astro` preloads the two subsets the page's language needs, with the base path added for gallery builds. Without that, the hero buttons moved as the font swapped in (a CLS of 0.16, Performance 89). With it, CLS is 0.005.

Sizes are large for readers over 40. Body text is 18–20px (`step0`) and line height is 1.9. The smallest text, `stepMinus1`, is never below 16px.

## Layout (`layout/`)

Shared fittings in `global.css`:

- `.st-sign`: an enamel plate with a brass edge. Add `.st-rivets` for corner rivets.
- `.st-flap`: a split-flap tile.
- `.st-plate`: a brass number disc.
- `.st-glass`: the roof-glass lattice.
- `.btn--primary` (enamel), `.btn--brass` and `.btn--ghost`, each at least 52px tall.

The `.el-sup__*` (supporters' app) and `.el-form__*` (complaints form) widgets are restyled in the same file. The supporters' app gets brass-rimmed tabs, 52px fields, enamel buttons and a brass progress rail. It also keeps its place before it mounts, so the footer doesn't jump.

### Core components

| Component | Look |
| --- | --- |
| Header | The station name board: a brass rail on top, the crest and name, and the menu as platform signs with a brass underline for the current page. On phones and tablets the menu folds into one button. |
| Hero | The hall at night under the roof glass, with a light beam. The first photo or silent clip sits in an arched brass window. |
| FeatureGrid | Cards with an enamel header plate and a brass number disc. |
| Stats | A night departure board. The values flip in on split-flap tiles. |
| NewsList | A timetable: one row per item. |
| CTA | An enamel ticket with punched notches and a dashed stub. |
| Footer | The station facade drawn in SVG: seven lit arches and a clock tower, then the rails, links and contacts. |
| Prose | A night band for the title, h2s as enamel plates, brass list markers, and framed galleries. |

### Election components (`layout/elections/`, all 14)

| Component | Look |
| --- | --- |
| ElectionHero | The great hall: a roof of iron ribs, two light beams and slow steam (capable devices only). The election name hangs on a swinging sign, the slogan is in brass, and the team stands under a brass arch with the crest as its keystone, on a platform edge. |
| Countdown | A station clock (its hands keep Cairo time) beside a board of split-flap tiles that flip whenever a number changes. It keeps every engine hook (`data-el-countdown`, `data-k`, `.is-msg`, `.is-today`, `.is-after`). |
| ProgramFiles | The four files as enamel signs hanging on brass chains. They swing to rest in turn. |
| LeaderSpotlight | A brass medallion portrait, and the video in a riveted brass window. |
| CandidateGrid | Each candidate is a carriage: an arched window with the photo, and the ballot number on a brass plate. The strip variant is a train with couplings that pulls in from the side. |
| InterviewStrip | A night platform with posters in brass frames. |
| BallotCard | A railway ticket with punched holes and a tear line. The list is a departure board: each number runs through its digits before it settles, and each name flips down. The `--el-card-*` variables are set from the station colours, so the downloaded PNG is the ticket too. |
| PageBand | A night band with an arch, the crest, and the page title on a riveted enamel sign. |
| CandidateHero | The candidate under a brass arch, with the seat on an enamel sign and the number on a flap tile. |
| MediaFrame, InterviewPlayer | Riveted brass frames. The chapters are a timetable: the time on a flap tile, then the topic. |
| PhotoRow, ClipGrid | Brass frames with an ivory mat. Captions are on enamel. |
| Panel | A reading column: h2s on enamel plates, with brass diamond markers. |

All layout CSS uses logical properties. Things that travel (the train) arrive from the inline end in either direction.

## Motion (`motion/`)

There are no libraries: one small module and CSS. The motion is weighty and mechanical, like station machinery: tiles flip on a hinge, signs swing on chains, and carriages ease to a stop.

- **Headings** (`[data-split-words]`) rise **word by word**, never letter by letter, so Arabic stays joined.
- **Boards** (`[data-st-flaps]`): tiles flip down one after another. Number tiles (`[data-st-digits]`) run through seven random digits of their own script (Arabic-Indic or Western) before they land on the real number. The real number is in the HTML and is announced once through `.sr-only`; the tiles are `aria-hidden`.
- **Countdown**: each tile flips (perspective `rotateX`) when the engine changes its number, but only while the board is on screen.
- **Station clock** (`[data-st-clock]`): the hands keep the time in `data-zone`. The second hand steps with a small overshoot, and the clock stops ticking off screen.
- **Signs** (`[data-st-swing]`) swing gently to rest. **Trains** (`[data-st-train]`) pull in. **Reveals** (`[data-st-reveal]`) fade up.
- **Steam and light** (`[data-st-ambient]`) run only on capable devices (4 or more cores, 4 GB or more of memory, no Save-Data), and only while their section is in view.

Everything is visible without JavaScript. Under `prefers-reduced-motion: reduce` nothing moves: the clock shows the time once and stays still. There is no sound.

## Measured

Lighthouse 12.2, mobile (simulated slow 4G, 4× CPU slowdown), on the `tantasportsclubelections` build served with compression:

| Page | Performance | Accessibility | Best practices | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` (home) | 97 | 100 | 100 | 1.2 s | 2.6 s | 0 ms | 0.005 |
| `/team/ashraf-moharam/` (candidate) | 97 | 100 | 100 | 1.4 s | 2.4 s | 0 ms | 0.001 |
| `/support/` | 99 | 100 | 100 | 1.2 s | 2.1 s | 0 ms | 0 |

Checked with Playwright at 390px and 1280px:

- **All 20 election pages**: right to left, both fonts loaded, no horizontal overflow, no console errors.
- **Countdown**: the numbers tick and the clock hands are set.
- **Ballot**: the numbers settle to their real values, and "download the card" saves a PNG.
- **Support demo**: the flow reaches the dashboard link.
- **Complaints form**: an empty submit shows 5 errors, and a short membership number shows its own message.

The LFIS client also builds with this system (51 pages).
