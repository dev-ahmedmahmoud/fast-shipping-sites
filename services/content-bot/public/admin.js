'use strict';
const $ = (s) => document.querySelector(s);
const ROLE = { client: 'المرشح', cabinet: 'عضو بالحملة' };
const EVENT = {
  request: 'طلب جديد', agent_started: 'بدأ الوكيل', agent_start_failed: 'تعذّر بدء الوكيل', agent_refused: 'رفض الوكيل', agent_timeout: 'انتهى وقت الوكيل',
  published: 'نُشر على الموقع', site_updated: 'تم تحديث الموقع', build_failed: 'فشل تحديث الموقع', refused_by_checks: 'رفضه الفحص', check_detail: 'تفاصيل الفحص',
  publish_failed: 'فشل النشر', aborted: 'أُوقف', reverted: 'تم التراجع', revert_stale: 'تعذّر التراجع', revert_error: 'خطأ في التراجع',
  joined: 'دخل من رابط', join_failed: 'رابط غير صالح', person_added: 'أُضيف شخص', invite_created: 'رابط دخول جديد', person_blocked: 'حُظر', person_unblocked: 'أُلغي الحظر',
  admin_denied: 'مفتاح إدارة خاطئ', voice_error: 'خطأ في الصوت', file_skipped: 'ملف تم تجاهله', api_error: 'خطأ', advance_error: 'خطأ في المتابعة',
};
let key = '';
try { key = sessionStorage.getItem('adminKey') || ''; } catch { /* private mode */ }

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
  for (const k of kids) if (k) e.append(k);
  return e;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 3500); }
async function call(body) {
  const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key }, body: JSON.stringify(body) });
  let d = {}; try { d = await r.json(); } catch { /* */ }
  if (r.status === 401) { showLogin(); toast(d.message || 'المفتاح غير صحيح.'); throw new Error('auth'); }
  if (!d.ok) toast(d.message || 'حدث خطأ.');
  return d;
}
const when = (ts) => (ts ? new Date(ts * 1000).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'لم يدخل بعد');
function showLogin() { $('#panel').hidden = true; $('#login').hidden = false; $('#logout').hidden = true; }

async function load() {
  const d = await call({ action: 'list' });
  if (!d.ok) return;
  $('#login').hidden = true; $('#panel').hidden = false; $('#logout').hidden = false;
  const box = $('#people'); box.replaceChildren();
  $('#count').textContent = d.people.filter((p) => p.active).length;
  if (!d.people.length) box.append(el('p', { class: 'small', text: 'لا يوجد أحد بعد. أضف نفسك أولًا للتجربة.' }));
  for (const p of d.people) {
    box.append(el('div', { class: `person${p.active ? '' : ' off'}` },
      el('div', { class: 'avatar', text: p.name.trim().charAt(0) }),
      el('div', { class: 'info' },
        el('strong', { text: p.name }),
        el('span', { class: `tag ${p.role}`, text: ROLE[p.role] }),
        p.active ? null : el('span', { class: 'tag blocked', text: 'محظور' }),
        el('div', { class: 'small', text: `${p.devices} جهاز · ${p.alerts ? 'الإشعارات مفعلة' : 'بدون إشعارات'} · ${when(p.last_seen)}` })),
      el('div', { class: 'btns' },
        p.active ? el('button', { class: 'sm', text: 'رابط دخول', onclick: () => invite(p.id) }) : null,
        p.active ? el('button', { class: 'sm bad', text: 'حظر', onclick: () => block(p) }) : el('button', { class: 'sm warn', text: 'إلغاء الحظر', onclick: () => unblock(p) }))));
  }
  await loadAudit();
}
async function loadAudit() {
  const a = await call({ action: 'audit', limit: 100 });
  const list = $('#audit'); list.replaceChildren();
  if (!a.rows?.length) list.append(el('li', { class: 'small', text: 'لا توجد عمليات بعد.' }));
  for (const r of a.rows || []) {
    const detail = r.detail && /^https:\/\/claude\.ai\//.test(r.detail)
      ? el('a', { href: r.detail, target: '_blank', rel: 'noopener noreferrer', text: 'فتح تشغيل الوكيل' })
      : r.detail ? el('span', { class: 'detail', text: r.detail.slice(0, 200) }) : null;
    list.append(el('li', {},
      el('span', { class: 'when', text: when(r.ts) }),
      el('span', { class: 'ev', text: EVENT[r.event] || r.event }),
      el('span', { class: 'actor', text: r.actor }),
      r.change_id ? el('code', { text: r.change_id }) : null,
      r.commit_sha ? el('code', { text: r.commit_sha.slice(0, 8) }) : null,
      detail));
  }
}
async function invite(id) {
  const d = await call({ action: 'invite', personId: id });
  if (!d.ok) return;
  const box = $('#link'); box.hidden = false;
  const copy = el('button', { text: 'نسخ الرابط', onclick: async () => { try { await navigator.clipboard.writeText(d.link); toast('تم النسخ.'); } catch { toast('انسخه يدويًا.'); } } });
  const share = navigator.share ? el('button', { class: 'warn', text: 'مشاركة', onclick: () => navigator.share({ text: `رابط دخولك لتطبيق تعديل الموقع (يعمل مرة واحدة):\n${d.link}` }).catch(() => {}) }) : null;
  box.replaceChildren(
    el('strong', { text: `رابط دخول ${d.name}` }),
    el('p', { class: 'small', text: 'يعمل مرة واحدة، على جهاز واحد، لمدة 7 أيام. أرسله له على واتساب.' }),
    el('div', { class: 'link-box', text: d.link }),
    el('div', { class: 'row' }, copy, share));
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  load();
}
async function block(p) { if (confirm(`حظر ${p.name}؟ سيخرج من كل أجهزته فورًا.`)) { await call({ action: 'block', personId: p.id }); load(); } }
async function unblock(p) { await call({ action: 'unblock', personId: p.id }); load(); }

$('#login-form').addEventListener('submit', (e) => { e.preventDefault(); key = $('#key').value.trim(); try { sessionStorage.setItem('adminKey', key); } catch { /* */ } load().catch(() => {}); });
$('#add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const role = document.querySelector('input[name=role]:checked').value;
  const d = await call({ action: 'add', name: $('#name').value, role });
  if (d.ok) { $('#name').value = ''; toast('تمت الإضافة.'); await invite(d.personId); }
});
$('#reload').addEventListener('click', () => loadAudit().catch(() => {}));
$('#logout').addEventListener('click', () => { key = ''; try { sessionStorage.removeItem('adminKey'); } catch { /* */ } $('#key').value = ''; showLogin(); });
if (key) load().catch(() => {});
