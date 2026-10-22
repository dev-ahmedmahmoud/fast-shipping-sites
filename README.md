# fast-shipping-sites

Syncology's engine for bilingual (Arabic/English) client websites: a set of reusable design systems, a per-client content pack, and a preview gallery so each client can pick a look before launch.

Status: engine, a neutral `baseline` system and three client-facing systems (`playground`, `sketchbook`, `comic-class`); LFIS content imported from the old site (`clients/lfis/import-report.md`).

## Requirements

Node 22.12 or later and pnpm 10 (`corepack enable` or `npm i -g pnpm`).

```
pnpm install
```

## Build

```
CLIENT=lfis SYSTEM=baseline pnpm build     # one site → dist/lfis/baseline
CLIENT=lfis pnpm build:gallery             # one client's preview gallery → dist/lfis/gallery
pnpm build:previews                        # every client's gallery → dist/previews (what the shared preview site deploys)
CLIENT=lfis SYSTEM=baseline pnpm dev       # local dev server
```

To mix parts from different systems, set `DS_PALETTE`, `DS_TYPE`, `DS_LAYOUT` or `DS_MOTION`, for example `SYSTEM=aurora DS_PALETTE=mashrabiya`. The output folder is then named `mix-<palette>-<type>-<layout>-<motion>`.

The gallery build writes a comparison page at the root and one full site per sample under `/<sample-id>/`, from the `samples` list in `clients/<slug>/client.json`. Its sample pages carry `noindex`.

`pnpm build:previews` builds every client that has samples into one site, served at `https://websites-preview.syncology.tech/<client>/` (comparison page) and `/<client>/<sample>/` (each sample). The root page names no client, and the whole site sends `noindex` and a disallow-all `robots.txt`. One Cloudflare Pages project builds it on every push (build command `pnpm install --frozen-lockfile && pnpm build:previews`, output `dist/previews`). A new client needs no hosting or DNS work: add `clients/<slug>/` with samples and push. Each client's live site gets its own Pages project at launch, on the client's own domain. `CLIENTS=a,b` limits the build; `PREVIEW_ORIGIN` overrides the domain.

Shared client files that are too big for the repository (such as LFIS's 660 weekly-plan PDFs) live in the R2 bucket served at `https://websites-files.syncology.tech/<client>/`.

Other environment variables: `SHOW_TODO=0` hides the "content waiting to be imported" notes, `SITE_URL` overrides the canonical domain, and `BASE` and `OUT_DIR` are set by the gallery script.

## Layout

- `apps/site/`: the Astro engine (routing, i18n, content loading, page assembly).
- `design-systems/<name>/`: one folder per look. `design-systems/README.md` describes the contract.
- `clients/<slug>/`: `client.json` (names, motto, logo, contacts, EduSync links, portals, footer, samples), `content/{ar,en}/**.md` (one file per page, each declaring its exact old-site URL in `slug`; news items in `content/<locale>/news/`), `media/` (images, optimized at build time), `public/` (files served as they are: video, PDFs), plus research, intake answers and the import report.
- `onboarding/intake.html`: the intake questionnaire, published as a Claude artifact. Answers are saved in `onboarding/answers/` and `clients/<slug>/intake.json`.
- `scripts/build-gallery.mjs`: the gallery build.

## Content rules

- Arabic is the default language and right-to-left; English is left-to-right.
- Each page has a shared `id` (linking its two languages) and its own `slug`. Slugs keep the old site's URLs exactly. If a URL ever changes, list the old one in `oldSlugs` and a Cloudflare Pages `_redirects` file is generated.
- Links in frontmatter use `page:<id>`, `edusync:<key>` (from `client.json`), a root-relative path, or a full URL. In page bodies, write root-relative paths (`/en/about-us-en/`, `/docs/file.pdf`) and `edusync:<key>`; the build adds the gallery base path and resolves EduSync links per language.
- Images in bodies use Markdown syntax with a relative path (`![](../../media/x.jpg)`), so they are resized and served as WebP. Files in `public/` are linked root-relative.
- Menu: `navGroups` in `client.json` gathers pages and portal links under one entry without a page of its own (LFIS: My Account). `nav: <n>` puts a page in the menu; `parent: <id>` puts it in that page's sub-menu; `navLabel` overrides the title in the menu. `footer: true` lists it in the footer. `draft: true` leaves a page out of the build (`SHOW_DRAFTS=1` includes it).
- News items have `id`, `title` and `date` but no `slug`: they appear in full on the locale's news page (`template: news`) and link by anchor.
- `translated: true` marks text translated for the new site where the old site had no version in that language.
- Numbers and dates follow `numerals` and `calendar` in `client.json`. For LFIS that means Arabic-Indic digits and Gregorian dates.
- A page's `todo:` frontmatter lists what is still missing. It shows on the page until you build with `SHOW_TODO=0`.
