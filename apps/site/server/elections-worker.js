// The election site's small server, for Cloudflare Pages (advanced mode: the build copies this
// file to the output as _worker.js, with a _routes.json that sends only /api/* here, so every
// page and file is still served straight from the static assets).
//
// POST /api/complaints  (multipart/form-data, fields in clients/<slug>/API.md → Complaints)
//   Checks the form again, optionally verifies Cloudflare Turnstile, then sends the complaint
//   to the campaign team's WhatsApp through the WhatsApp Cloud API as an approved template
//   message (with the photo as the template's image header when there is one).
//
// Settings (Cloudflare Pages → project → Settings → Variables and secrets):
//   WA_TOKEN            secret: permanent access token (System User, whatsapp_business_messaging)
//   WA_PHONE_ID         the sender's phone number ID (WhatsApp Manager → API setup)
//   WA_TO               who receives complaints: international numbers, comma-separated (201xxxxxxxxx)
//   WA_TEMPLATE         template without photo (default tanta_complaint)
//   WA_TEMPLATE_PHOTO   template with an IMAGE header (default tanta_complaint_photo)
//   WA_LANG             template language code (default ar)
//   WA_GRAPH            Graph API version (default v23.0)
//   TURNSTILE_SECRET    secret, optional: when set, the form's Turnstile token must verify
// Every answer is JSON with HTTP 200: { ok: true } or { ok: false, field?, message }.

const KINDS = ['شكوى', 'مقترح'];
const TOPICS = ['الأنشطة الرياضية', 'الخدمات والمرافق', 'الأنشطة الاجتماعية', 'الشؤون المالية والإدارية', 'أخرى'];
const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const PHOTO_MAX = 10 * 1024 * 1024;

const MSG = {
  membership: 'رقم العضوية يتكون من 6 أرقام بالضبط.',
  phone: 'اكتب رقم موبايل صحيح، مثل 01012345678.',
  kind: 'اختر: شكوى أم مقترح؟',
  topic: 'اختر موضوع رسالتك.',
  details: 'اكتب تفاصيل شكواك أو اقتراحك.',
  photo: 'اختر صورة بصيغة JPG أو PNG، حتى 10 ميجا.',
  robot: 'تعذّر التحقق، حدّث الصفحة وحاول مرة أخرى.',
  failed: 'حدث خطأ أثناء الإرسال — حاول مرة أخرى بعد قليل.',
  off: 'الإرسال غير متاح الآن.',
};

const json = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/** Arabic-Indic and Persian digits to ASCII, everything else dropped. */
function digits(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/\D/g, '');
}

/** An Egyptian mobile (01[0125] + 8 digits) or an international number; as international digits. */
function phoneIntl(raw) {
  const plus = String(raw ?? '').trim().startsWith('+');
  const d = digits(raw);
  if (/^01[0125]\d{8}$/.test(d)) return `2${d}`;
  if (/^201[0125]\d{8}$/.test(d)) return d;
  if (plus && /^\d{8,15}$/.test(d)) return d;
  if (/^00\d{8,15}$/.test(d)) return d.slice(2);
  return null;
}

/** Template parameters may not hold new lines, tabs or more than four spaces in a row. */
function param(s, max = 900) {
  const t = String(s ?? '').replace(/[\r\n\t]+/g, ' / ').replace(/ {2,}/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t || '—';
}

function check(form) {
  const v = (k) => String(form.get(k) ?? '').trim();
  const membership = digits(v('membership'));
  if (!/^\d{6}$/.test(membership)) return { field: 'membership', message: MSG.membership };
  const phone = phoneIntl(v('phone'));
  if (!phone) return { field: 'phone', message: MSG.phone };
  const kind = v('kind');
  if (!KINDS.includes(kind)) return { field: 'kind', message: MSG.kind };
  const topic = v('topic');
  if (!TOPICS.includes(topic)) return { field: 'topic', message: MSG.topic };
  const details = v('details');
  if (!details || details.length > 2000) return { field: 'details', message: MSG.details };
  const name = v('full_name').slice(0, 120);
  const photo = form.get('photo');
  const file = photo && typeof photo === 'object' && photo.size > 0 ? photo : null;
  if (file && (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX)) return { field: 'photo', message: MSG.photo };
  return { ok: { membership, phone, kind, topic, details, name, photo: file } };
}

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET);
  body.set('response', token || '');
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = await r.json().catch(() => ({}));
  return d.success === true;
}

async function graph(env, path, init) {
  const r = await fetch(`https://graph.facebook.com/${env.WA_GRAPH || 'v23.0'}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, ...(init.headers || {}) },
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(`graph ${path}: ${r.status} ${JSON.stringify(d.error || d)}`);
  return d;
}

/** Sends one complaint to every number in WA_TO; resolves to how many sends succeeded. */
async function sendComplaint(env, c) {
  const to = String(env.WA_TO || '').split(',').map((x) => digits(x)).filter(Boolean);
  let header = null;
  if (c.photo) {
    const up = new FormData();
    up.set('messaging_product', 'whatsapp');
    up.set('type', c.photo.type);
    up.set('file', c.photo, c.photo.name || 'photo');
    const media = await graph(env, `${env.WA_PHONE_ID}/media`, { method: 'POST', body: up });
    header = { type: 'header', parameters: [{ type: 'image', image: { id: media.id } }] };
  }
  const body = {
    type: 'body',
    parameters: [c.kind, c.membership, c.name, `https://wa.me/${c.phone}`, c.topic, c.details].map((t) => ({ type: 'text', text: param(t) })),
  };
  const template = {
    name: c.photo ? (env.WA_TEMPLATE_PHOTO || 'tanta_complaint_photo') : (env.WA_TEMPLATE || 'tanta_complaint'),
    language: { code: env.WA_LANG || 'ar' },
    components: header ? [header, body] : [body],
  };
  const results = await Promise.allSettled(to.map((n) => graph(env, `${env.WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: n, type: 'template', template }),
  })));
  results.filter((r) => r.status === 'rejected').forEach((r) => console.error('complaint send failed:', String(r.reason)));
  return results.filter((r) => r.status === 'fulfilled').length;
}

async function complaints(request, env) {
  if (!env.WA_TOKEN || !env.WA_PHONE_ID || !env.WA_TO) return json({ ok: false, message: MSG.off });
  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, message: MSG.failed }); }
  const r = check(form);
  if (!r.ok) return json({ ok: false, field: r.field, message: r.message });
  if (!(await turnstileOk(env, String(form.get('ts') || ''), request.headers.get('CF-Connecting-IP')))) {
    return json({ ok: false, message: MSG.robot });
  }
  try {
    const sent = await sendComplaint(env, r.ok);
    return json(sent > 0 ? { ok: true } : { ok: false, message: MSG.failed });
  } catch (e) {
    console.error('complaint failed:', String(e));
    return json({ ok: false, message: MSG.failed });
  }
}

export default {
  // Exposed for tests only; Cloudflare uses fetch().
  _test: { digits, phoneIntl, param, check, sendComplaint },
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/complaints' || pathname === '/api/complaints/') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      return complaints(request, env);
    }
    if (pathname.startsWith('/api/')) return json({ ok: false, message: MSG.off });
    return env.ASSETS.fetch(request);
  },
};
