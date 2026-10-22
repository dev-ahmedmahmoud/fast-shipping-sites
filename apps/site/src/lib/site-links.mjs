// Sätteri hast plugin for client Markdown bodies. Content authors write links the way
// the old site had them; this makes them work in every build:
//   /en/about-us-en/      root-relative paths get the build's base path (gallery samples live under /<sample>/)
//   edusync:admission     resolves from client.json "edusync", per the file's locale (content/<locale>/...)
//   https://…             opens in a new tab
// Needs `features.rawHtml` so links inside raw HTML blocks are elements too.
import { fileURLToPath } from 'node:url';

const ATTRS = { a: ['href'], img: ['src'], video: ['src', 'poster'], source: ['src'], iframe: ['src'] };

export function siteLinks({ base = '/', edusync = {} } = {}) {
  const prefix = base.replace(/\/+$/, '');
  const localized = (v, locale) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v[locale] ?? null : null);

  return {
    name: 'fss-site-links',
    element: {
      filter: Object.keys(ATTRS),
      visit(node, ctx) {
      const where = ctx.fileURL ? fileURLToPath(ctx.fileURL) : '';
      const locale = (where.match(/\/content\/([a-z]{2})\//) || [])[1] || 'en';
      for (const attr of ATTRS[node.tagName] ?? []) {
        const value = node.properties?.[attr];
        if (typeof value !== 'string') continue;

        let next = value;
        if (value.startsWith('edusync:')) {
          next = localized(edusync[value.slice(8)], locale) || '#';
        } else if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/_astro/')
                   && !(prefix && (value === prefix || value.startsWith(prefix + '/')))) {
          next = prefix + value;
        }
        if (next !== value) ctx.setProperty(node, attr, next);
        if (node.tagName === 'a' && /^https?:\/\//.test(next)) {
          ctx.setProperty(node, 'target', '_blank');
          ctx.setProperty(node, 'rel', ['noopener']);
        }
      }
      },
    },
  };
}
