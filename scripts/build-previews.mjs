// Builds the shared preview site for every client: <origin>/<client>/ is that client's
// comparison page, <origin>/<client>/<sample>/ each full sample. One Cloudflare Pages
// project serves it, so a new client needs no new hosting or DNS.
//   pnpm build:previews                  → dist/previews (all clients with samples)
//   CLIENTS=lfis pnpm build:previews     → only the listed clients
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'dist', 'previews');
const origin = process.env.PREVIEW_ORIGIN || 'https://websites-preview.syncology.tech';
const only = (process.env.CLIENTS || '').split(',').map((c) => c.trim()).filter(Boolean);

const clients = readdirSync(path.join(root, 'clients'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(root, 'clients', d.name, 'client.json')))
  .map((d) => d.name)
  .filter((c) => !only.length || only.includes(c))
  .filter((c) => JSON.parse(readFileSync(path.join(root, 'clients', c, 'client.json'), 'utf8')).samples?.length);

if (!clients.length) {
  console.error('No client with samples to build.');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
for (const c of clients) {
  console.log(`\n■ client ${c}`);
  const r = spawnSync('node', ['scripts/build-gallery.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CLIENT: c, GALLERY_BASE: `/${c}`, GALLERY_OUT: path.join('dist', 'previews', c), PREVIEW_ORIGIN: origin },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// The root names no client: each client only gets their own link.
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Website previews · Syncology</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f4f6f8;color:#1b2430}main{padding:24px;text-align:center}</style>
</head><body><main><h1>Website previews</h1><p>Open the link Syncology sent you.</p></main></body></html>
`);
// Previews stay out of search engines, whatever a page says.
writeFileSync(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

console.log(`\nPreviews ready: dist/previews (${clients.map((c) => `/${c}/`).join(', ')})`);
