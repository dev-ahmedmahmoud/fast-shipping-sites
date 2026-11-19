// The complaints and suggestions form ([data-el-complaints]): the source's rules and
// messages, checked here before anything is sent; then one call through the API adapter.
import type { Api } from './api';
import { digits, validComplaintPhone } from './phone';
import { turnstile } from './turnstile';

interface WhatsApp {
  number: string;
  done: string;
  title: string;
  labels: Record<string, string>;
  /** On computers: a QR code the visitor scans with their phone (texts for the dialog). */
  qr?: { title: string; text: string; web: string; long: string; close: string };
  /** The list's crest, small, for the middle of the QR code (Runtime.astro). */
  logo?: string | null;
}

// A computer (a fine pointer that can hover): WhatsApp there is often not installed, so the
// message goes to the visitor's phone through a QR code instead.
const isComputer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * The wa.me link for the QR code: Arabic letters stay as they are (UTF-8 in the code, which phone
 * cameras read as a link), only what would break a link is escaped. This holds about three times
 * more text than a fully escaped link, so ordinary complaints fit in a code a phone reads easily.
 */
function qrLink(number: string, text: string): string {
  const t = text.replace(/[%&#+?=\s<>"'\\^`{|}\[\]]/gu, (c) => encodeURIComponent(c));
  return `https://wa.me/${number}?text=${t}`;
}

interface QrCode { getModuleCount(): number; isDark(row: number, col: number): boolean }

/** Biggest code a phone still reads easily from a screen: 117 modules (version 25) when the crest
 * covers the middle, 133 (version 29) without it. Longer messages get the WhatsApp Web link. */
const QR_MAX_LOGO = 117;
const QR_MAX = 133;

const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5c0 3.5 2.5 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.2-.4-2.6-1.8-3-3l1-1-1-2Z" fill="currentColor"/></svg>';

/** A rounded square as a path, top-left (x, y), side s, corner radius r. */
const rsq = (x: number, y: number, s: number, r: number) =>
  `M${x + r} ${y}h${s - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${s - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${s - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${s - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;

/**
 * The code as an SVG on white, with the 4-module quiet zone the standard asks for. The modules
 * flow into each other with rounded outer corners (a lone module is a dot), the three corner
 * "eyes" are rounded, and the list's crest sits on a white tile in the middle when `logo` is set
 * (the code is then made with more error correction, which reads through the covered part).
 * Colours come from .el-qr__code in elections.css and always stay dark on the white.
 */
function qrSvg(qr: QrCode, logo: string | null): string {
  const n = qr.getModuleCount();
  const Q = 4;
  let lz = logo ? Math.round(n * 0.2) : 0;
  if (lz && lz % 2 !== n % 2) lz++;
  const l0 = (n - lz) / 2;
  const eye = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const hole = (x: number, y: number) => lz > 0 && x >= l0 && x < l0 + lz && y >= l0 && y < l0 + lz;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && !eye(x, y) && !hole(x, y) && qr.isDark(y, x);
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
    eyes += rsq(x + Q, y + Q, 7, 2.2) + rsq(x + Q + 1, y + Q + 1, 5, 1.4);
    pupils += rsq(x + Q + 2, y + Q + 2, 3, 0.9);
  }
  const tile = lz
    ? `<path class="el-qr__tile" d="${rsq(l0 + Q - 0.3, l0 + Q - 0.3, lz + 0.6, 1.4)}"/>`
      + `<image href="${logo}" x="${l0 + Q + 0.7}" y="${l0 + Q + 0.7}" width="${lz - 1.4}" height="${lz - 1.4}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  const w = n + 2 * Q;
  return `<svg viewBox="0 0 ${w} ${w}" aria-hidden="true"><defs><linearGradient id="el-qr-ink" x1="0" y1="0" x2="1" y2="1">`
    + '<stop offset="0" class="el-qr__ink-a"/><stop offset="1" class="el-qr__ink-b"/></linearGradient></defs>'
    + `<rect width="${w}" height="${w}" fill="#fff"/><path d="${d}" fill="url(#el-qr-ink)"/>`
    + `<path class="el-qr__eye" fill-rule="evenodd" d="${eyes}"/><path class="el-qr__pupil" d="${pupils}"/>${tile}</svg>`;
}

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/** The smallest code that holds the link: with the crest while it stays small enough, else plain. */
function makeQr(qrcode: QRCodeFactory, link: string, logo: string | null): { qr: QrCode; logo: string | null } | null {
  // With the crest: Q (25% recovery). M also covers the crest's 5% on paper, but failed to read
  // from a plain (non-retina) screen in tests; Q read every time.
  const tries: [ErrorCorrectionLevel, string | null, number][] = logo ? [['Q', logo, QR_MAX_LOGO], ['L', null, QR_MAX]] : [['L', null, QR_MAX]];
  for (const [ecc, withLogo, max] of tries) {
    try {
      const qr = qrcode(0, ecc);
      qr.addData(link, 'Byte');
      qr.make();
      if (qr.getModuleCount() <= max) return { qr, logo: withLogo };
    } catch {
      // Too long for any QR code at this level.
    }
  }
  return null;
}
async function showQr(wa: WhatsApp, text: string) {
  const q = wa.qr!;
  const web = `https://web.whatsapp.com/send?phone=${wa.number}&text=${encodeURIComponent(text)}`;
  const link = qrLink(wa.number, text);
  const dlg = document.createElement('dialog');
  dlg.className = 'el-qr';
  dlg.setAttribute('aria-labelledby', 'el-qr-title');
  const badge = document.createElement('span'); badge.className = 'el-qr__badge'; badge.innerHTML = WA_ICON;
  const h = document.createElement('h2'); h.id = 'el-qr-title'; h.className = 'el-qr__title'; h.textContent = q.title;
  const p = document.createElement('p'); p.className = 'el-qr__text';
  const a = document.createElement('a'); a.className = 'el-qr__web'; a.href = web; a.target = '_blank'; a.rel = 'noopener';
  a.innerHTML = WA_ICON; a.append(q.web);
  const close = document.createElement('button'); close.type = 'button'; close.className = 'el-qr__close'; close.textContent = q.close;
  close.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  const { default: qrcode } = await import('qrcode-generator');
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const made = makeQr(qrcode, link, wa.logo ?? null);
  if (made) {
    const frame = document.createElement('div'); frame.className = 'el-qr__frame';
    const box = document.createElement('div'); box.className = 'el-qr__code';
    box.setAttribute('role', 'img'); box.setAttribute('aria-label', q.title);
    box.innerHTML = qrSvg(made.qr, made.logo);
    box.dataset.modules = String(made.qr.getModuleCount());
    const scan = document.createElement('span'); scan.className = 'el-qr__scan'; scan.setAttribute('aria-hidden', 'true');
    box.append(scan);
    frame.append(box);
    p.textContent = q.text;
    dlg.append(badge, h, frame, p, a, close);
  } else {
    p.textContent = q.long;
    dlg.append(badge, h, p, a, close);
  }
  document.body.append(dlg);
  dlg.showModal();
}

interface Settings {
  /** Hand the complaint to WhatsApp (no server): open a chat with this number, message ready. */
  whatsapp?: WhatsApp | null;
  fields: Record<string, any>;
  sending: string;
  failed: string;
  success: string;
  demoNote: string;
}

export function mountComplaints(form: HTMLFormElement, api: Api, s: Settings, siteKey: string) {
  const F = s.fields;
  const msg = form.querySelector<HTMLElement>('[data-el-msg]')!;
  const go = form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const label = go.textContent || '';
  const photo = form.querySelector<HTMLInputElement>('input[type=file]');
  const photoName = form.querySelector<HTMLElement>('[data-el-file-name]');
  const ts = turnstile(siteKey);
  const box = form.querySelector<HTMLElement>('[data-el-ts]');
  if (box) ts.mount(box);
  const wa = s.whatsapp ?? null;
  if (api.mode === 'demo' && !wa) form.querySelector<HTMLElement>('[data-el-demo]')?.removeAttribute('hidden');

  const fieldOf = (name: string) => form.querySelector<HTMLElement>(`[name="${name}"]`)?.closest<HTMLElement>('.el-form__field');

  function clear() {
    form.querySelectorAll('.el-form__err').forEach((e) => e.remove());
    form.querySelectorAll('[aria-invalid]').forEach((i) => { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
  }
  function bad(name: string, text: string) {
    const holder = fieldOf(name);
    const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
    if (!holder || !input) return;
    const err = document.createElement('p');
    err.className = 'el-form__err';
    err.id = `el-c-${name}-err`;
    err.setAttribute('role', 'alert');
    err.textContent = text;
    holder.append(err);
    form.querySelectorAll<HTMLElement>(`[name="${name}"]`).forEach((i) => {
      i.setAttribute('aria-invalid', 'true');
      i.setAttribute('aria-describedby', err.id);
    });
  }

  photo?.addEventListener('change', () => {
    const f = photo.files?.[0];
    if (photoName) photoName.textContent = f ? f.name : '';
  });

  function check(): string | null {
    const v = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
    const problems: [string, string][] = [];
    const membership = digits(v('membership'));
    if (!membership) problems.push(['membership', F.membership.required]);
    else if (!/^\d{6}$/.test(membership)) problems.push(['membership', F.membership.digits]);
    const phone = v('phone');
    if (!phone) problems.push(['phone', F.phone.required]);
    else if (!validComplaintPhone(phone)) problems.push(['phone', F.phone.invalid]);
    if (!form.querySelector('input[name=kind]:checked')) problems.push(['kind', F.kind.required]);
    if (!v('topic')) problems.push(['topic', F.topic.required]);
    if (!v('details')) problems.push(['details', F.details.required]);
    const file = photo?.files?.[0];
    if (file) {
      if (!F.photo.types.includes(file.type)) problems.push(['photo', F.photo.badType]);
      else if (file.size > F.photo.maxBytes) problems.push(['photo', F.photo.tooBig]);
    }
    problems.forEach(([n, t]) => bad(n, t));
    return problems[0]?.[0] ?? null;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clear();
    msg.textContent = '';
    msg.className = 'el-form__msg';
    const first = check();
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (wa) {
      // Opened right inside the click, so phones hand it to the WhatsApp app and browsers don't
      // block it as a pop-up. The visitor presses Send in WhatsApp.
      const v = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
      const kind = (form.querySelector<HTMLInputElement>('input[name=kind]:checked')?.value) ?? '';
      const L = wa.labels;
      const lines = [
        `📩 ${kind} — ${wa.title}`,
        '',
        `${L.membership}: ${digits(v('membership'))}`,
        v('full_name') ? `${L.full_name}: ${v('full_name')}` : null,
        `${L.phone}: ${digits(v('phone'))}`,
        `${L.topic}: ${v('topic')}`,
        '',
        `${L.details}:`,
        v('details'),
      ].filter((x): x is string => x !== null);
      const text = lines.join('\n');
      if (wa.qr && isComputer()) {
        void showQr(wa, text);
        return;
      }
      const url = `https://wa.me/${wa.number}?text=${encodeURIComponent(text)}`;
      // No "noopener" flag: with it window.open always returns null, and we need to know whether
      // a pop-up blocker stopped it (then this tab goes to WhatsApp instead).
      const opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
      else window.location.href = url;
      msg.textContent = wa.done;
      msg.className = 'el-form__msg is-good';
      return;
    }
    go.disabled = true;
    go.textContent = s.sending;
    const data = new FormData(form);
    data.set('membership', digits(String(data.get('membership') || '')));
    data.set('phone', digits(String(data.get('phone') || '')));
    if (!photo?.files?.length) data.delete('photo');
    data.set('ts', await ts.token(form));
    const r = await api.complaint(data);
    go.disabled = false;
    go.textContent = label;
    if (r.ok) {
      form.reset();
      if (photoName) photoName.textContent = '';
      msg.textContent = r.message || s.success;
      msg.className = 'el-form__msg is-good';
      ts.reset();
      return;
    }
    ts.reset();
    if (r.field && fieldOf(r.field)) bad(r.field, r.message || s.failed);
    else { msg.textContent = r.message || s.failed; msg.className = 'el-form__msg is-bad'; }
  });
}
