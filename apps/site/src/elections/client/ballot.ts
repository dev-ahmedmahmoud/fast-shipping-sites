// "Download the card": the full list's ballot numbers drawn as a PNG image, so members can
// save it or forward it. Drawn from the ballot data (not the page), in the design's own
// colors and display font: a design sets these on its [data-el-ballot] section (any CSS
// color; defaults follow the palette):
//   --el-card-bg, --el-card-bg2   background gradient
//   --el-card-accent, --el-card-accent2   title, group labels, number badges
//   --el-card-ink                 names
// Falls back to printing the page when canvas images are not available.

export interface BallotData {
  title: string;
  text: string;
  groups: { label: string; rows: { number: string; name: string; seat: string }[] }[];
  logo: string | null;
  site: string;
  filename: string;
}

const W = 1080;
const PAD = 72;

function resolveColor(probe: HTMLElement, value: string, fallback: string): string {
  if (!value) return fallback;
  probe.style.color = '';
  probe.style.color = value;
  const c = getComputedStyle(probe).color;
  return c || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > max) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    if (!src) { ok(null); return; }
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

function draw(d: BallotData, logo: HTMLImageElement | null, colors: Record<string, string>, font: string, dir: 'rtl' | 'ltr'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const inner = W - PAD * 2;
  const start = dir === 'rtl' ? W - PAD : PAD;
  const ROW = 112;
  const GAP = 16;
  const logoW = 230;
  const logoH = logo ? Math.round((logoW * logo.naturalHeight) / logo.naturalWidth) : 0;
  ctx.font = `400 34px ${font}`;
  const textLines = wrap(ctx, d.text, inner - 40);
  let h = PAD + (logo ? logoH + 40 : 0) + 80 + textLines.length * 54 + 30;
  for (const g of d.groups) h += 40 + 60 + g.rows.length * (ROW + GAP);
  h += 40 + 60 + PAD;
  canvas.width = W;
  canvas.height = h;
  ctx.direction = dir;

  const bg = ctx.createRadialGradient(dir === 'rtl' ? W : 0, 0, 0, dir === 'rtl' ? W : 0, 0, Math.max(W, h) * 1.1);
  bg.addColorStop(0, colors.bg2);
  bg.addColorStop(0.7, colors.bg);
  bg.addColorStop(1, colors.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, h);

  let y = PAD;
  if (logo) {
    ctx.drawImage(logo, (W - logoW) / 2, y, logoW, logoH);
    y += logoH + 40;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.accent;
  ctx.font = `800 64px ${font}`;
  ctx.fillText(d.title, W / 2, y + 40);
  y += 80;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = colors.ink;
  ctx.font = `400 34px ${font}`;
  for (const line of textLines) { ctx.fillText(line, W / 2, y + 27); y += 54; }
  ctx.globalAlpha = 1;
  y += 30;

  for (const g of d.groups) {
    y += 40;
    ctx.textAlign = dir === 'rtl' ? 'right' : 'left';
    ctx.fillStyle = colors.accent;
    ctx.font = `700 36px ${font}`;
    ctx.fillText(g.label, start, y + 30);
    y += 60;
    for (const r of g.rows) {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = colors.ink;
      round(ctx, PAD, y, inner, ROW, 22);
      ctx.fill();
      ctx.globalAlpha = 1;
      const bx = dir === 'rtl' ? W - PAD - 14 - 84 : PAD + 14;
      const by = y + (ROW - 84) / 2;
      const badge = ctx.createLinearGradient(bx + 84, 0, bx, 0);
      badge.addColorStop(0, colors.accent);
      badge.addColorStop(1, colors.accent2);
      ctx.fillStyle = badge;
      round(ctx, bx, by, 84, 84, 18);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.bg;
      ctx.font = `800 46px ${font}`;
      ctx.fillText(r.number, bx + 42, by + 46);
      const tx = dir === 'rtl' ? bx - 28 : bx + 84 + 28;
      ctx.textAlign = dir === 'rtl' ? 'right' : 'left';
      ctx.fillStyle = colors.ink;
      ctx.font = `700 38px ${font}`;
      ctx.fillText(r.name, tx, y + 40);
      ctx.globalAlpha = 0.75;
      ctx.font = `400 28px ${font}`;
      ctx.fillText(r.seat, tx, y + 82);
      ctx.globalAlpha = 1;
      y += ROW + GAP;
    }
  }
  y += 40;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(W / 2 - 60, y, 120, 4);
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.font = `700 34px ${font}`;
  ctx.fillText(d.site, W / 2, y + 40);
  return canvas;
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

export function initBallotCards(data: BallotData) {
  document.addEventListener('click', async (e) => {
    const btn = (e.target as Element | null)?.closest?.<HTMLButtonElement>('[data-el-card]');
    if (!btn || btn.getAttribute('aria-busy') === 'true') return;
    const section = btn.closest<HTMLElement>('[data-el-ballot]') || document.body;
    const probe = document.createElement('canvas');
    if (!probe.getContext || !probe.toBlob) { window.print(); return; }
    btn.setAttribute('aria-busy', 'true');
    try {
      const style = getComputedStyle(section);
      const holder = document.createElement('span');
      holder.style.display = 'none';
      section.append(holder);
      const root = getComputedStyle(document.documentElement);
      const pick = (name: string, fallbackVar: string, fallback: string) =>
        resolveColor(holder, style.getPropertyValue(name).trim() || root.getPropertyValue(fallbackVar).trim(), fallback);
      const colors = {
        bg: pick('--el-card-bg', '--c-accent', '#0D3725'),
        bg2: pick('--el-card-bg2', '--c-accent', '#145236'),
        accent: pick('--el-card-accent', '--c-highlight', '#E5B971'),
        accent2: pick('--el-card-accent2', '--c-highlight', '#B88D4B'),
        ink: pick('--el-card-ink', '--c-accent-ink', '#FFFFFF'),
      };
      holder.remove();
      const font = (style.getPropertyValue('--font-display').trim() || style.fontFamily || 'sans-serif');
      if (document.fonts) {
        await Promise.all(['400', '700', '800'].map((w) => document.fonts.load(`${w} 40px ${font}`, data.title))).catch(() => undefined);
      }
      const logo = await loadImage(data.logo);
      const canvas = draw(data, logo, colors, font, document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl');
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      if (!blob) throw new Error('no image');
      save(blob, data.filename);
      btn.dataset.done = String(Date.now());
    } catch {
      window.print();
    } finally {
      btn.removeAttribute('aria-busy');
    }
  });
}
