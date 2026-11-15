// The one door to the election backend. Two modes, chosen in client.json "api.mode":
//   "demo"  (previews): everything happens in this browser (localStorage). Nothing is sent
//           anywhere; the WhatsApp code is shown on screen, labelled as a preview.
//   "live"  calls the routes documented in clients/<slug>/API.md under "api.base" (default /api/).
// Every call resolves (never rejects) to a Result; failures carry `code` (the key of the
// matching message in the supporters' words) and, for one field, `field`.

export interface Me {
  name: string;
  /** The supporter's personal link (…?r=xxxxxxxx). */
  link: string;
  /** Visits that came in through the link. */
  count: number;
  goal: number;
}

export interface Result {
  ok: boolean;
  code?: string;
  field?: string;
  message?: string;
  /** Pending-code token (join and password reset). */
  token?: string;
  /** Seconds before another code may be asked for. */
  gap?: number;
  me?: Me;
  /** Demo only: the code a real backend would have sent on WhatsApp. */
  demoCode?: string;
}

export interface ApiConfig {
  mode: 'demo' | 'live';
  base: string;
  /** Storage key for demo mode, one per site so samples don't share accounts. */
  key: string;
  /** The page a supporter's link points to (absolute URL, resolved against the current address). */
  home: string;
  goal: number;
  words: Record<string, string>;
  fmt: (s: string, ...a: (string | number)[]) => string;
}

export interface Api {
  mode: 'demo' | 'live';
  register(d: Record<string, string>): Promise<Result>;
  verify(d: Record<string, string>): Promise<Result>;
  resend(d: Record<string, string>): Promise<Result>;
  login(d: Record<string, string>): Promise<Result>;
  forgot(d: Record<string, string>): Promise<Result>;
  me(): Promise<Result>;
  logout(): Promise<Result>;
  /** A visit that arrived through a supporter's link. */
  hit(code: string): Promise<Result>;
  complaint(form: FormData): Promise<Result>;
}

export function createApi(c: ApiConfig): Api {
  return c.mode === 'live' ? live(c) : demo(c);
}

