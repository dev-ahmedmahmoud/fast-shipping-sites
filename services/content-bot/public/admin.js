'use strict';
const $ = (s) => document.querySelector(s);
const ROLE = { client: 'المرشح (صاحب الموافقة)', cabinet: 'عضو بالحملة' };
let key = '';
try { key = sessionStorage.getItem('adminKey') || ''; } catch { /* private mode */ }

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
  for (const k of kids) if (k) e.append(k);
  return e;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 4000); }
async function call(body) {
  const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key }, body: JSON.stringify(body) });
  let d = {}; try { d = await r.json(); } catch { /* */ }
  if (r.status === 401) { $('#panel').hidden = true; $('#login').hidden = false; toast(d.message || 'المفتاح غير صحيح.'); throw new Error('auth'); }
  if (!d.ok) toast(d.message || 'حدث خطأ.');
  return d;
}
const when = (ts) => (ts ? new Date(ts * 1000).toLocaleString('ar-EG') : '—');

async function load() {
  const d = await call({ action: 'list' });
  if (!d.ok) return;
  $('#login').hidden = true; $('#panel').hidden = false;
  const box = $('#people'); box.replaceChildren();
  for (const p of d.people) {
    box.append(el('div', { class: `person${p.active ? '' : ' off'}` },
      el('div', {}, el('strong', { text: p.name }), el('div', { class: 'small', text: `${ROLE[p.role]} · أجهزة: ${p.devices} · إشعارات: ${p.alerts} · آخر دخول: ${when(p.last_seen)}${p.active ? '' : ' · محظور'}` })),
      el('div', { class: 'row' },
        p.active ? el('button', { text: 'رابط دخول', onclick: () => invite(p.id) }) : null,
        p.active ? el('button', { class: 'bad', text: 'حظر', onclick: () => block(p) }) : el('button', { class: 'warn', text: 'إلغاء الحظر', onclick: () => unblock(p) }))));
  }
  const a = await call({ action: 'audit', limit: 100 });
  const list = $('#audit'); list.replaceChildren();
  for (const r of a.rows || []) list.append(el('li', { text: `${when(r.ts)} · ${r.actor} · ${r.event}${r.change_id ? ' · ' + r.change_id : ''}${r.commit_sha ? ' · ' + r.commit_sha.slice(0, 8) : ''}${r.detail ? ' · ' + r.detail.slice(0, 160) : ''}` }));
}
async function invite(id) {
  const d = await call({ action: 'invite', personId: id });
  if (!d.ok) return;
  const box = $('#link'); box.hidden = false;
  const copy = el('button', { text: 'نسخ الرابط', onclick: async () => { try { await navigator.clipboard.writeText(d.link); toast('تم النسخ.'); } catch { toast('انسخه يدويًا.'); } } });
  const share = navigator.share ? el('button', { class: 'warn', text: 'مشاركة', onclick: () => navigator.share({ text: `رابط دخولك لتطبيق تعديل الموقع (لمرة واحدة):\n${d.link}` }).catch(() => {}) }) : null;
  box.replaceChildren(el('p', { text: `رابط دخول ${d.name} (يعمل مرة واحدة خلال 7 أيام، على جهاز واحد):` }), el('div', { class: 'link-box', text: d.link }), el('div', { class: 'row mt' }, copy, share));
  load();
}
async function block(p) { if (confirm(`حظر ${p.name}؟ سيخرج من كل أجهزته فورًا.`)) { await call({ action: 'block', personId: p.id }); load(); } }
async function unblock(p) { await call({ action: 'unblock', personId: p.id }); load(); }

$('#go').onclick = () => { key = $('#key').value.trim(); try { sessionStorage.setItem('adminKey', key); } catch { /* */ } load().catch(() => {}); };
$('#add').onclick = async () => {
  const d = await call({ action: 'add', name: $('#name').value, role: $('#role').value });
  if (d.ok) { $('#name').value = ''; toast('تمت الإضافة. أنشئ له رابط دخول.'); load(); }
};
if (key) load().catch(() => {});
