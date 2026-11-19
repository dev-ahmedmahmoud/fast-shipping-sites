// Run: node apps/site/server/test/elections-worker.test.mjs (no network: fetch is mocked).
import worker from '../elections-worker.js';
const { phoneIntl, param, digits } = worker._test;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('siteverify')) return new Response(JSON.stringify({ success: init.body.get('response') === 'good' }));
  if (String(url).endsWith('/media')) return new Response(JSON.stringify({ id: 'MEDIA123' }));
  if (String(url).endsWith('/messages')) {
    const b = JSON.parse(init.body);
    if (b.to === '201999999999') return new Response(JSON.stringify({ error: { message: 'bad number' } }), { status: 400 });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.X' }] }));
  }
  return new Response('?', { status: 404 });
};
const env = { WA_TOKEN: 't', WA_PHONE_ID: 'PID', WA_TO: '201000083751, +20 100 111 2222', ASSETS: { fetch: async (r) => new Response('asset:' + new URL(r.url).pathname) } };
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const good = { membership: '١٢٣٤٥٦', full_name: 'أحمد', phone: '01012345678', kind: 'شكوى', topic: 'الخدمات والمرافق', details: 'سطر أول\nسطر    ثانٍ', ts: '' };
const post = (env, f, path = '/api/complaints') => worker.fetch(new Request('https://x.test' + path, { method: 'POST', body: f }), env).then((r) => r.json());
let ok = true; const t = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); ok &&= !!cond; };

t('phones', phoneIntl('01012345678') === '201012345678' && phoneIntl('+966501234567') === '966501234567' && phoneIntl('0123') === null && phoneIntl('٠١٠١٢٣٤٥٦٧٨') === '201012345678');
t('param flattens', param('a\nb\t c     d') === 'a / b / c d' && param('') === '—' && param('x'.repeat(1000)).length === 900);
t('digits', digits('١٢٣abc4') === '1234');

t('no config → off', (await post({ ASSETS: env.ASSETS }, form(good))).message.includes('غير متاح'));
t('bad membership', (await post(env, form({ ...good, membership: '12' }))).field === 'membership');
t('bad phone', (await post(env, form({ ...good, phone: '123' }))).field === 'phone');
t('bad kind', (await post(env, form({ ...good, kind: 'x' }))).field === 'kind');
t('bad topic', (await post(env, form({ ...good, topic: 'x' }))).field === 'topic');
t('no details', (await post(env, form({ ...good, details: '  ' }))).field === 'details');
t('bad photo type', (await post(env, form({ ...good, photo: new File(['x'], 'a.gif', { type: 'image/gif' }) }))).field === 'photo');

calls.length = 0;
const r1 = await post(env, form(good));
const sends = calls.filter((c) => c.url.endsWith('/messages'));
const b = JSON.parse(sends[0].init.body);
t('sent ok', r1.ok === true && sends.length === 2);
t('recipients', sends.map((c) => JSON.parse(c.init.body).to).join() === '201000083751,201001112222');
t('template', b.template.name === 'tanta_complaint' && b.template.language.code === 'ar' && b.template.components.length === 1);
t('params', b.template.components[0].parameters.map((p) => p.text).join(' | ') === 'شكوى | 123456 | أحمد | https://wa.me/201012345678 | الخدمات والمرافق | سطر أول / سطر ثانٍ');
t('auth header', sends[0].init.headers.Authorization === 'Bearer t' && sends[0].url.startsWith('https://graph.facebook.com/v23.0/PID/messages'));

calls.length = 0;
const r2 = await post(env, form({ ...good, full_name: '', photo: new File([new Uint8Array(10)], 'p.jpg', { type: 'image/jpeg' }) }));
const b2 = JSON.parse(calls.find((c) => c.url.endsWith('/messages')).init.body);
t('photo upload + header', r2.ok && calls[0].url.endsWith('/PID/media') && b2.template.name === 'tanta_complaint_photo' && b2.template.components[0].parameters[0].image.id === 'MEDIA123' && b2.template.components[1].parameters[2].text === '—');

const r3 = await post({ ...env, WA_TO: '201999999999' }, form(good));
t('all sends fail → error', r3.ok === false && r3.message.includes('خطأ'));
const r4 = await post({ ...env, WA_TO: '201999999999,201000083751' }, form(good));
t('one of two fails → ok', r4.ok === true);

t('turnstile rejects', (await post({ ...env, TURNSTILE_SECRET: 's' }, form({ ...good, ts: 'bad' }))).ok === false);
t('turnstile accepts', (await post({ ...env, TURNSTILE_SECRET: 's' }, form({ ...good, ts: 'good' }))).ok === true);

const g = await worker.fetch(new Request('https://x.test/api/complaints'), env);
t('GET → 405', g.status === 405);
t('other api → off', (await (await worker.fetch(new Request('https://x.test/api/visit', { method: 'POST' }), env)).json()).ok === false);
t('pages → assets', (await (await worker.fetch(new Request('https://x.test/team/'), env)).text()) === 'asset:/team/');
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
