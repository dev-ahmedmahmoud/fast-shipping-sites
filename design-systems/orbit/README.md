# Orbit

Learning as exploration, for school groups whose students run from the early years to Grade 12. The page opens on a dawn sky and sinks into deep space as you scroll: the school sits at the centre of its own small solar system, programmes are planets that line up on one orbit, milestones are constellations, news is a mission log and the call to action is a launch window. Grown-up typography and a calm palette, with playful motion in a few chosen places.

## Parts

- **Palette** (`palette.ts`): a light dawn sky (`bg #F3F7FF`), deep-space `ink #0A1638`, electric blue `accent #0058E6` (close to the Genesis logo) and a warm star amber `highlight #FFB23F`. `ink` doubles as the night sky: any section with the global `.night` class is painted with ink and written on with bg, and opens with a horizon that fades the day into the night. Night colours are derived in `layout/global.css` (`--night-*`), so every palette works. A dark palette is included for mixing with dark-first layouts.
- **Type** (`type.ts`): Alexandria (Arabic and Latin, variable 500–800) for headings, Readex Pro (Arabic and Latin, variable 300–600) for text. Both are self-hosted from `fonts/` (OFL, see `fonts/README.md`); each script's file loads only when the page uses it.
- **Layout** (`layout/`):
  - `Header`: sky-tinted sticky bar, logo inside a thin orbit ring, a planet dot marks the current page, drop-down cards for sub-menus, a night-sky panel as the phone menu.
  - `Hero`: an orrery. The first hero picture (or silent clip, through `@engine/HeroMedia.astro`) is the planet; the next three photos are moons on a tilted elliptical orbit that pass behind and in front of it; a second orbit carries small decorative planets.
  - `FeatureGrid`: planets of different sizes and tones on one dashed orbit line; cloud bands drift and a moon swings round on hover.
  - `Stats` (night): each figure sits inside its own abstract constellation (seeded at build time, never a zodiac sign); lines draw themselves, stars twinkle.
  - `NewsList` (night): a mission log, a trajectory through one glowing node per entry, each with its log number and date. On the news page it opens the page.
  - `CTA` (night): a launch window with a glowing planet, concentric orbits and two satellites.
  - `Footer`: deep space with a wide faint orbit; brings its own horizon when the page above ends on a day section.
  - `Prose`: inner pages fly their title over a band of night sky with turning orbits; the band ends in a planet's curved horizon and the page rises over it as a light card. Shared blocks (home intro, news items) are a planet-marked title and a card. Styles every imported class: `.gallery`, `.students` (round crew badges), `.downloads`, `.actions`, `.embed`, `.note`, `.form`, tables.
- **Motion** (`motion/`): about 2 KB of script, no libraries. Scroll reveals zoom in from a deeper layer; the planet row swings in from a wide arc (`data-reveal="align"`); constellation lines draw (`data-reveal="draw"`); headline words lift into place (whole words only); loops pause off screen (`data-loop`); on capable devices with a fine pointer the hero system drifts toward the pointer. Durations are long and easings soft: things glide rather than bounce.

## How the orbits work

The orbits are plain 2D on purpose. A first version used real CSS 3D (`preserve-3d`); in Chromium its render surfaces showed faint light rectangles behind each orbiting photo. Each orbiter now combines two eased back-and-forth motions a quarter turn apart: one across, sheared to tilt the ellipse, and one up and down that also scales it for depth. It steps behind the planet (`z-index`) for the far half of the turn. Everything runs on the compositor.

With reduced motion nothing moves. Every orbiter rests at its own place on its orbit (static positions computed in `Hero.astro`), and every reveal is shown at rest. Without JavaScript the page is complete; only scroll reveals and pointer drift are lost.

Right-to-left pages mirror the orbits (direction and tilt), the horizon gradients and the reading order.

## Measured

Lighthouse 12.8, mobile preset (simulated slow 4G, 4× CPU), served compressed:

| Page | Performance | Accessibility | LCP | CLS |
| --- | --- | --- | --- | --- |
| Genesis `/` (English home) | 99 | 100 | 1.6 s | 0.001 |
| Genesis `/ar/` | 99 | 100 | 1.8 s | 0.012 |
| LFIS `/en/` (with a hero clip) | 99 | 100 | 1.7 s | 0.001 |
| LFIS `/ar/` (with a hero clip) | 99 | 100 | 2.0 s | 0.007 |
| LFIS `/en/about-us-en/` | 99 | 100 | 2.0 s | 0.034 |
| LFIS `/ar/admission-ar/` | 96 | 100 | 2.5 s | 0.064 |

The small shift on long inner pages is body text re-flowing when Readex Pro arrives (`font-display: swap`).

Checked in Chromium at 390 px and 1280 px, English and Arabic, home, About and Admission for both clients: no horizontal overflow, no console errors, visible focus. Mixed builds pass (Orbit layout with baseline palette and Comic Class motion; baseline layout with Orbit palette, type and motion).

## Previews

`previews/` holds `home-en-desktop.jpg`, `home-ar-desktop.jpg`, `home-en-phone.jpg` and `about-en-desktop.jpg` (Genesis content).
