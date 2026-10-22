// Loads the chosen client's pages and news from clients/<slug>/content/<locale>/**.md.
// Each page declares a shared `id` (links the Arabic and English versions) and its
// own `slug`, which is the exact URL path the old site used. News items live under
// content/<locale>/news/ and have no URL of their own: they appear in full on the
// locale's news page (template: news) and are linked by anchor.
import type { ImageMetadata } from 'astro';
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
  /** URL path for pages; for news, the news page's path (the item is an anchor on it). */
  slug: string;
  /** Site-relative link to this entry, base path included. */
  href: string;
  title: string;
  description?: string;
  /** Position in the main navigation (or under `parent`); absent means not in the menu. */
  nav?: number;
  /** Id of the menu item this page sits under. */
  parent?: string;
  /** Menu label when it differs from the page title. */
  navLabel?: string;
  /** Listed in the footer's link column. */
  footer?: boolean;
  template: 'home' | 'page' | 'news';
  todo: string[];
  date?: string;
  fm: Record<string, unknown>;
  Content: AstroComponentFactory;
  file: string;
}

/** A silent hero clip: `src` (MP4) and optional `webm` are files in the client's public/ folder, `poster` its first frame in media/. */
export interface HeroVideo {
  src: string;
  webm?: string;
  poster: ImageMetadata;
}

export interface Action {
  label: string;
  href: string;
  external: boolean;
}

const modules = import.meta.glob<MdModule>('@client/content/**/*.md', { eager: true });
const SHOW_DRAFTS = import.meta.env.FSS_SHOW_DRAFTS;

function load(): Entry[] {
  const out: Entry[] = [];
  const slugs = new Map<string, string>();
  const news: { fm: Record<string, unknown>; mod: MdModule; where: string; locale: Locale }[] = [];

  for (const [file, mod] of Object.entries(modules)) {
    const fm = mod.frontmatter;
    const where = file.replace(/^.*\/clients\//, 'clients/');
    if (fm.draft === true && !SHOW_DRAFTS) continue;
    const isNews = file.includes('/news/');
    for (const key of isNews ? ['id', 'locale', 'title', 'date'] : ['id', 'locale', 'slug', 'title']) {
      if (typeof fm[key] !== 'string') throw new Error(`${where}: frontmatter "${key}" is required`);
    }
    const locale = fm.locale as Locale;
    if (!LOCALES.includes(locale)) throw new Error(`${where}: unknown locale "${locale}"`);
    if (isNews) {
      news.push({ fm, mod, where, locale });
      continue;
    }
    const slug = (fm.slug as string).replace(/^\/+|\/+$/g, '');
    if (slugs.has(slug)) throw new Error(`${where}: slug "${slug}" already used by ${slugs.get(slug)}`);
    slugs.set(slug, where);
    out.push({
      kind: 'page',
      id: fm.id as string,
      locale,
      slug,
      href: url(slug),
      title: fm.title as string,
      description: fm.description as string | undefined,
      nav: typeof fm.nav === 'number' ? fm.nav : undefined,
      parent: typeof fm.parent === 'string' ? fm.parent : undefined,
      navLabel: typeof fm.navLabel === 'string' ? fm.navLabel : undefined,
      footer: fm.footer === true,
      template: fm.template === 'home' || fm.template === 'news' ? fm.template : 'page',
      todo: Array.isArray(fm.todo) ? (fm.todo as string[]) : [],
      fm,
      Content: mod.Content,
      file: where,
    });
  }

  for (const { fm, mod, where, locale } of news) {
    const page = out.find((e) => e.template === 'news' && e.locale === locale);
    if (!page) throw new Error(`${where}: no news page (template: news) for locale "${locale}"`);
    const id = fm.id as string;
    out.push({
      kind: 'news',
      id,
      locale,
      slug: page.slug,
      href: `${page.href}#${id}`,
      title: fm.title as string,
      description: fm.description as string | undefined,
      template: 'news',
      todo: [],
      date: String(fm.date),
      fm,
      Content: mod.Content,
      file: where,
    });
  }
  return out;
}

export const entries: Entry[] = load();

/** Pages only: what gets its own URL. */
export const pages: Entry[] = entries.filter((e) => e.kind === 'page');

export function byId(id: string, locale: Locale): Entry | undefined {
  return pages.find((e) => e.id === id && e.locale === locale);
}

export function homeOf(locale: Locale): Entry {
  const home = pages.find((e) => e.template === 'home' && e.locale === locale);
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
    return { locale, href: (match ?? homeOf(locale)).href, exact: !!match };
  });
}

type Localized = Partial<Record<Locale, string>>;
type EdusyncValue = string | Localized | null;
type Edusync = Record<string, EdusyncValue | Record<string, string> | undefined> & { fallbacks?: Record<string, string> };

/** A client.json value that is either one string or one string per locale. */
export function pick(v: unknown, locale: Locale): string | null {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return (v as Localized)[locale] ?? null;
  return null;
}

/**
 * Resolves a content link:
 *   page:<id>     a page of this site in the same locale
 *   edusync:<key> a link into the client's EduSync, from client.json (falls back per edusync.fallbacks)
 *   anything else is used as written (https:, mailto:, tel:, or a root-relative path)
 * Returns null when the target is not configured yet, so the link is left out.
 */
export function resolveHref(href: string, locale: Locale): { href: string; external: boolean } | null {
  if (href.startsWith('page:')) {
    const target = byId(href.slice(5), locale);
    if (!target) throw new Error(`Link "${href}" points to a page that does not exist in "${locale}"`);
    return { href: target.href, external: false };
  }
  if (href.startsWith('edusync:')) {
    const key = href.slice(8);
    const edusync = client.edusync as unknown as Edusync;
    const value = pick(edusync[key], locale);
    if (value) return { href: value, external: true };
    const fallback = edusync.fallbacks?.[key];
    return fallback ? resolveHref(fallback, locale) : null;
  }
  if (href.startsWith('/') && !href.startsWith('//')) return { href: url(href), external: false };
  return { href, external: isExternal(href) };
}

export function resolveAction(a: unknown, locale: Locale): Action | null {
  if (!a || typeof a !== 'object') return null;
  const { label, href } = a as { label?: unknown; href?: unknown };
  if (typeof label !== 'string' || typeof href !== 'string') return null;
  const target = resolveHref(href, locale);
  return target ? { label, ...target } : null;
}
