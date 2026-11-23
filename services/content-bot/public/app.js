// Request app: send a text change, watch it go: sent -> agent working -> checking -> site updating -> done.
// All server text is shown with textContent (never as HTML).
'use strict';
const $ = (s) => document.querySelector(s);
const state = { me: null, requests: [], timer: null, busy: false };
const STEPS = [['working', 'الوكيل يعدّل'], ['checking', 'فحص ونشر'], ['building', 'تحديث الموقع'], ['done', 'تم']];

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const k of kids) if (k) e.append(k);
  return e;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 4000);
}
async function api(path, body) {
  const res = await fetch(path, body === undefined ? { credentials: 'same-origin' } : {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* not json */ }
  if (res.status === 401 && path !== '/api/join') { showLocked(); throw new Error('login'); }
  return { status: res.status, ...data };
}
function showLocked(msg) {
  stopPolling();
  $('#app').hidden = true; $('#alerts').hidden = true;
  if (msg) $('#locked-msg').textContent = msg;
  $('#locked').hidden = false;
}
const when = (ts) => new Date(ts * 1000).toLocaleString('ar-EG', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });

// ---------- one request ----------
function steps(r) {
  const order = STEPS.map((s) => s[0]);
  const at = r.status === 'checking' ? 1 : order.indexOf(r.status);
  const ol = el('ol', { class: 'steps' });
  STEPS.forEach(([, label], i) => ol.append(el('li', { class: i < at || r.status === 'done' ? 'past' : i === at ? 'now' : '', text: label })));
  return ol;
}
function item(r) {
  const li = el('li', { class: `req ${r.status}` });
  li.append(el('div', { class: 'meta', text: `${r.mine ? 'طلبك' : r.from} · ${when(r.at)} · ${r.id}` }));
  li.append(el('div', { class: 'ask-text', text: r.text }));
  if (['working', 'checking', 'building', 'done'].includes(r.status)) li.append(steps(r));
  const line = el('div', { class: 'state' }, r.inProgress ? el('span', { class: 'spin', 'aria-hidden': 'true' }) : null, document.createTextNode(r.statusText));
  li.append(line);
  if (r.message) li.append(el('div', { class: 'msg', text: r.message }));
  for (const e of r.edits) {
    li.append(el('div', { class: 'edit' }, el('div', { class: 'page', text: e.page }),
      el('div', { class: 'old' }, el('span', { class: 'lbl', text: 'القديم' }), el('span', { class: 'txt', text: e.old })),
      el('div', { class: 'new' }, el('span', { class: 'lbl', text: 'الجديد' }), el('span', { class: 'txt', text: e.new }))));
  }
  const actions = el('div', { class: 'actions' });
  if (r.status === 'done' && state.me.site) actions.append(el('a', { class: 'preview', href: state.me.site, target: '_blank', rel: 'noopener noreferrer', text: 'فتح الموقع' }));
  if (r.can.abort) actions.append(el('button', { class: 'bad', text: 'إيقاف', onclick: () => act(r.id, 'abort', 'إيقاف هذا الطلب؟ لن يتغير شيء على الموقع.') }));
  if (r.can.revert) actions.append(el('button', { class: 'warn', text: 'تراجع', onclick: () => act(r.id, 'revert', 'إرجاع النص القديم على الموقع؟') }));
  if (actions.childElementCount) li.append(actions);
  return li;
}
function render() {
  const list = $('#list');
  list.replaceChildren();
  if (!state.requests.length) list.append(el('li', { class: 'empty', text: 'لا توجد طلبات بعد.' }));
  for (const r of state.requests) list.append(item(r));
}

// ---------- data ----------
async function refresh() {
  const r = await api('/api/requests');
  if (!r.ok) return;
  state.requests = r.requests;
  render();
}
function startPolling() {
  stopPolling();
  const tick = async () => {
    try { await refresh(); } catch { /* offline: try again */ }
    state.timer = setTimeout(tick, state.requests.some((r) => r.inProgress) ? 4000 : 20000);
  };
  state.timer = setTimeout(tick, 3000);
}
function stopPolling() { clearTimeout(state.timer); state.timer = null; }

async function act(id, action, question) {
  if (state.busy || (question && !confirm(question))) return;
  state.busy = true;
  document.querySelectorAll('.req button').forEach((b) => { b.disabled = true; });
  try { const r = await api(`/api/requests/${id}/${action}`, {}); toast(r.message || (r.ok ? 'تم.' : 'تعذّر التنفيذ.')); }
  catch { toast('تعذّر الاتصال. حاول مرة أخرى.'); }
  state.busy = false;
  await refresh(); startPolling();
}
async function send(ev) {
  ev.preventDefault();
  const box = $('#text'), text = box.value.trim();
  if (!text || state.busy) return;
  state.busy = true; $('#send').disabled = true; $('#send').textContent = 'جارٍ الإرسال…';
  try {
    const r = await api('/api/requests', { text });
    if (r.ok) { box.value = ''; toast('تم إرسال الطلب إلى الوكيل.'); await refresh(); startPolling(); }
    else toast(r.message || 'لم يُرسل الطلب.');
  } catch (e) { if (e.message !== 'login') toast('تعذّر الاتصال. حاول مرة أخرى.'); }
  state.busy = false; $('#send').disabled = false; $('#send').textContent = 'إرسال الطلب';
}

// ---------- phone alerts ----------
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function keyBytes(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function setupAlerts() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.register('/sw.js');
  if (isIOS && !standalone) {
    const h = $('#hint'); h.hidden = false;
    h.textContent = 'لتصلك الإشعارات على الآيفون: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق من الأيقونة.';
    return;
  }
  if (!('PushManager' in window) || !state.me.vapidPublicKey) return;
  const existing = await reg.pushManager.getSubscription();
  if (existing && Notification.permission === 'granted') { await api('/api/push', { endpoint: existing.endpoint }); return; }
  if (Notification.permission === 'denied') return;
  const btn = $('#alerts'); btn.hidden = false;
  btn.onclick = async () => {
    try {
      if ((await Notification.requestPermission()) !== 'granted') { toast('لم يتم السماح بالإشعارات.'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(state.me.vapidPublicKey) });
      const r = await api('/api/push', { endpoint: sub.endpoint });
      if (r.ok) { btn.hidden = true; toast('تم تفعيل الإشعارات.'); }
    } catch { toast('تعذّر تفعيل الإشعارات على هذا الجهاز.'); }
  };
}

// ---------- start ----------
async function start() {
  if (location.hash.startsWith('#join=')) {
    const token = location.hash.slice(6);
    history.replaceState(null, '', '/');                // the link is one-time; remove it from the address bar
    const r = await api('/api/join', { token });
    if (!r.ok) return showLocked(r.message);
  }
  let me;
  try { me = await api('/api/me'); } catch { return; }
  if (!me.ok) return showLocked();
  state.me = me;
  $('#who').textContent = me.role === 'client' ? `${me.name} — كل الطلبات` : me.name;
  $('#app').hidden = false;
  $('#composer').addEventListener('submit', send);
  await refresh();
  startPolling();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPolling(); else { refresh().catch(() => {}); startPolling(); } });
  setupAlerts().catch(() => {});
}
start();