// ------------------------------------------------------------------ live
function live(c: ApiConfig): Api {
  const base = c.base.replace(/\/?$/, '/');
  const net = (): Result => ({ ok: false, message: c.words.errNetwork });
  const call = (path: string, body?: Record<string, unknown> | FormData): Promise<Result> => {
    const init: RequestInit = { credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (body instanceof FormData) {
      init.method = 'POST';
      init.body = body;
    } else if (body) {
      init.method = 'POST';
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    // The server may answer with a code only; the visitor then reads that code's message.
    const withText = (r: Result): Result => (r.ok || r.message ? r : { ...r, message: (r.code && c.words[r.code]) || c.words.errNetwork });
    return fetch(base + path, init).then((r) => r.json()).then(withText).catch(net);
  };
  return {
    mode: 'live',
    register: (d) => call('supporter/register', d),
    verify: (d) => call('supporter/verify', d),
    resend: (d) => call('supporter/resend', d),
    login: (d) => call('supporter/login', d),
    forgot: (d) => call('supporter/forgot', d),
    me: () => call('supporter/me'),
    logout: () => call('supporter/logout', {}),
    hit: (code) => call('supporter/hit', { c: code }),
    complaint: (form) => call('complaints', form),
  };
}

// ------------------------------------------------------------------ demo
interface Account { name: string; membership: string; mobile: string; pass: string; ref: string }
interface Pending { mobile: string; code: string; reset: boolean; until: number; sentAt: number; data?: Partial<Account> }
interface Db { accounts: Record<string, Account>; pending: Record<string, Pending>; session: string | null; hits: Record<string, number> }

const CODE_LIFE = 5 * 60 * 1000;
const GAP = 60;

function demo(c: ApiConfig): Api {
  const W = c.words;
  const load = (): Db => {
    try {
      const v = JSON.parse(localStorage.getItem(c.key) || 'null');
      if (v && v.accounts) return v as Db;
    } catch { /* storage blocked: start empty */ }
    return { accounts: {}, pending: {}, session: null, hits: {} };
  };
  const save = (db: Db) => { try { localStorage.setItem(c.key, JSON.stringify(db)); } catch { /* private mode */ } };
  const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 350));
  const fail = (code: string, field?: string): Result => ({ ok: false, code, field, message: W[code] ?? W.errNetwork });
  const rand = (n: number, set: string) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join('');
  const sixDigits = () => rand(6, '0123456789');
  // A stand-in for a password hash: a demo stores nothing worth protecting, but never keeps it as typed.
  const hash = async (s: string) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`el-demo:${s}`));
    return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
  };
  const meOf = (db: Db, a: Account): Me => {
    const u = new URL(c.home);
    u.searchParams.set('r', a.ref);
    return { name: a.name, link: u.toString(), count: db.hits[a.ref] ?? 0, goal: c.goal };
  };
  const sent = (code: string): string => `${W.codeSent}\n${c.fmt(W.demoCode ?? '%s', code)}`;
  const mobileOk = (m: string) => /^\+\d{8,15}$/.test(m || '');

  return {
    mode: 'demo',
    async register(d) {
      if (!/^\d{6}$/.test(d.membership || '')) return later(fail('badMembership', 'membership'));
      if (!(d.name || '').trim()) return later(fail('badName', 'name'));
      if (!mobileOk(d.mobile)) return later(fail('badMobile', 'mobile'));
      if ((d.password || '').length < 8) return later(fail('badPassword', 'password'));
      const db = load();
      if (db.accounts[d.mobile]) return later(fail('takenMobile', 'mobile'));
      if (Object.values(db.accounts).some((a) => a.membership === d.membership)) return later(fail('takenMember', 'membership'));
      const token = rand(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
      const code = sixDigits();
      db.pending[token] = { mobile: d.mobile, code, reset: false, until: Date.now() + CODE_LIFE, sentAt: Date.now(),
        data: { name: d.name.trim(), membership: d.membership, mobile: d.mobile, pass: await hash(d.password) } };
      save(db);
      return later({ ok: true, token, gap: GAP, message: sent(code), demoCode: code });
    },
    async verify(d) {
      const db = load();
      const p = db.pending[d.token || ''];
      if (!p || p.until < Date.now()) return later(fail('codeDead', 'code'));
      if ((d.code || '') !== p.code) return later(fail('badCode', 'code'));
      if (p.reset) {
        if ((d.password || '').length < 8) return later(fail('badPassword', 'password'));
        const a = db.accounts[p.mobile];
        if (!a) return later(fail('noAccount'));
        a.pass = await hash(d.password);
      } else {
        const ref = rand(8, 'abcdefghijklmnopqrstuvwxyz0123456789');
        db.accounts[p.mobile] = { ...(p.data as Account), ref };
      }
      delete db.pending[d.token];
      db.session = p.mobile;
      save(db);
      return later({ ok: true, me: meOf(db, db.accounts[p.mobile]) });
    },
    async resend(d) {
      const db = load();
      const p = db.pending[d.token || ''];
      if (!p || p.until < Date.now()) return later(fail('codeDead'));
      if (Date.now() - p.sentAt < GAP * 1000) return later(fail('tooSoon'));
      p.code = sixDigits();
      p.sentAt = Date.now();
      p.until = Date.now() + CODE_LIFE;
      save(db);
      return later({ ok: true, gap: GAP, message: sent(p.code), demoCode: p.code });
    },
    async login(d) {
      const db = load();
      const a = db.accounts[d.mobile];
      if (!a) return later(fail('noAccount', 'mobile'));
      if (a.pass !== (await hash(d.password || ''))) return later(fail('badLogin', 'password'));
      db.session = a.mobile;
      save(db);
      return later({ ok: true, me: meOf(db, a) });
    },
    async forgot(d) {
      if (!mobileOk(d.mobile)) return later(fail('badMobile', 'mobile'));
      const db = load();
      if (!db.accounts[d.mobile]) return later(fail('noAccount', 'mobile'));
      const token = rand(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
      const code = sixDigits();
      db.pending[token] = { mobile: d.mobile, code, reset: true, until: Date.now() + CODE_LIFE, sentAt: Date.now() };
      save(db);
      return later({ ok: true, token, gap: GAP, message: sent(code), demoCode: code });
    },
    async me() {
      const db = load();
      const a = db.session ? db.accounts[db.session] : null;
      return a ? { ok: true, me: meOf(db, a) } : { ok: false };
    },
    async logout() {
      const db = load();
      db.session = null;
      save(db);
      return { ok: true };
    },
    async hit(code) {
      const db = load();
      db.hits[code] = (db.hits[code] ?? 0) + 1;
      save(db);
      return { ok: true };
    },
    async complaint() {
      return later({ ok: true });
    },
  };
}
