// The client's images (clients/<slug>/media), as Astro image metadata so design
// systems can render them through astro:assets and get resized, modern formats.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<ImageMetadata>('@client/media/*.{png,jpg,jpeg,webp,avif,svg}', { eager: true, import: 'default' });

const byName = new Map<string, ImageMetadata>(
  Object.entries(files).map(([path, meta]) => [path.split('/').pop()!, meta]),
);

/** An image by file name, e.g. media('PAN01.jpg'); throws on a typo so broken references fail the build. */
export function media(name: string): ImageMetadata {
  const meta = byName.get(name);
  if (!meta) throw new Error(`Image "${name}" not found in clients/<slug>/media`);
  return meta;
}

export function mediaList(names: unknown): ImageMetadata[] {
  return Array.isArray(names) ? names.map((n) => media(String(n))) : [];
}
