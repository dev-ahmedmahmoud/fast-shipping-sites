// Text-free 16:9 video posters, one per candidate: media/<slug>-poster.jpg (1280x720).
// The candidate stands at the inline start (right in Arabic), the crest small at the top of the
// other side, the middle left clear for a play button or a "قريبًا" badge, and the site's own
// caption carrying the words. The photo stands inside the gold arch as in a window: it fills the
// arch's width, stands on its bottom edge and is trimmed to its curve, so no shoulder ever
// crosses the frame (24 Nov: some did when the photo was placed on its own).
// Also media/<slug>-poster-tall.jpg (720x1280), the same design standing up, for vertical videos.
// Usage: node clients/tantasportsclubelections/tools/video-posters.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const M = path.join(root, 'clients/tantasportsclubelections/media');
const { chromium } = createRequire(import.meta.url)('playwright');
const { default: sharp } = await import(createRequire(path.join(root, 'apps/site/package.json')).resolve('sharp'));
const data = JSON.parse(readFileSync(path.join(root, 'clients/tantasportsclubelections/elections.json'), 'utf8'));
const img = (f) => `data:image/webp;base64,${readFileSync(path.join(M, f)).toString('base64')}`;
const crest = img('crest.webp');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (const c of data.candidates) {
  await p.setContent(`<!doctype html><html dir="rtl"><head><style>
  *{margin:0}html,body{width:1280px;height:720px;overflow:hidden;background:#0D1E3A}
  .s{position:absolute;inset:0;overflow:hidden;background:radial-gradient(70% 110% at 78% 100%,#2B5690 0%,#15396A 40%,#10284D 72%,#0B1A33 100%)}
  .rays{position:absolute;inset:0;background:repeating-conic-gradient(from 180deg at 78% 108%,rgba(210,162,76,.12) 0 1deg,transparent 1deg 9deg);
    -webkit-mask:linear-gradient(to bottom,#000,transparent 80%)}
  .grid{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 64px),repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 64px)}
  .glow{position:absolute;right:60px;bottom:-120px;width:640px;height:560px;border-radius:50%;background:radial-gradient(closest-side,rgba(225,185,100,.30),transparent)}
  .arch{position:absolute;right:120px;bottom:0;width:440px;height:600px;border:4px solid rgba(210,162,76,.9);border-bottom:0;border-radius:50% 50% 0 0/34% 34% 0 0;
    overflow:hidden;display:flex;align-items:flex-end;background:radial-gradient(ellipse 60% 55% at 50% 58%,rgba(240,212,147,.16),transparent 72%)}
  .who{display:block;width:100%;height:auto}
  .crest{position:absolute;left:70px;top:56px;height:110px;filter:drop-shadow(0 10px 14px rgba(0,0,0,.45))}
  .ledge{position:absolute;left:0;right:0;bottom:0;height:16px;background:linear-gradient(100deg,#9C7432,#F0D493 30%,#D2A24C 55%,#F3DD9E 78%,#9C7432)}
  </style></head><body><div class="s"><div class="rays"></div><div class="grid"></div><div class="glow"></div><div class="arch"><img class="who" src="${img(c.card)}"></div>
  <img class="crest" src="${crest}"><div class="ledge"></div></div></body></html>`);
  await p.waitForTimeout(150);
  const png = await p.screenshot();
  await sharp(png).jpeg({ quality: 84, progressive: true, mozjpeg: true }).toFile(path.join(M, `${c.slug}-poster.jpg`));
  console.log('wrote', `${c.slug}-poster.jpg`);
}

// The same poster standing up (720x1280), for the vertical interview player on a profile:
// the crest at the top, the candidate inside a tall gold arch, the gold ledge at the foot.
await p.setViewportSize({ width: 720, height: 1280 });
for (const c of data.candidates) {
  await p.setContent(`<!doctype html><html dir="rtl"><head><style>
  *{margin:0}html,body{width:720px;height:1280px;overflow:hidden;background:#0D1E3A}
  .s{position:absolute;inset:0;overflow:hidden;background:radial-gradient(90% 70% at 50% 82%,#2B5690 0%,#15396A 42%,#10284D 72%,#0B1A33 100%)}
  .rays{position:absolute;inset:0;background:repeating-conic-gradient(from 180deg at 50% 108%,rgba(210,162,76,.12) 0 1deg,transparent 1deg 8deg);
    -webkit-mask:linear-gradient(to bottom,#000,transparent 85%)}
  .grid{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 64px),repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 64px)}
  .glow{position:absolute;left:50%;bottom:-160px;width:760px;height:900px;translate:-50% 0;border-radius:50%;background:radial-gradient(closest-side,rgba(225,185,100,.28),transparent)}
  .arch{position:absolute;left:50%;bottom:0;translate:-50% 0;width:600px;height:930px;border:5px solid rgba(210,162,76,.9);border-bottom:0;border-radius:50% 50% 0 0/30% 30% 0 0;
    overflow:hidden;display:flex;align-items:flex-end;background:radial-gradient(ellipse 60% 55% at 50% 60%,rgba(240,212,147,.16),transparent 72%)}
  .who{display:block;width:100%;height:auto}
  .crest{position:absolute;left:50%;top:70px;translate:-50% 0;height:150px;filter:drop-shadow(0 12px 16px rgba(0,0,0,.45))}
  .ledge{position:absolute;left:0;right:0;bottom:0;height:20px;background:linear-gradient(100deg,#9C7432,#F0D493 30%,#D2A24C 55%,#F3DD9E 78%,#9C7432)}
  </style></head><body><div class="s"><div class="rays"></div><div class="grid"></div><div class="glow"></div><div class="arch"><img class="who" src="${img(c.card)}"></div>
  <img class="crest" src="${crest}"><div class="ledge"></div></div></body></html>`);
  await p.waitForTimeout(150);
  const png = await p.screenshot();
  await sharp(png).jpeg({ quality: 84, progressive: true, mozjpeg: true }).toFile(path.join(M, `${c.slug}-poster-tall.jpg`));
  console.log('wrote', `${c.slug}-poster-tall.jpg`);
}
await b.close();
