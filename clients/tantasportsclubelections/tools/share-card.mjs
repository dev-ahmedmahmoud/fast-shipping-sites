// The site's link preview (WhatsApp, Facebook…): media/share.jpg, 1200x630.
// Usage: node clients/tantasportsclubelections/tools/share-card.mjs
// Needs Playwright with Chromium. Uses media/team.webp, media/crest.webp and the Cairo font.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const M = path.join(root, 'clients/tantasportsclubelections/media');
const F = path.join(root, 'design-systems/cairo/type-fonts');
const { chromium } = createRequire(import.meta.url)('playwright');
const { default: sharp } = await import(createRequire(path.join(root, 'apps/site/package.json')).resolve('sharp'));

const img = (f) => `data:image/webp;base64,${readFileSync(path.join(M, f)).toString('base64')}`;
const font = (f) => `data:font/woff2;base64,${readFileSync(path.join(F, f)).toString('base64')}`;
const election = JSON.parse(readFileSync(path.join(root, 'clients/tantasportsclubelections/elections.json'), 'utf8')).election;
const [day, date] = (() => {
  // "الجمعة 18 ديسمبر 2026" -> ["الجمعة", "18 ديسمبر"]
  const parts = election.dateText.split(/\s+/);
  return [parts[0], parts.slice(1, 3).join(' ')];
})();

const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
@font-face{font-family:Cairo;font-weight:200 1000;src:url(${font('cairo-arabic.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC,U+200C-200E}
@font-face{font-family:Cairo;font-weight:200 1000;src:url(${font('cairo-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#141B3A}
.card{position:absolute;inset:0;overflow:hidden;font-family:Cairo,sans-serif;color:#F7F6FA;
  background:radial-gradient(90% 120% at 25% 100%,#3d6fd0 0%,#23449A 38%,#1a2f6e 70%,#141B3A 100%)}
/* station hall: roof rays and a faint grid */
.rays{position:absolute;inset:0;background:
  repeating-conic-gradient(from 180deg at 30% 105%, rgba(237,212,39,.10) 0 1deg, transparent 1deg 9deg);
  -webkit-mask:linear-gradient(to bottom,#000,transparent 85%);mask:linear-gradient(to bottom,#000,transparent 85%)}
.grid{position:absolute;inset:0;background:
  repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 64px),
  repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 1px,transparent 1px 64px)}
.glow{position:absolute;left:-60px;bottom:-140px;width:820px;height:520px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(242,213,69,.38),transparent)}
/* the team on a brass platform */
.team{position:absolute;left:-26px;bottom:26px;height:424px}
.ledge{position:absolute;left:0;right:0;bottom:0;height:26px;background:linear-gradient(#F5E06A,#EDD427 45%,#B89B12)}
.ledge::after{content:'';position:absolute;inset:auto 0 26px 0;height:40px;background:linear-gradient(transparent,rgba(10,15,40,.55))}
/* the words */
.txt{position:absolute;right:52px;top:40px;width:420px;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.crest{height:108px;filter:drop-shadow(0 10px 14px rgba(0,0,0,.45));margin-bottom:6px}
.kicker{font-size:24px;font-weight:700;color:#141B3A;background:#EDD427;padding:2px 18px 4px;border-radius:8px}
h1{font-size:72px;line-height:1.08;font-weight:900;letter-spacing:0;text-shadow:0 4px 18px rgba(0,0,0,.35)}
h1 small{display:block;font-size:46px;font-weight:700;color:#DCE4F5}
.slogan{font-size:30px;font-weight:600;color:#F2D545;padding-bottom:6px;border-bottom:3px solid #EDD427}
.cta{margin-top:10px;font-size:28px;font-weight:800;display:flex;align-items:center;gap:12px}
.cta i{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#F7F6FA;color:#23449A;font-style:normal}
/* the date as a brass seal */
.seal{position:absolute;left:262px;top:30px;width:178px;height:178px;border-radius:50%;transform:rotate(-10deg);
  display:grid;place-items:center;text-align:center;color:#141B3A;
  background:radial-gradient(circle at 35% 30%,#FFF3A8,#EDD427 58%,#B89B12);
  box-shadow:0 0 0 6px rgba(20,27,58,.55),0 0 0 9px #EDD427,0 16px 30px rgba(0,0,0,.45)}
.seal b{display:block;font-size:24px;font-weight:800;line-height:1.1}
.seal strong{display:block;font-size:44px;font-weight:900;line-height:1}
.seal span{display:block;font-size:22px;font-weight:700}
</style></head><body><div class="card">
  <div class="rays"></div><div class="grid"></div><div class="glow"></div>
  <img class="team" src="${img('team.webp')}">
  <div class="ledge"></div>
  <div class="seal"><div><b>${day}</b><strong>${date.split(' ')[0]}</strong><span>${date.split(' ').slice(1).join(' ')}</span></div></div>
  <div class="txt">
    <img class="crest" src="${img('crest.webp')}">
    <span class="kicker">انتخابات نادي طنطا الرياضي 2026</span>
    <h1><small>قائمة المهندس</small>حسين داود</h1>
    <p class="slogan">تاريخ نحترمه .. ومستقبل نصنعه</p>
    <p class="cta"><i>✓</i>انتخب القائمة كاملة</p>
  </div>
</div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
const png = await p.screenshot();
await b.close();
await sharp(png).jpeg({ quality: 86, progressive: true, mozjpeg: true }).toFile(path.join(M, 'share.jpg'));
console.log('wrote media/share.jpg');
