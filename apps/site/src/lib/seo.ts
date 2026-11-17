// Search and sharing metadata built from client.json, so every client gets the same
// structured data without writing any: the site (WebSite), who runs it (an organisation),
// breadcrumbs, and Open Graph defaults. Election clients add their own pieces on top.
//
// Optional client.json "seo" block:
//   orgType        schema.org type for the client: "School", "EducationalOrganization",
//                  "Organization", "SportsOrganization"… Default: School for school clients,
//                  Organization for election lists.
//   country        ISO 3166 country code for the address ("EG", "SA").
//   ogLocale       Open Graph locale per language, e.g. { "ar": "ar_EG", "en": "en_US" }.
//   shareImage     media file used as the share card when a page has none of its own.
//   googleSiteVerification / bingSiteVerification   verification codes, when the owner has them.
import type { ImageMetadata } from 'astro';
import client from '@client/client.json';
import { pick } from './content';
import { media } from './media';
import type { Locale } from './i18n';

export interface Crumb { name: string; href: string }

type Json = Record<string, unknown>;
const seo = ((client as Json).seo ?? {}) as {
  orgType?: string; country?: string; ogLocale?: Record<string, string>; shareImage?: string;
  googleSiteVerification?: string; bingSiteVerification?: string;
};
const isElections = (client as { kind?: string }).kind === 'elections';
const locale = client.defaultLocale as Locale;

export const verification = {
  google: seo.googleSiteVerification || null,
  bing: seo.bingSiteVerification || null,
};

export function ogLocale(l: Locale): string {
  return seo.ogLocale?.[l] ?? (l === 'ar' ? 'ar_AR' : 'en_US');
}

/** The share card for pages without their own: the client's share image, else its logo. */
export function defaultShareImage(): ImageMetadata | null {
  const name = seo.shareImage ?? (client as Json).logo;
  return typeof name === 'string' ? media(name) : null;
}

export function websiteLd(homeUrl: string): Json {
  return {
    '@type': 'WebSite',
    '@id': `${homeUrl}#website`,
    url: homeUrl,
    name: pick(client.name, locale),
    inLanguage: (client as { locales?: string[] }).locales ?? [locale],
    publisher: { '@id': `${homeUrl}#organization` },
  };
}

export function organizationLd(homeUrl: string, abs: (href: string) => string): Json {
  const contact = (client as Json).contact as Json | undefined;
  const address = contact ? pick(contact.address, locale) : null;
  const phones = (contact?.phones as { number: string }[] | undefined) ?? [];
  const emails = Object.values((contact?.emails as Record<string, { address: string | null }>) ?? {})
    .map((e) => e.address).filter(Boolean);
  // A link marked "placeholder" (the page doesn't exist yet) shows on the site but never in search data.
  const social = Object.values(((client as Json).social as Record<string, { href: string | null; placeholder?: boolean }>) ?? {})
    .filter((s) => !s.placeholder).map((s) => s.href).filter(Boolean);
  const logo = typeof (client as Json).logo === 'string' ? media((client as Json).logo as string) : null;
  const org: Json = {
    '@type': seo.orgType ?? (isElections ? 'Organization' : 'School'),
    '@id': `${homeUrl}#organization`,
    name: pick(client.name, locale),
    url: homeUrl,
  };
  const alt = (client as { shortName?: unknown }).shortName ? pick((client as { shortName?: unknown }).shortName, locale) : null;
  if (alt && alt !== org.name) org.alternateName = alt;
  const motto = (client as { motto?: unknown }).motto ? pick((client as { motto?: unknown }).motto, locale) : null;
  if (motto) org.slogan = motto;
  if (logo) org.logo = { '@type': 'ImageObject', url: abs(logo.src), width: logo.width, height: logo.height };
  if (address) org.address = { '@type': 'PostalAddress', streetAddress: address, ...(seo.country ? { addressCountry: seo.country } : {}) };
  if (phones[0]) org.telephone = phones[0].number;
  if (emails[0]) org.email = emails[0];
  if (social.length) org.sameAs = social;
  return org;
}

export function breadcrumbLd(crumbs: Crumb[], abs: (href: string) => string): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

/** One JSON-LD block for the page: a @graph, safe to inline in a <script> tag. */
export function ldJson(graph: Json[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
