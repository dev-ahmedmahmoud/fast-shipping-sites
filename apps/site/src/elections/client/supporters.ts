// The supporters' team app (#el-sup on the support page): join with the club membership
// number, name, WhatsApp mobile and a password → confirm the WhatsApp code → a personal
// link to share, with a counter of visits that came through it and a goal. Also: log in,
// forgot password (a new code on WhatsApp), log out. Every string comes from the
// client's supporters "words" (verbatim from the source site).
// Markup classes (.el-sup__*) are documented in design-systems/README.md; defaults in ../elections.css.
import type { Api, Me, Result } from './api';
import { COUNTRIES, e164, split } from './phone';
import { turnstile } from './turnstile';

type Words = Record<string, string>;
type Kid = Node | string | null | false | undefined;

const PENDING = 'el-sup-pending';
interface Pending { token: string; reset: boolean; mobile: string; cc: string; national: string; membership?: string; name?: string }

const store = {
  get(): Pending | null { try { return JSON.parse(sessionStorage.getItem(PENDING) || 'null'); } catch { return null; } },
  set(v: Pending | null) { try { if (v) sessionStorage.setItem(PENDING, JSON.stringify(v)); else sessionStorage.removeItem(PENDING); } catch { /* blocked */ } },
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, kids: Kid[] = []): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}

