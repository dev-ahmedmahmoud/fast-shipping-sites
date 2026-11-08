# Genesis old-site import

Imported 2026-11-08 from https://genesis.edu.eg (WordPress, Salient theme, English only). English keeps the old URLs exactly, at the site root. Arabic is new: every Arabic page is a translation (`translated: true`) under `/ar/<same path>/`, to be proofread by the school before launch.

All 40 pages (20 per language) were checked in Chromium at 390px: page loads, correct `lang`/`dir`, the language switch opens the matching page, no console errors, no horizontal overflow, no broken images. LFIS still builds page-for-page identical after the engine changes.

## Coverage

| Old URL | New URL (English) | Arabic | Content file |
| --- | --- | --- | --- |
| / | / | /ar/ | `content/{en,ar}/home.md` |
| /about-genesis/ | /about-genesis/ | /ar/about-genesis/ | `about.md` |
| /history/ | /history/ | /ar/history/ | `history.md` |
| /drsaeed/ | /drsaeed/ | /ar/drsaeed/ | `drsaeed.md` |
| /schoolboard/ | /schoolboard/ | /ar/schoolboard/ | `schoolboard.md` |
| /accreditations/ | /accreditations/ | /ar/accreditations/ | `accreditations.md` |
| /teaching/ | /teaching/ | /ar/teaching/ | `teaching.md` |
| /facilities/ | /facilities/ | /ar/facilities/ | `facilities.md` |
| /stem/ | /stem/ | /ar/stem/ | `stem.md` |
| /extra-curricular/ | /extra-curricular/ | /ar/extra-curricular/ | `extra-curricular.md` |
| /activities/ | /activities/ (news list) | /ar/activities/ | `activities.md` (`template: news`) |
| /contact/ | /contact/ | /ar/contact/ | `contact.md` |
| /admissions/ | /admissions/ | /ar/admissions/ | `admissions.md` |
| /portal/ | /portal/ | /ar/portal/ | `portal.md` (see below) |
| /privacy-policy/ | /privacy-policy/ | /ar/privacy-policy/ | `privacy-policy.md` (see below) |
| /2023/07/10/genesis-team-wins-all-rising-stars-award/ | same | /ar/2023/07/10/…/ | `news/2023-07-10-genesis-team-wins-all-rising-stars-award.md` |
| /2023/07/10/mangahigh-global-math-week-competition-22/ | same | /ar/2023/07/10/…/ | `news/2023-07-10-mangahigh-global-math-week-competition-22.md` |
| /2023/07/10/occupation-day/ | same | /ar/2023/07/10/…/ | `news/2023-07-10-occupation-day.md` |
| /2023/07/10/genesis-ramadan-iftar-23/ | same | /ar/2023/07/10/…/ | `news/2023-07-10-genesis-ramadan-iftar-23.md` |
| /2023/07/10/the-magical-balloon-kg-annual-show/ | same | /ar/2023/07/10/…/ | `news/2023-07-10-the-magical-balloon-kg-annual-show.md` |
| /faqs/ | 301 → /admissions/ | | placeholder page (see below) |
| /sign-up/ | 301 → /admissions/ | | empty page |
| /category/genesis-news/, /category/american-school/, /category/british-school/, /category/semi-international-school/ | 301 → /activities/ | | category archives |
| /tag/… (21 tags), /author/alaa/ | 301 → /activities/ | | WordPress archives |

The redirects are generated from `oldSlugs` into Cloudflare Pages' `_redirects`.

## What changed from the old site, and why

| Change | Reason |
| --- | --- |
| Apply Now / Enroll Now buttons go to EduSync (`https://genesis.syncology.tech/admission`, Arabic `/ar/admission`) instead of the old LMS registration page (`lms.genesis.edu.eg/en/ApplicantRegister/Register`) | Owner: Genesis moves to EduSync. The tenant is not live yet |
| Links to `localhost/Genesis/…` (a leftover from the theme setup) point to the real pages (`/accreditations/`, `/activities/`, `/facilities/`, `/stem/`) | Broken on the old site |
| "GSCE" → "IGCSE" (home), "IGSCE" → "IGCSE" (history), "Pograms" → "Programs" (extra-curricular title) | Obvious typos |
| The FIRST LEGO League Facebook link lost its tracking parameters | Clean link, same page |
| History: the year/logo layout became a timeline (one heading per year, the milestones as a list) with the logos in one strip | Same facts, readable on phones |
| Admissions: the four requirement cards (animated pictograms) became a numbered list | Same text; the pictograms were decoration |
| Theme decoration left out: the spark mark next to every title, the pictogram strip, the animated pictogram GIFs | Not content |
| Post galleries and photo pairs use the `.gallery` grid; partner and accreditation logos use the new `.logos` grid (shown whole, with names as alt text) | Old sliders and logo walls |
| Home: the Revolution Slider text became the hero; "Life at Genesis" became the feature cards; the old "Recent Events" teaser became the news list; the admissions band became the call to action | Same wording |
| Photos re-encoded on import (at most 1100 px for JPEG at quality 78, PNG at most 1400 px, metadata stripped): 233 files, 55 MB → 38 MB | Repository size; the site resizes again at build time |

Every existing photo was kept as it was on the old site (owner rule), including people. No new stock media was added.

## Not copied (placeholders on the old site)

- **/portal/**: only lorem ipsum text (E-Learning, E-mail Access, Students Handbook, Alumni Login, Brand Guidelines). The new page has a button to the EduSync portal and a `todo`.
- **/faqs/**: only lorem ipsum questions. The URL redirects to Admissions until the school provides real questions.
- **/privacy-policy/**: WordPress's unedited sample policy (blog comments, Gravatar, "localhost/Genesis"). The page exists with a `todo`; the school must provide its policy.

## Engine changes made for Genesis

- A client's default-language home can live at the root (`slug: ""`); `astro.config.mjs` then skips the root redirect.
- News items can have a `slug`, giving them their own page at the old post URL; lists link to it, and the news page no longer repeats such items in full.
- `navGroups` take an optional `nav` position.
- `hreflang="x-default"` and the 404 page follow the client's `defaultLocale`.
- `base.css` styles a `.logos` content block so logos are never cropped.

## Open items

See `todo` in `client.json`: EduSync tenant not live, Arabic proofreading, privacy policy, Portal links, FAQs, and the founding year (History says 1992, other pages say 1990).
