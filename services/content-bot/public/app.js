// The chat app. All text from the server is shown with textContent (never as HTML).
'use strict';
const $ = (s) => document.querySelector(s);
const state = { me: null, messages: [], changes: new Map(), lastId: 0, timer: null, busy: false, waiting: false };

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
  $('#chat').hidden = true; $('#composer').hidden = true; $('#alerts').hidden = true;
  if (msg) $('#locked-msg').textContent = msg;
  $('#locked').hidden = false;
}

// ---------- rendering ----------
function card(ch) {
  const status = el('span', { class: `status ${ch.status}`, text: ch.statusText });
  const c = el('div', { class: 'card' },
    el('h3', {}, el('span', { text: `تعديل ${ch.id}` }), status),
    el('div', { class: 'meta', text: `طلب: ${ch.requester}` }));
  for (const e of ch.edits) {
    c.append(el('div', { class: 'edit' },
      el('div', { class: 'page', text: e.page }),
      el('div', { class: 'old' }, el('span', { class: 'lbl', text: 'القديم' }), el('span', { class: 'txt', text: e.old })),
      el('div', { class: 'new' }, el('span', { class: 'lbl', text: 'الجديد' }), document.createTextNode(e.new))));
  }
  const actions = el('div', { class: 'actions' });
  if (ch.preview && /^https:\/\//.test(ch.preview)) actions.append(el('a', { class: 'preview', href: ch.preview, target: '_blank', rel: 'noopener noreferrer', text: 'معاينة' }));
  if (ch.can.approve) actions.append(el('button', { class: 'ok', text: 'نشر', onclick: () => act(ch.id, 'approve', 'نشر هذا التعديل على الموقع الآن؟') }));
  if (ch.can.reject) actions.append(el('button', { class: 'bad', text: state.me.role === 'client' ? 'رفض' : 'إلغاء', onclick: () => act(ch.id, 'reject') }));
  if (ch.can.undo) actions.append(el('button', { class: 'warn', text: 'تراجع', onclick: () => act(ch.id, 'undo', 'إرجاع النص القديم على الموقع؟') }));
  if (actions.childElementCount) c.append(actions);
  return c;
}

function render() {
  const list = $('#list');
  const nearBottom = $('#chat').scrollHeight - $('#chat').scrollTop - $('#chat').clientHeight < 120;
  const lastNotice = new Map();                       // show each change card once, under its newest note
  for (const m of state.messages) if (m.changeId) lastNotice.set(m.changeId, m.id);
  list.replaceChildren();
  if (!state.messages.length) {
    list.append(el('li', { class: 'bubble bot', text: `أهلًا ${state.me.name}. اكتب ما تريد تغييره في نصوص الموقع، مثلًا:\n«غيّر الشعار في الصفحة الرئيسية إلى …»\nأغيّر النصوص فقط، والنشر بموافقة ${state.me.client || 'المرشح'}.` }));
  }
  for (const m of state.messages) {
    const cls = m.kind === 'user' ? 'me' : m.kind === 'notice' ? 'notice' : 'bot';
    list.append(el('li', { class: `bubble ${cls}`, text: m.text }));
    const ch = m.changeId && lastNotice.get(m.changeId) === m.id && state.changes.get(m.changeId);
    if (ch) list.append(el('li', { class: 'card-wrap' }, card(ch)));
  }
  $('#typing').hidden = !state.waiting;
  if (nearBottom) $('#chat').scrollTop = $('#chat').scrollHeight;
}

// ---------- data ----------
async function refresh(full = false) {
  const r = await api(`/api/messages?after=${full ? 0 : state.lastId}`);
  if (!r.ok) return;
  if (full) state.messages = [];
  for (const m of r.messages) { state.messages.push(m); state.lastId = Math.max(state.lastId, m.id); }
  state.changes = new Map(r.changes.map((c) => [c.id, c]));
  state.waiting = r.waiting;
  render();
}
function startPolling() {
  stopPolling();
  const tick = async () => { try { await refresh(); } catch { /* offline: try again */ } state.timer = setTimeout(tick, state.waiting ? 2000 : 5000); };
  state.timer = setTimeout(tick, 2000);
}
function stopPolling() { clearTimeout(state.timer); state.timer = null; }

async function act(id, action, question) {
  if (state.busy) return;
  if (question && !confirm(question)) return;
  state.busy = true;
  document.querySelectorAll('.card button').forEach((b) => { b.disabled = true; });
  try {
    const r = await api(`/api/changes/${id}/${action}`, {});
    toast(r.message || (r.ok ? 'تم.' : 'تعذّر التنفيذ.'));
  } catch { toast('تعذّر الاتصال. حاول مرة أخرى.'); }
  state.busy = false;
  await refresh();
}

async function send(ev) {
  ev.preventDefault();
  const box = $('#text'), text = box.value.trim();
  if (!text || state.busy) return;
  state.busy = true; $('#send').disabled = true;
  try {
    const r = await api('/api/message', { text });
    if (r.ok) { box.value = ''; autosize(); state.waiting = true; await refresh(); startPolling(); }
    else toast(r.message || 'لم تُرسل الرسالة.');
  } catch (e) { if (e.message !== 'login') toast('تعذّر الاتصال. حاول مرة أخرى.'); }
  state.busy = false; $('#send').disabled = false;
}
function autosize() { const t = $('#text'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }

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
  $('#who').textContent = me.role === 'client' ? `${me.name} — صاحب الموافقة` : me.name;
  $('#chat').hidden = false; $('#composer').hidden = false;
  $('#composer').addEventListener('submit', send);
  $('#text').addEventListener('input', autosize);
  await refresh(true);
  startPolling();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPolling(); else { refresh().catch(() => {}); startPolling(); } });
  setupAlerts().catch(() => {});
}
start();
