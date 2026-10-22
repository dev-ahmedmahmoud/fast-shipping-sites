// Emits a Cloudflare Pages `_redirects` file, but only when some page lists
// `oldSlugs` (URLs it used to have). With unchanged URLs, no file is written.
import type { APIRoute } from 'astro';
import { entries } from '@engine/content';
import { url } from '@engine/links';

function lines(): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const old = Array.isArray(e.fm.oldSlugs) ? (e.fm.oldSlugs as string[]) : [];
    for (const o of old) out.push(`/${o.replace(/^\/+|\/+$/g, '')}/ ${url(e.slug)} 301`);
  }
  return out;
}

export function getStaticPaths() {
  if (import.meta.env.FSS_MODE !== 'site') return [];
  return lines().length ? [{ params: { redirects: '_redirects' } }] : [];
}

export const GET: APIRoute = () => new Response(lines().join('\n') + '\n', { headers: { 'Content-Type': 'text/plain' } });
