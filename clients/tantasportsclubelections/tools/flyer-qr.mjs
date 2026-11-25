// The QR code for the campaign's flyers and posters: scan to open the website (https://husseindawoudlist.com).
// Just the code, navy on white like the site: rounded "flowing" modules, near-square corner eyes
// with dark gold centres, and the club's crest in the middle (made at the highest error
// correction, H, so the crest never stops it reading). Keep the white margin round it when placing
// it, print it at least 2.5 cm wide, and always on white (a light code on a dark flyer won't scan).
// Usage: node clients/tantasportsclubelections/tools/flyer-qr.mjs <out-dir>
//   writes qr-code.svg (vector), qr-code.pdf (vector, 10 x 10 cm, for the printer) and
//   qr-code.png (3000 x 3000, 300 dpi up to 25 cm wide).
// Needs Playwright with Chromium. Uses media/crest.webp.
import { createRequire } from 'node:module';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const site = createRequire(path.join(root, 'apps/site/package.json'));
const { chromium } = createRequire(import.meta.url)('playwright');
const qrcode = site('qrcode-generator');
const { default: sharp } = await import(site.resolve('sharp'));

const URL_ = 'https://husseindawoudlist.com';
const out = process.argv[2];
if (!out) { console.error('usage: flyer-qr.mjs <out-dir>'); process.exit(1); }
mkdirSync(out, { recursive: true });

// PNG, not WebP, inside the SVG: print software (Illustrator, CorelDRAW) may not read WebP.
const crestPng = await sharp(path.join(root, 'clients/tantasportsclubelections/media/crest.webp')).resize({ height: 700 }).png().toBuffer();
const crest = `data:image/png;base64,${crestPng.toString('base64')}`;

/** A rounded square as a path, top-left (x, y), side s, corner radius r. */
const rsq = (x, y, s, r) =>
  `M${x + r} ${y}h${s - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${s - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${s - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${s - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;

// Version 4 (33 modules) at level H holds the address with 30% to spare for the crest.
const qr = qrcode(0, 'H');
qr.addData(URL_, 'Byte');
qr.make();
const n = qr.getModuleCount();
const Q = 4;
const w = n + 2 * Q;

/** The code as an SVG on white with the 4-module quiet zone, the crest on a white tile in the middle. */
function qrSvg() {
  let lz = Math.round(n * 0.27);
  if (lz % 2 !== n % 2) lz++;
  const l0 = (n - lz) / 2;
  const eye = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const hole = (x, y) => x >= l0 && x < l0 + lz && y >= l0 && y < l0 + lz;
  const on = (x, y) => x >= 0 && y >= 0 && x < n && y < n && !eye(x, y) && !hole(x, y) && qr.isDark(y, x);
  const r = 0.5;
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!on(x, y)) continue;
      const t = !on(x, y - 1), b = !on(x, y + 1), s = !on(x - 1, y), e = !on(x + 1, y);
      const tl = t && s ? r : 0, tr = t && e ? r : 0, br = b && e ? r : 0, bl = b && s ? r : 0;
      const X = x + Q, Y = y + Q;
      d += `M${X + tl} ${Y}H${X + 1 - tr}${tr ? `a${r} ${r} 0 0 1 ${r} ${r}` : ''}V${Y + 1 - br}${br ? `a${r} ${r} 0 0 1 -${r} ${r}` : ''}`
        + `H${X + bl}${bl ? `a${r} ${r} 0 0 1 -${r} -${r}` : ''}V${Y + tl}${tl ? `a${r} ${r} 0 0 1 ${r} -${r}` : ''}z`;
    }
  }
  let eyes = '', pupils = '';
  for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    // Near-square eyes: strongly rounded ones stopped some readers (OpenCV) finding the code.
    eyes += rsq(x + Q, y + Q, 7, 0.5) + rsq(x + Q + 1, y + Q + 1, 5, 0.001);
    pupils += rsq(x + Q + 2, y + Q + 2, 3, 0.9);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" width="${w * 20}" height="${w * 20}" shape-rendering="geometricPrecision">`
    + '<defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B4479"/><stop offset="1" stop-color="#0D1E3A"/></linearGradient>'
    + '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E672A"/><stop offset="1" stop-color="#5E4216"/></linearGradient></defs>'
    + `<rect width="${w}" height="${w}" fill="#fff"/><path d="${d}" fill="url(#ink)"/>`
    + `<path fill-rule="evenodd" fill="#0D1E3A" d="${eyes}"/><path fill="url(#gold)" d="${pupils}"/>`
    + `<path fill="#fff" d="${rsq(l0 + Q - 0.2, l0 + Q - 0.2, lz + 0.4, 1.6)}"/>`
    + `<image href="${crest}" x="${l0 + Q + 0.6}" y="${l0 + Q + 0.4}" width="${lz - 1.2}" height="${lz - 0.8}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

const svg = qrSvg();
writeFileSync(path.join(out, 'qr-code.svg'), svg);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 750, height: 750 }, deviceScaleFactor: 4 });
await p.setContent(`<!doctype html><style>@page{size:10cm 10cm;margin:0}html,body{margin:0;background:#fff}svg{display:block;width:750px;height:750px}</style>${svg}`);
await p.screenshot({ path: path.join(out, 'qr-code.raw.png') });
await sharp(path.join(out, 'qr-code.raw.png')).withMetadata({ density: 300 }).toFile(path.join(out, 'qr-code.png'));
await p.addStyleTag({ content: 'svg{width:10cm;height:10cm}' });
await p.pdf({ path: path.join(out, 'qr-code.pdf'), width: '10cm', height: '10cm', printBackground: true, pageRanges: '1' });
await b.close();
unlinkSync(path.join(out, 'qr-code.raw.png'));
console.log(`wrote qr-code.svg, qr-code.png (3000 px) and qr-code.pdf in ${out} (${n} modules, level H)`);
