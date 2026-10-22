// Loads the chosen client's pages and news from clients/<slug>/content/<locale>/**.md.
// Each file declares a shared `id` (links the Arabic and English versions) and its
// own `slug`, which is the exact URL path the old site used.
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import client from '@client/client.json';
import { LOCALES, type Locale } from './i18n';
import { isExternal, url } from './links';

interface MdModule {
  frontmatter: Record<string, unknown>;
  Content: AstroComponentFactory;
  file: string;
}

export interface Entry {
  kind: 'page' | 'news';
  id: string;
  locale: Locale;
  slug: string;
  title: string;
  description?: string;
  /** Position in the main navigation; absent means not in the menu. */
  nav?: number;
  /** Listed in the footer's link column. */
  footer?: boolean;
  template: 'home' | 'page' | 'news';
  todo: string[];
  date?: string;
  fm: Record<string, unknown>;
  Content: AstroComponentFactory;
  file: string;
}

export interface Action {
  label: string;
  href: string;
  external: boolean;
}

const modules = import.meta.glob<MdModule>('@client/content/**/*.md', { eager: true });

function load(): Entry[] {
  const out: Entry[] = [];
  const slugs = new Map<string, string>();
  for (const [file, mod] of Object.entries(modules)) {
    const fm = mod.frontmatter;
    const where = file.replace(/^.*\/clients\//, 'clients/');
    for (const key of ['id', 'locale', 'slug', 'title']) {
      if (typeof fm[key] !== 'string') throw new Error(`${where}: frontmatter "${key}" is required`);
    }
    const locale = fm.locale as Locale;
    if (!LOCALES.includes(locale)) throw new Error(`${where}: unknown locale "${locale}"`);
    const slug = (fm.slug as string).replace(/^\/+|\/+$/g, '');
    if (slugs.has(slug)) throw new Error(`${where}: slug "${slug}" already used by ${slugs.get(slug)}`);
    slugs.set(slug, where);
    out.push({
      kind: file.includes('/news/') ? 'news' : 'page',
      id: fm.id as string,
      locale,
      slug,
      title: fm.title as string,
      description: fm.description as string | undefined,
      nav: typeof fm.nav === 'number' ? fm.nav : undefined,
      footer: fm.footer === true,
      template: fm.template === 'home' || fm.template === 'news' ? fm.template : 'page',
      todo: Array.isArray(fm.todo) ? (fm.todo as string[]) : [],
      date: fm.date ? String(fm.date) : undefined,
      fm,
      Content: mod.Content,
      file: where,
    });
  }
  return out;
}

export const entries: Entry[] = load();

export function byId(id: string, locale: Locale): Entry | undefined {
  return entries.find((e) => e.id === id && e.locale === locale);
}

export function homeOf(locale: Locale): Entry {
  const home = entries.find((e) => e.template === 'home' && e.locale === locale);
  if (!home) throw new Error(`No home page (template: home) for locale "${locale}"`);
  return home;
}

export function newsFor(locale: Locale): Entry[] {
  return entries
    .filter((e) => e.kind === 'news' && e.locale === locale)
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}

/** The same page in every locale; a missing translation falls back to that locale's home. */
export function alternatesOf(entry: Entry): { locale: Locale; href: string; exact: boolean }[] {
  return LOCALES.map((locale) => {
    const match = byId(entry.id, locale);
    return { locale, href: url((match ?? homeOf(locale)).slug), exact: !!match };
  });
}

type Edusync = Record<string, string | null> & { fallbacks?: Record<string, string> };

/**
 * Resolves a content link:
 *   page:<id>     a page of this site in the same locale
 *   edusync:<key> a link into the client's EduSync, from client.json (falls back per edusync.fallbacks)
 *   anything else is used as written (https:, mailto:, tel:)
 * Returns null when the target is not configured yet, so the link is left out.
 */
export function resolveHref(href: string, locale: Locale): { href: string; external: boolean } | null {
  if (href.startsWith('page:')) {
    const target = byId(href.slice(5), locale);
    if (!target) throw new Error(`Link "${href}" points to a page that does not exist in "${locale}"`);
    return { href: url(target.slug), external: false };
  }
  if (href.startsWith('edusync:')) {
    const key = href.slice(8);
    const edusync = client.edusync as unknown as Edusync;
    const value = edusync[key];
    if (typeof value === 'string' && value) return { href: value, external: true };
    const fallback = edusync.fallbacks?.[key];
    return fallback ? resolveHref(fallback, locale) : null;
  }
  return { href, external: isExternal(href) };
}

export function resolveAction(a: unknown, locale: Locale): Action | null {
  if (!a || typeof a !== 'object') return null;
  const { label, href } = a as { label?: unknown; href?: unknown };
  if (typeof label !== 'string' || typeof href !== 'string') return null;
  const target = resolveHref(href, locale);
  return target ? { label, ...target } : null;
}
