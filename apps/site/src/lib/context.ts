// Everything a section component needs about the current page, so design systems
// never import engine internals or client files directly.
import client from '@client/client.json';
import { alternatesOf, entries, homeOf, resolveHref, type Entry } from './content';
import { DIR, LANGUAGE_NAME, UI, formatDate, formatNumber, formatYear, type Locale, type UiStrings } from './i18n';
import { url } from './links';

export interface NavItem {
  label: string;
  href: string;
  external: boolean;
  current: boolean;
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
    logo: string | null;
  };
  nav: NavItem[];
  footerNav: NavItem[];
  /** Header call to action (usually admissions); null when not configured. */
  cta: { label: string; href: string; external: boolean } | null;
  languages: { locale: Locale; name: string; href: string; current: boolean }[];
  contact: {
    address: string | null;
    phones: string[];
    emails: { label: string; address: string }[];
    mapUrl: string | null;
  };
  social: { network: string; label: string; href: string }[];
  year: string;
  fmt: {
    number: (n: number) => string;
    year: (n: number) => string;
    date: (d: string | Date) => string;
  };
}

type Localized = Partial<Record<Locale, string>>;
const pick = (v: unknown, locale: Locale): string | null => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return (v as Localized)[locale] ?? null;
  return null;
};

export function buildContext(entry: Pick<Entry, 'id' | 'locale'> & Partial<Entry>): PageContext {
  const locale = entry.locale;
  const ui = UI[locale];
  const home = homeOf(locale);

  const navOf = (list: Entry[]): NavItem[] =>
    list.map((e) => ({ label: e.title, href: url(e.slug), external: false, current: e.id === entry.id }));

  const pagesHere = entries.filter((e) => e.kind === 'page' && e.locale === locale);
  const nav = navOf(pagesHere.filter((e) => e.nav !== undefined).sort((a, b) => a.nav! - b.nav!));
  for (const ext of client.navExternal) {
    const target = resolveHref(ext.href, locale);
    const label = pick(ext.label, locale);
    if (target && label) nav.push({ label, ...target, current: false });
  }
  const footerNav = navOf(pagesHere.filter((e) => e.footer));

  const ctaTarget = client.headerCta ? resolveHref(client.headerCta.href, locale) : null;
  const ctaLabel = client.headerCta ? pick(client.headerCta.label, locale) : null;

  const alternates = entry.slug !== undefined ? alternatesOf(entry as Entry) : [];
  const languages = alternates.map((a) => ({ locale: a.locale, name: LANGUAGE_NAME[a.locale], href: a.href, current: a.locale === locale }));

  const emails = Object.entries(client.contact.emails as Record<string, { label: Localized; address: string | null }>)
    .filter(([, v]) => v.address)
    .map(([, v]) => ({ label: pick(v.label, locale) ?? '', address: v.address as string }));

  return {
    locale,
    dir: DIR[locale],
    ui,
    site: {
      name: pick(client.name, locale) ?? '',
      shortName: pick(client.shortName, locale) ?? '',
      motto: pick(client.motto, locale) ?? '',
      homeHref: url(home.slug),
      logo: client.logo,
    },
    nav,
    footerNav,
    cta: ctaTarget && ctaLabel ? { label: ctaLabel, ...ctaTarget } : null,
    languages,
    contact: {
      address: pick(client.contact.address, locale),
      phones: client.contact.phones,
      emails,
      mapUrl: client.contact.mapUrl,
    },
    social: Object.entries(client.social as Record<string, { label: string; href: string | null }>)
      .filter(([, v]) => v.href)
      .map(([network, v]) => ({ network, label: v.label, href: v.href as string })),
    year: formatYear(new Date().getFullYear(), locale),
    fmt: {
      number: (n) => formatNumber(n, locale),
      year: (n) => formatYear(n, locale),
      date: (d) => formatDate(d, locale),
    },
  };
}

