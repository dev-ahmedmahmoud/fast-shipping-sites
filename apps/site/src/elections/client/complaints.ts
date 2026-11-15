// The complaints and suggestions form ([data-el-complaints]): the source's rules and
// messages, checked here before anything is sent; then one call through the API adapter.
import type { Api } from './api';
import { digits, validComplaintPhone } from './phone';
import { turnstile } from './turnstile';

interface Settings {
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
  if (api.mode === 'demo') form.querySelector<HTMLElement>('[data-el-demo]')?.removeAttribute('hidden');

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
