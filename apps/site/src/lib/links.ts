// Builds site-relative URLs that respect the build's base path (gallery samples live under /<sample>/).
export function url(slug: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const clean = slug.replace(/^\/+|\/+$/g, '');
  return `${base}/${clean ? clean + '/' : ''}`;
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}
