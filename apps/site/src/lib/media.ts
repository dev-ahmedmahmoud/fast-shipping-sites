// The client's images (clients/<slug>/media), as Astro image metadata so design
// systems can render them through astro:assets and get resized, modern formats.
import type { ImageMetadata } from 'astro';
import type { HeroVideo } from './content';

const files = import.meta.glob<ImageMetadata>('@client/media/*.{png,jpg,jpeg,webp,avif,svg}', { eager: true, import: 'default' });
// Stock pictures (and hero-clip posters) keep their own folder and are named "stock/<file>".
const stock = import.meta.glob<ImageMetadata>('@client/media/stock/*.{png,jpg,jpeg,webp,avif}', { eager: true, import: 'default' });

const byName = new Map<string, ImageMetadata>([
  ...Object.entries(files).map(([path, meta]) => [path.split('/').pop()!, meta] as const),
  ...Object.entries(stock).map(([path, meta]) => [`stock/${path.split('/').pop()!}`, meta] as const),
]);

/** An image by file name, e.g. media('PAN01.jpg') or media('stock/x.jpg'); throws on a typo so broken references fail the build. */
export function media(name: string): ImageMetadata {
  const meta = byName.get(name);
  if (!meta) throw new Error(`Image "${name}" not found in clients/<slug>/media`);
  return meta;
}

export function mediaList(names: unknown): ImageMetadata[] {
  return Array.isArray(names) ? names.map((n) => media(String(n))) : [];
}

/**
 * The hero clip for this build: the sample's choice (FSS_HERO_VIDEO, set by the gallery
 * build from client.json samples[].heroVideo) or the page's own `hero.video`, both keys
 * into client.json "heroVideos". Null when neither names one.
 */
export function heroVideo(pageKey: unknown, videos: Record<string, { src: string; webm?: string; poster: string }> | undefined): HeroVideo | null {
  const key = import.meta.env.FSS_HERO_VIDEO || (typeof pageKey === 'string' ? pageKey : '');
  if (!key) return null;
  const v = videos?.[key];
  if (!v) throw new Error(`Hero video "${key}" not found in client.json "heroVideos"`);
  return { src: v.src, webm: v.webm, poster: media(v.poster) };
}
