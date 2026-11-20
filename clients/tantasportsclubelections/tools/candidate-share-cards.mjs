// Each candidate's link preview (WhatsApp, Facebook…): media/<shareImage>, 1200x630, named by
// the candidate's "shareImage" in elections.json. Navy and gold (the client's agent's design,
// Nov 2026): the candidate's card photo on the right, standing on a gold ribbon; on the left the
// club's crest, the list's name, the candidate's name over a gold rule, the seat on a gold pill
// and the election's name; the club's gate pale behind.
// Usage: node clients/tantasportsclubelections/tools/candidate-share-cards.mjs [slug ...]
// Needs Playwright with Chromium. Uses media/<card>, media/crest.webp, media/club-gate.webp and
// the Cairo font.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const M = path.join(root, 'clients/tantasportsclubelections/media');
const F = path.join(root, 'design-systems/cairo/type-fonts');
const { chromium } = createRequire(import.meta.url)('playwright');
const { default: sharp } = await import(createRequire(path.join(root, 'apps/site/package.json')).resolve('sharp'));

const data = JSON.parse(readFileSync(path.join(root, 'clients/tantasportsclubelections/elections.json'), 'utf8'));
const only = process.argv.slice(2);
const people = data.candidates.filter((c) => c.shareImage && (!only.length || only.includes(c.slug)));
const img = (f) => `data:image/webp;base64,${readFileSync(path.join(M, f)).toString('base64')}`;
const font = (f) => `data:font/woff2;base64,${readFileSync(path.join(F, f)).toString('base64')}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const gate = existsSync(path.join(M, 'club-gate.webp')) ? img('club-gate.webp') : null;
const crest = img('crest.webp');
const listName = data.list?.name ?? '';
const election = data.home?.hero?.sub ?? '';

const page = (c) => `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
@font-face{font-family:Cairo;font-weight:200 1000;src:url(${font('cairo-arabic.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC,U+200C-200E}
@font-face{font-family:Cairo;font-weight:200 1000;src:url(${font('cairo-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#0D1E3A}
.card{position:absolute;inset:0;overflow:hidden;font-family:Cairo,sans-serif;color:#fff;
  background:radial-gradient(80% 110% at 78% 30%,#2B5690 0%,#15396A 42%,#10284D 72%,#0B1A33 100%)}
.gate{position:absolute;left:-60px;top:40px;width:640px;height:360px;object-fit:cover;filter:grayscale(1) brightness(1.1);mix-blend-mode:screen;opacity:.26;
  -webkit-mask-image:linear-gradient(to right,#000 40%,transparent 95%),linear-gradient(to bottom,transparent 0,#000 25%,#000 60%,transparent 100%);-webkit-mask-composite:source-in}
.rays{position:absolute;inset:0;background:repeating-conic-gradient(from 180deg at 80% -10%, rgba(210,162,76,.10) 0 1deg, transparent 1deg 10deg);
  -webkit-mask:linear-gradient(to bottom,#000,transparent 80%)}
.glow{position:absolute;right:40px;top:60px;width:560px;height:560px;border-radius:50%;background:radial-gradient(closest-side,rgba(225,185,100,.30),transparent)}
.photo{position:absolute;right:50px;bottom:22px;height:590px;width:auto}
.ribbon{position:absolute;left:0;right:0;bottom:0;height:22px;background:linear-gradient(100deg,#9C7432,#F0D493 30%,#D2A24C 55%,#F3DD9E 78%,#9C7432)}
.ribbon::before{content:'';position:absolute;left:0;right:0;bottom:22px;height:60px;background:linear-gradient(transparent,rgba(8,18,38,.55))}
.txt{position:absolute;right:560px;left:60px;top:0;bottom:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center}
.crest{height:100px;filter:drop-shadow(0 10px 14px rgba(0,0,0,.45))}
.list{font-size:28px;font-weight:700;color:#E8DCC2}
h1{font-size:64px;line-height:1.15;font-weight:900;text-shadow:0 4px 18px rgba(0,0,0,.35)}
.rule{width:240px;height:3px;background:linear-gradient(90deg,transparent,#D2A24C 25%,#F3DD9E 50%,#D2A24C 75%,transparent)}
.seat{font-size:30px;font-weight:800;color:#0D1E3A;padding:6px 30px 9px;border-radius:999px;
  background:linear-gradient(100deg,#B98A3C,#F1D58F 35%,#D9AE5C 60%,#F3DD9E 80%,#B98A3C);box-shadow:0 10px 22px -10px rgba(0,0,0,.6)}
.election{font-size:24px;font-weight:600;color:#D9E0EC}
</style></head><body><div class="card">
  ${gate ? `<img class="gate" src="${gate}">` : ''}
  <div class="rays"></div><div class="glow"></div>
  <img class="photo" src="${img(c.card || c.photo)}">
  <div class="ribbon"></div>
  <div class="txt">
    <img class="crest" src="${crest}">
    <p class="list">${esc(listName)}</p>
    <h1>${esc(c.name)}</h1>
    <span class="rule"></span>
    <p class="seat">${esc(c.seat)}</p>
    <p class="election">${esc(election)}</p>
  </div>
</div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of people) {
  await p.setContent(page(c));
  await p.evaluate(() => document.fonts.ready);
  // Long names: shrink the name until it fits on two lines.
  await p.evaluate(() => {
    const h = document.querySelector('h1');
    let s = 64;
    while (h.scrollHeight > s * 1.15 * 2 + 4 && s > 40) { s -= 2; h.style.fontSize = `${s}px`; }
  });
  await p.waitForTimeout(150);
  const png = await p.screenshot();
  await sharp(png).jpeg({ quality: 84, progressive: true, mozjpeg: true }).toFile(path.join(M, c.shareImage));
  console.log('wrote media/' + c.shareImage);
}
await b.close();
