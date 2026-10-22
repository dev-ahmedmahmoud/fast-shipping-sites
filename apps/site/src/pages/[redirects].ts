// Emits a Cloudflare Pages `_redirects` file: the site root to the default
// language's home, plus any page that lists `oldSlugs` (URLs it used to have).
// The root also gets a static meta-refresh page from astro.config.mjs, for hosts
// that ignore `_redirects`.
import type { APIRoute } from 'astro';
import client from '@client/client.json';
import { pages, homeOf, type Entry } from '@engine/content';
import { url } from '@engine/links';
import type { Locale } from '@engine/i18n';

function lines(): string[] {
  const out: string[] = [];
  if (!pages.some((e: Entry) => e.slug === '')) out.push(`${url('')} ${homeOf(client.defaultLocale as Locale).href} 301`);
  for (const e of pages) {
    const old = Array.isArray(e.fm.oldSlugs) ? (e.fm.oldSlugs as string[]) : [];
    for (const o of old) out.push(`${url(o)} ${e.href} 301`);
  }
  return out;
}

export function getStaticPaths() {
  if (import.meta.env.FSS_MODE !== 'site') return [];
  return lines().length ? [{ params: { redirects: '_redirects' } }] : [];
}

export const GET: APIRoute = () => new Response(lines().join('\n') + '\n', { headers: { 'Content-Type': 'text/plain' } });