export function mountSupporters(root: HTMLElement, api: Api, W: Words, fmt: (s: string, ...a: (string | number)[]) => string, siteKey: string) {
  let tick: number | undefined;
  let lastPassword = '';
  const ts = turnstile(siteKey);

  function card(kids: Kid[]) {
    clearInterval(tick);
    ts.forget();
    root.replaceChildren(el('div', { class: 'el-sup__card' }, kids));
  }

  const demoBadge = () => (api.mode === 'demo' ? el('p', { class: 'el-sup__demo' }, [W.demoBadge]) : null);

  function field(name: string, label: string, attrs: Record<string, unknown> = {}, hint?: string) {
    const id = `el-sup-${name}`;
    const input = el('input', { id, name, required: true, ...attrs });
    const control = attrs.type === 'password' ? eye(input) : input;
    return el('label', { class: 'el-sup__f', for: id }, [el('span', {}, [label]), control, hint ? el('small', {}, [hint]) : null]);
  }

  function eye(input: HTMLInputElement) {
    const btn = el('button', { type: 'button', class: 'el-sup__eye', 'aria-label': W.showPass, 'aria-pressed': 'false' });
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><path class="el-sup__eye-off" d="M4 4l16 16"/></svg>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? W.hidePass : W.showPass);
    });
    return el('div', { class: 'el-sup__pw', dir: 'ltr' }, [input, btn]);
  }

  function phone(cc = COUNTRIES[0][1], national = '') {
    const id = 'el-sup-mobile';
    const shown = el('b', { 'aria-hidden': 'true' }, [`+${cc}`]);
    const pick = el('select', { name: 'cc', 'aria-label': W.country }, COUNTRIES.map(([n, code]) => el('option', { value: code }, [`${n} +${code}`])));
    pick.value = cc;
    const num = el('input', { id, name: 'mobile', required: true, type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', maxlength: '20', placeholder: COUNTRIES.find((c) => c[1] === cc)?.[2] ?? '' });
    num.value = national;
    const tidy = () => {
      if (!num.value.trim()) return;
      const s = split(num.value, pick.value);
      if (COUNTRIES.some((c) => c[1] === s.cc)) { pick.value = s.cc; shown.textContent = `+${s.cc}`; }
      num.value = s.national;
    };
    pick.addEventListener('change', () => {
      shown.textContent = `+${pick.value}`;
      num.placeholder = COUNTRIES[pick.selectedIndex][2];
      tidy();
    });
    num.addEventListener('blur', tidy);
    return el('label', { class: 'el-sup__f', for: id }, [
      el('span', {}, [W.mobile]),
      el('div', { class: 'el-sup__tel', dir: 'ltr' }, [el('span', { class: 'el-sup__cc' }, [shown, pick]), num]),
    ]);
  }

  function clearErrors(form: HTMLFormElement) {
    form.querySelectorAll('.el-sup__err').forEach((e) => e.remove());
    form.querySelectorAll('[aria-invalid]').forEach((i) => { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
  }

  /** Wires a form: collects fields, sends through `send`, shows field or general errors. */
  function submitter(form: HTMLFormElement, msg: HTMLElement, send: (d: Record<string, string>) => Promise<Result>, done: (r: Result, d: Record<string, string>) => void) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = form.querySelector<HTMLButtonElement>('[type=submit]')!;
      const data: Record<string, string> = {};
      new FormData(form).forEach((v, k) => { data[k] = String(v); });
      if ('mobile' in data) {
        data.mobile = e164(data.mobile, data.cc) || data.mobile;
      }
      btn.disabled = true;
      msg.textContent = '';
      msg.className = 'el-sup__msg';
      clearErrors(form);
      data.ts = await ts.token(form);
      const r = await send(data);
      if (!form.isConnected) return;
      btn.disabled = false;
      if (r.ok) { done(r, data); return; }
      ts.reset();
      const name = r.field || ({ badCode: 'code', codeDead: 'code', badLogin: 'password', takenMobile: 'mobile' } as Record<string, string>)[r.code || ''];
      const bad = name ? form.querySelector<HTMLInputElement>(`[name="${name}"]`) : null;
      if (bad) {
        const err = el('p', { class: 'el-sup__err', id: `${bad.id}-err`, role: 'alert' }, [r.message || W.errNetwork]);
        if (r.code === 'takenMobile') {
          err.append(' ', el('button', { type: 'button', class: 'el-sup__inline', onclick: () => showJoin('login', '', { mobile: data.mobile, cc: data.cc }) }, [W.goLogin]));
        }
        (bad.closest('.el-sup__tel, .el-sup__pw') || bad).after(err);
        bad.setAttribute('aria-invalid', 'true');
        bad.setAttribute('aria-describedby', err.id);
        bad.addEventListener('input', function clear() { bad.removeEventListener('input', clear); bad.removeAttribute('aria-invalid'); bad.removeAttribute('aria-describedby'); err.remove(); });
        bad.focus();
      } else {
        msg.textContent = r.message || W.errNetwork;
        msg.className = 'el-sup__msg is-bad';
      }
    });
  }

  function showJoin(tab: 'join' | 'login', note = '', again: Partial<Pending> = {}) {
    const msg = el('p', { class: `el-sup__msg${note ? ' is-bad' : ''}`, role: 'alert' }, note ? [note] : []);
    const box = el('div', { class: 'el-sup__ts' });
    const tabs = el('div', { class: 'el-sup__tabs', role: 'tablist' }, [
      el('button', { type: 'button', class: 'el-sup__tab', role: 'tab', 'aria-selected': String(tab === 'join'), onclick: () => showJoin('join') }, [W.tabJoin]),
      el('button', { type: 'button', class: 'el-sup__tab', role: 'tab', 'aria-selected': String(tab === 'login'), onclick: () => showJoin('login') }, [W.tabLogin]),
    ]);
    const parts = again.mobile ? split(again.mobile, again.cc || COUNTRIES[0][1]) : null;
    const mobile = phone(parts?.cc, parts?.national);
    let form: HTMLFormElement;
    if (tab === 'join') {
      form = el('form', { novalidate: true }, [
        field('membership', W.membership, { inputmode: 'numeric', autocomplete: 'off', class: 'is-ltr', dir: 'ltr', maxlength: '6', placeholder: W.membershipPh }),
        field('name', W.name, { autocomplete: 'name', maxlength: '80', dir: 'auto' }),
        mobile,
        field('password', W.password, { type: 'password', autocomplete: 'new-password', class: 'is-ltr', maxlength: '72' }, W.passwordHint),
        el('p', { class: 'el-sup__intro' }, [el('small', {}, [W.consent])]),
        box, msg, el('button', { class: 'el-sup__go', type: 'submit' }, [W.join]),
      ]);
      submitter(form, msg, (d) => { lastPassword = d.password; return api.register(d); }, (r, d) => {
        const s = split(d.mobile, d.cc);
        store.set({ token: r.token || '', reset: false, mobile: d.mobile, cc: s.cc, national: s.national, membership: d.membership, name: d.name });
        showCode(r.message, r.gap);
      });
    } else {
      form = el('form', { novalidate: true }, [
        mobile,
        field('password', W.password, { type: 'password', autocomplete: 'current-password', class: 'is-ltr', maxlength: '72' }),
        box, msg, el('button', { class: 'el-sup__go', type: 'submit' }, [W.login]),
        el('button', { type: 'button', class: 'el-sup__link', onclick: () => showForgot() }, [W.forgot]),
      ]);
      submitter(form, msg, (d) => api.login(d), (r) => showMe(r.me!));
    }
    card([demoBadge(), el('p', { class: 'el-sup__intro' }, [W.intro]), tabs, form]);
    if (again.membership !== undefined || again.name !== undefined) {
      const m = form.querySelector<HTMLInputElement>('[name=membership]');
      if (m) m.value = again.membership || '';
      const n = form.querySelector<HTMLInputElement>('[name=name]');
      if (n) n.value = again.name || '';
      const p = form.querySelector<HTMLInputElement>('[name=password]');
      if (p) p.value = lastPassword;
    }
    if (again.mobile) form.querySelector<HTMLInputElement>('[name=mobile]')?.focus();
    ts.mount(box);
  }

  function showForgot(again: Partial<Pending> = {}) {
    const msg = el('p', { class: 'el-sup__msg', role: 'alert' });
    const box = el('div', { class: 'el-sup__ts' });
    const parts = again.mobile ? split(again.mobile, again.cc || COUNTRIES[0][1]) : null;
    const form = el('form', { novalidate: true }, [
      phone(parts?.cc, parts?.national),
      box, msg, el('button', { class: 'el-sup__go', type: 'submit' }, [W.forgotSend]),
      el('button', { type: 'button', class: 'el-sup__link', onclick: () => showJoin('login') }, [W.back]),
    ]);
    submitter(form, msg, (d) => api.forgot(d), (r, d) => {
      const s = split(d.mobile, d.cc);
      store.set({ token: r.token || '', reset: true, mobile: d.mobile, cc: s.cc, national: s.national });
      showCode(r.message, r.gap);
    });
    card([demoBadge(), form]);
    if (again.mobile) form.querySelector<HTMLInputElement>('[name=mobile]')?.focus();
    ts.mount(box);
  }

  function showCode(note?: string, gap = 0) {
    const p = store.get();
    if (!p) { showJoin('join'); return; }
    const msg = el('p', { class: `el-sup__msg${note ? ' is-good' : ''}`, role: 'status' }, note ? [note] : []);
    const resend = el('button', { type: 'button', class: 'el-sup__go el-sup__go--alt' }, [W.resend]);
    const form = el('form', { novalidate: true }, [
      msg,
      el('p', { class: 'el-sup__to' }, [`${W.sentTo} `, el('bdi', { dir: 'ltr' }, [p.mobile])]),
      field('code', W.code, { inputmode: 'numeric', autocomplete: 'one-time-code', class: 'is-ltr', dir: 'ltr', maxlength: '6' }),
      p.reset ? field('password', W.newPassword, { type: 'password', autocomplete: 'new-password', class: 'is-ltr', maxlength: '72' }, W.passwordHint) : null,
      el('button', { class: 'el-sup__go', type: 'submit' }, [W.confirm]),
      resend,
      el('button', { type: 'button', class: 'el-sup__link', onclick: () => { const d = store.get(); store.set(null); if (d?.reset) showForgot(d); else showJoin('join', '', d ?? {}); } }, [W.changeNumber]),
    ]);
    submitter(form, msg, (d) => api.verify({ ...d, token: store.get()?.token || '' }), (r) => { store.set(null); showMe(r.me!); });
    resend.addEventListener('click', async () => {
      resend.disabled = true;
      const r = await api.resend({ token: store.get()?.token || '' });
      if (!form.isConnected) return;
      resend.disabled = false;
      msg.textContent = r.message || (r.ok ? W.codeSent : W.errNetwork);
      msg.className = `el-sup__msg ${r.ok ? 'is-good' : 'is-bad'}`;
      if (r.ok) wait(resend, r.gap || 0);
      else if (r.code === 'codeDead') { store.set(null); showJoin(p.reset ? 'login' : 'join', r.message); }
    });
    card([demoBadge(), form]);
    wait(resend, gap);
    form.querySelector<HTMLInputElement>('[name=code]')?.focus();
  }

  function wait(btn: HTMLButtonElement, secs: number) {
    clearInterval(tick);
    if (!secs) return;
    let left = secs;
    btn.disabled = true;
    btn.textContent = fmt(W.resendIn, left);
    tick = window.setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(tick); btn.disabled = false; btn.textContent = W.resend; return; }
      btn.textContent = fmt(W.resendIn, left);
    }, 1000);
  }

  function showMe(me: Me) {
    const goal = me.goal;
    const done = me.count >= goal;
    const pct = Math.min(100, Math.round((100 * me.count) / goal));
    const url = el('input', { class: 'el-sup__url', readonly: true, value: me.link, 'aria-label': W.yourLink, dir: 'ltr' });
    url.addEventListener('focus', () => url.select());
    const copy = el('button', { type: 'button', class: 'el-sup__go' }, [W.copy]);
    copy.addEventListener('click', () => {
      const ok = () => { copy.textContent = W.copied; setTimeout(() => { copy.textContent = W.copy; }, 2000); };
      const fallback = () => { url.select(); try { document.execCommand('copy'); } catch { /* old browsers */ } ok(); };
      if (navigator.clipboard) navigator.clipboard.writeText(me.link).then(ok, fallback); else fallback();
    });
    const gift = el('span', { class: `el-sup__box${done ? ' is-open' : ''}` });
    gift.innerHTML = '<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true" fill="currentColor"><path d="M9 23h30v19a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z"/><path class="el-sup__lid" d="M6 14h36a1.5 1.5 0 0 1 1.5 1.5V21h-39v-5.5A1.5 1.5 0 0 1 6 14z"/><path class="el-sup__ribbon" d="M21.5 23h5v21h-5z"/><path class="el-sup__lid" d="M24 13c-3-8-12-9-12-4 0 3 5 4 12 4zm0 0c3-8 12-9 12-4 0 3-5 4-12 4z"/></svg>';
    const bar = el('div', { class: 'el-sup__bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(goal), 'aria-valuenow': String(Math.min(me.count, goal)), 'aria-label': W.countLabel });
    const fill = el('div', { class: 'el-sup__fill' });
    fill.style.inlineSize = `${pct}%`;
    bar.append(fill);
    card([
      demoBadge(),
      el('h2', { class: 'el-sup__hello' }, [fmt(W.hello, me.name)]),
      el('p', { class: 'el-sup__label' }, [W.yourLink]),
      url,
      el('div', { class: 'el-sup__row' }, [copy]),
      el('a', { class: 'el-sup__go el-sup__go--wa', href: `https://wa.me/?text=${encodeURIComponent(`${W.shareText}\n${me.link}`)}`, target: '_blank', rel: 'noopener' }, [W.share]),
      el('p', { class: 'el-sup__num' }, [el('b', {}, done ? [fmt('%d', me.count)] : [fmt('%d', me.count), el('small', {}, [fmt(W.countOf, goal)])]), W.countLabel]),
      el('div', { class: 'el-sup__track' }, [bar, gift]),
      el('p', { class: `el-sup__next${done ? ' is-done' : ''}` }, [done ? W.goalDone : fmt(W.goalText, goal)]),
      el('button', { type: 'button', class: 'el-sup__link', onclick: () => api.logout().then(() => showJoin('login')) }, [W.logout]),
    ]);
  }

  api.me().then((r) => {
    if (r.ok && r.me) { showMe(r.me); return; }
    if (store.get()) { showCode(); return; }
    showJoin('join');
  });
}
