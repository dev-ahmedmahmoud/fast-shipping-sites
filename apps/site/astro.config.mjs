// One Astro build = one client rendered with one design-system combination.
// The combination is chosen by environment variables and wired in through
// Vite aliases, so only the chosen parts enter the bundle.
import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = process.env;

const CLIENT = env.CLIENT || 'lfis';
const SYSTEM = env.SYSTEM || 'baseline';
const parts = {
  palette: env.DS_PALETTE || SYSTEM,
  type: env.DS_TYPE || SYSTEM,
  layout: env.DS_LAYOUT || SYSTEM,
  motion: env.DS_MOTION || SYSTEM,
};

const clientDir = path.join(root, 'clients', CLIENT);
if (!existsSync(path.join(clientDir, 'client.json'))) {
  throw new Error(`Unknown client "${CLIENT}": clients/${CLIENT}/client.json not found`);
}
for (const [part, system] of Object.entries(parts)) {
  if (!existsSync(path.join(root, 'design-systems', system))) {
    throw new Error(`Unknown design system "${system}" for ${part} (design-systems/${system} not found)`);
  }
}

const client = JSON.parse(readFileSync(path.join(clientDir, 'client.json'), 'utf8'));
const used = [...new Set(Object.values(parts))];
const sampleId = env.SAMPLE_ID || (used.length === 1 ? used[0] : `mix-${parts.palette}-${parts.type}-${parts.layout}-${parts.motion}`);
const ds = (system, file) => path.join(root, 'design-systems', system, file);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  site: env.SITE_URL || `https://${client.domains.production}`,
  base: env.BASE || '/',
  outDir: env.OUT_DIR ? path.resolve(root, env.OUT_DIR) : path.join(root, 'dist', CLIENT, sampleId),
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    {
      name: 'fss-gallery-index',
      hooks: {
        'astro:config:setup': ({ injectRoute }) => {
          if (env.FSS_MODE === 'gallery-index') {
            injectRoute({ pattern: '/', entrypoint: fileURLToPath(new URL('./src/gallery/Index.astro', import.meta.url)) });
          }
        },
      },
    },
  ],
  vite: {
    define: {
      'import.meta.env.FSS_CLIENT': JSON.stringify(CLIENT),
      'import.meta.env.FSS_SAMPLE': JSON.stringify(sampleId),
      'import.meta.env.FSS_PARTS': JSON.stringify(parts),
      'import.meta.env.FSS_MODE': JSON.stringify(env.FSS_MODE || 'site'),
      'import.meta.env.FSS_SHOW_TODO': JSON.stringify(env.SHOW_TODO !== '0'),
      'import.meta.env.FSS_NOINDEX': JSON.stringify(env.NOINDEX === '1'),
    },
    resolve: {
      alias: {
        '@engine': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@client': clientDir,
        '@systems': path.join(root, 'design-systems'),
        '@palette': ds(parts.palette, 'palette.ts'),
        '@type': ds(parts.type, 'type.ts'),
        '@layout': ds(parts.layout, 'layout'),
        '@motion': ds(parts.motion, 'motion'),
      },
    },
    server: { fs: { allow: [root] } },
  },
});
