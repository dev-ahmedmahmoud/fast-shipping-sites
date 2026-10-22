// Builds a client's preview gallery: the comparison page at the root and one
// full site per sample under /<sample-id>/. Output: dist/<client>/gallery
//   CLIENT=lfis pnpm build:gallery
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const CLIENT = process.env.CLIENT || 'lfis';
const client = JSON.parse(readFileSync(path.join(root, 'clients', CLIENT, 'client.json'), 'utf8'));
const out = path.join('dist', CLIENT, 'gallery');
const siteUrl = `https://${client.domains.preview}`;

function astroBuild(label, env) {
  console.log(`\n▸ ${label}`);
  const r = spawnSync('pnpm', ['--filter', 'site', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CLIENT, SITE_URL: siteUrl, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

rmSync(path.join(root, out), { recursive: true, force: true });

// The index first: an Astro build empties its own output folder.
astroBuild('comparison page', { FSS_MODE: 'gallery-index', OUT_DIR: out });

for (const s of client.samples) {
  astroBuild(`sample ${s.id}`, {
    FSS_MODE: 'site',
    SAMPLE_ID: s.id,
    SYSTEM: s.layout,
    DS_PALETTE: s.palette,
    DS_TYPE: s.type,
    DS_LAYOUT: s.layout,
    DS_MOTION: s.motion,
    BASE: `/${s.id}`,
    OUT_DIR: path.join(out, s.id),
    // Previews stay out of search results.
    NOINDEX: '1',
  });
}

console.log(`\nGallery ready: ${out} (${client.samples.length} sample${client.samples.length === 1 ? '' : 's'})`);
