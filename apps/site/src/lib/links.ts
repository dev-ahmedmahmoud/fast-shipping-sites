// Builds site-relative URLs that respect the build's base path (gallery samples live under /<sample>/).
export function url(slug: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const [path, hash] = slug.split('#');
  const clean = path.replace(/^\/+|\/+$/g, '');
  // Files (a last segment with an extension) keep no trailing slash; pages always get one.
  const isFile = /\.[a-z0-9]{2,5}$/i.test(clean);
  const out = `${base}/${clean ? clean + (isFile ? '' : '/') : ''}`;
  return hash ? `${out}#${hash}` : out;
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}
