// Search-engine and browser files for a site build: sitemap.xml (every page, with its
// other-language twins), robots.txt (closed for previews, open with the sitemap on the
// live site) and site.webmanifest (name, colours and icon). Gallery-index builds get none.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import client from '@client/client.json';
import { palette } from '@palette';
import { pages, pick, byId, homeOf } from '@engine/content';
import { url } from '@engine/links';
import type { Locale } from '@engine/i18n';

const FILES = ['sitemap.xml', 'robots.txt', 'site.webmanifest'] as const;
type File = (typeof FILES)[number];

export function getStaticPaths() {
  if (import.meta.env.FSS_MODE !== 'site') return [];
  return FILES.map((seo) => ({ params: { seo } }));
}

const locales = ((client as { locales?: string[] }).locales ?? ['ar', 'en']) as Locale[];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function sitemap(abs: (href: string) => string): string {
  const rows = pages
    .filter((e) => !(e.fm as { noindex?: boolean }).noindex)
    .map((e) => {
      const twins = locales.length > 1
        ? locales.map((l) => byId(e.id, l)).filter(Boolean).map((t) =>
            `<xhtml:link rel="alternate" hreflang="${t!.locale}" href="${esc(abs(t!.href))}"/>`)
        : [];
      if (twins.length > 1) {
        const def = byId(e.id, client.defaultLocale as Locale) ?? homeOf(client.defaultLocale as Locale);
        twins.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(def.href))}"/>`);
      }
      return `<url><loc>${esc(abs(e.href))}</loc>${twins.length > 1 ? twins.join('') : ''}</url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

function robots(abs: (href: string) => string): string {
  if (import.meta.env.FSS_NOINDEX) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${abs(url('sitemap.xml'))}\n`;
}

function pngSize(file: string): { w: number; h: number } | null {
  try {
    const b = readFileSync(file);
    return b.toString('ascii', 12, 16) === 'IHDR' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
  } catch { return null; }
}

function manifest(): string {
  const loc = client.defaultLocale as Locale;
  const colors = palette.scheme === 'dark' ? palette.dark : palette.light;
  const icon = (client as { favicon?: string }).favicon;
  const size = icon ? pngSize(path.join(import.meta.env.FSS_PUBLIC_DIR, icon)) : null;
  return JSON.stringify({
    name: pick(client.name, loc),
    short_name: pick((client as { shortName?: unknown }).shortName ?? client.name, loc),
    lang: loc,
    dir: loc === 'ar' ? 'rtl' : 'ltr',
    start_url: homeOf(loc).href,
    scope: url(''),
    display: 'browser',
    background_color: colors.bg,
    theme_color: colors.accent,
    icons: icon ? [{ src: url(icon), type: 'image/png', ...(size ? { sizes: `${size.w}x${size.h}` } : {}) }] : [],
  }, null, 2);
}

const TYPES: Record<File, string> = {
  'sitemap.xml': 'application/xml; charset=utf-8',
  'robots.txt': 'text/plain; charset=utf-8',
  'site.webmanifest': 'application/manifest+json; charset=utf-8',
};

export const GET: APIRoute = ({ params, site }) => {
  const file = params.seo as File;
  const abs = (href: string) => new URL(href, site ?? 'https://example.com').href;
  const body = file === 'sitemap.xml' ? sitemap(abs) : file === 'robots.txt' ? robots(abs) : manifest();
  return new Response(body, { headers: { 'Content-Type': TYPES[file] } });
};
