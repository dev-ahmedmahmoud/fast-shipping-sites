# fast-shipping-sites

Syncology's engine for bilingual (Arabic/English) client websites: a set of reusable design systems, a per-client content pack, and a preview gallery so each client can pick a look before launch.

Status: engine skeleton with one neutral `baseline` design system. The four client-facing systems come next.

## Requirements

Node 22.12 or later and pnpm 10 (`corepack enable` or `npm i -g pnpm`).

```
pnpm install
```

## Build

```
CLIENT=lfis SYSTEM=baseline pnpm build     # one site → dist/lfis/baseline
CLIENT=lfis pnpm build:gallery             # preview gallery → dist/lfis/gallery
CLIENT=lfis SYSTEM=baseline pnpm dev       # local dev server
```

To mix parts from different systems, set `DS_PALETTE`, `DS_TYPE`, `DS_LAYOUT` or `DS_MOTION`, for example `SYSTEM=aurora DS_PALETTE=mashrabiya`. The output folder is then named `mix-<palette>-<type>-<layout>-<motion>`.

The gallery build writes a comparison page at the root and one full site per sample under `/<sample-id>/`, from the `samples` list in `clients/<slug>/client.json`. It is meant for `<client>-preview.syncology.tech`, and its sample pages carry `noindex`.

Other environment variables: `SHOW_TODO=0` hides the "content waiting to be imported" notes, `SITE_URL` overrides the canonical domain, and `BASE` and `OUT_DIR` are set by the gallery script.

## Layout

- `apps/site/`: the Astro engine (routing, i18n, content loading, page assembly).
- `design-systems/<name>/`: one folder per look. `design-systems/README.md` describes the contract.
- `clients/<slug>/`: `client.json` (names, motto, contacts, EduSync links, samples) and `content/{ar,en}/*.md` (one file per page, each declaring its exact old-site URL in `slug`), plus research and intake answers.
- `onboarding/intake.html`: the intake questionnaire, published as a Claude artifact. Answers are saved in `onboarding/answers/` and `clients/<slug>/intake.json`.
- `scripts/build-gallery.mjs`: the gallery build.

## Content rules

- Arabic is the default language and right-to-left; English is left-to-right.
- Each page has a shared `id` (linking its two languages) and its own `slug`. Slugs keep the old site's URLs exactly. If a URL ever changes, list the old one in `oldSlugs` and a Cloudflare Pages `_redirects` file is generated.
- Links in content use `page:<id>`, `edusync:<key>` (from `client.json`), or a full URL.
- Numbers and dates follow `numerals` and `calendar` in `client.json`. For LFIS that means Arabic-Indic digits and Gregorian dates.
- A page's `todo:` frontmatter lists what is still missing. It shows on the page until you build with `SHOW_TODO=0`.
