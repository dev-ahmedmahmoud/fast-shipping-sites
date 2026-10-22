// Everything a section component needs about the current page, so design systems
// never import engine internals or client files directly.
import type { ImageMetadata } from 'astro';
import client from '@client/client.json';
import { alternatesOf, homeOf, pages, pick, resolveHref, type Entry } from './content';
import { DIR, LANGUAGE_NAME, UI, formatDate, formatNumber, formatYear, type Locale, type UiStrings } from './i18n';
import { media } from './media';

export interface NavItem {
  label: string;
  href: string;
  external: boolean;
  current: boolean;
  /** Sub-menu, e.g. Admission ▸ New registration. Empty when the item has none. */
  children: NavItem[];
}

export interface PageContext {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  ui: UiStrings;
  site: {
    name: string;
    shortName: string;
    motto: string;
    homeHref: string;
    /** The logo mark, ready for astro:assets <Image>; null when the client has none yet. */
    logo: ImageMetadata | null;
  };
  /** Main menu, in order, with sub-menus. External items (portal, careers) come last. */
  nav: NavItem[];
  footerNav: NavItem[];
  /** Header call to action (usually admissions); null when not configured. */
  cta: { label: string; href: string; external: boolean } | null;
  languages: { locale: Locale; name: string; href: string; current: boolean }[];
  contact: {
    address: string | null;
    phones: { label: string; number: string }[];
    whatsapp: string[];
    emails: { label: string; address: string }[];
    mapUrl: string | null;
    hours: string | null;
  };
  social: { network: string; label: string; href: string }[];
  /** Footer legal line and optional site credit, as the client wants them. */
  legal: { copyright: string | null; credit: { text: string; href: string | null } | null };
  year: string;
  fmt: {
    number: (n: number) => string;
    year: (n: number) => string;
    date: (d: string | Date) => string;
  };
}

interface Portal { id: string; label: unknown; href: unknown; enabled: boolean }

export function buildContext(entry: Pick<Entry, 'id' | 'locale'> & Partial<Entry>): PageContext {
  const locale = entry.locale;
  const ui = UI[locale];
  const home = homeOf(locale);

  const pagesHere = pages.filter((e) => e.locale === locale);
  const inMenu = pagesHere.filter((e) => e.nav !== undefined).sort((a, b) => a.nav! - b.nav!);
  const item = (e: Entry): NavItem => ({
    label: e.navLabel ?? e.title,
    href: e.href,
    external: false,
    current: e.id === entry.id,
    children: inMenu.filter((c) => c.parent === e.id).map(item),
  });
  const nav = inMenu.filter((e) => !e.parent).map(item);
  // A parent counts as current while one of its children is open.
  for (const n of nav) if (n.children.some((c) => c.current)) n.current = true;

  const external = (label: unknown, href: unknown) => {
    const target = typeof href === 'string' ? resolveHref(href, locale) : (pick(href, locale) ? { href: pick(href, locale)!, external: true } : null);
    const text = pick(label, locale);
    return target && text ? { label: text, ...target, current: false, children: [] } : null;
  };
  for (const ext of client.navExternal) {
    const n = external(ext.label, ext.href);
    if (n) nav.push(n);
  }
  for (const p of (client.portals ?? []) as Portal[]) {
    if (!p.enabled) continue;
    const n = external(p.label, p.href);
    if (n) nav.push(n);
  }

  const footerNav = pagesHere.filter((e) => e.footer).map(item);

  const ctaTarget = client.headerCta ? resolveHref(client.headerCta.href, locale) : null;
  const ctaLabel = client.headerCta ? pick(client.headerCta.label, locale) : null;

  const alternates = entry.slug !== undefined ? alternatesOf(entry as Entry) : [];
  const languages = alternates.map((a) => ({ locale: a.locale, name: LANGUAGE_NAME[a.locale], href: a.href, current: a.locale === locale }));

  const emails = Object.values(client.contact.emails as Record<string, { label: unknown; address: string | null }>)
    .filter((v) => v.address)
    .map((v) => ({ label: pick(v.label, locale) ?? '', address: v.address as string }));
  const phones = (client.contact.phones as { label: unknown; number: string }[]).map((p) => ({ label: pick(p.label, locale) ?? '', number: p.number }));

  const credit = client.footerCredit?.show
    ? { text: pick(client.footerCredit.text, locale) ?? '', href: client.footerCredit.href ?? null }
    : null;

  return {
    locale,
    dir: DIR[locale],
    ui,
    site: {
      name: pick(client.name, locale) ?? '',
      shortName: pick(client.shortName, locale) ?? '',
      motto: pick(client.motto, locale) ?? '',
      homeHref: home.href,
      logo: client.logo ? media(client.logo) : null,
    },
    nav,
    footerNav,
    cta: ctaTarget && ctaLabel ? { label: ctaLabel, ...ctaTarget } : null,
    languages,
    contact: {
      address: pick(client.contact.address, locale),
      phones,
      whatsapp: client.contact.whatsapp ?? [],
      emails,
      mapUrl: client.contact.mapUrl,
      hours: pick(client.contact.hours, locale),
    },
    social: Object.entries(client.social as Record<string, { label: string; href: string | null }>)
      .filter(([, v]) => v.href)
      .map(([network, v]) => ({ network, label: v.label, href: v.href as string })),
    legal: { copyright: pick(client.copyright, locale), credit },
    year: formatYear(new Date().getFullYear(), locale),
    fmt: {
      number: (n) => formatNumber(n, locale),
      year: (n) => formatYear(n, locale),
      date: (d) => formatDate(d, locale),
    },
  };
}
