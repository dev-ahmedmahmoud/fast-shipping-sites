import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { pathAllowed } from '../src/config.js';
import { createApp } from '../src/index.js';

export const DIR = 'clients/tantasportsclubelections';
export const LIVE = 'claude/live';

// --- D1 look-alike on node:sqlite ---
export function makeDb() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(fs.readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const wrap = (q, args = []) => ({
    bind: (...a) => wrap(q, a),
    run: async () => { const r = sql.prepare(q).run(...args); return { meta: { changes: Number(r.changes) } }; },
    first: async () => sql.prepare(q).get(...args) ?? null,
    all: async () => ({ results: sql.prepare(q).all(...args) }),
  });
  return { prepare: (q) => wrap(q), raw: sql };
}

export const ELECTIONS = JSON.stringify({
  election: { title: 'انتخابات النادي', at: '2026-11-20T20:00:00+02:00' },
  list: { name: 'قائمة المهندس حسين داود', slogan: 'تاريخ نحترمه .. ومستقبل نصنعه', crest: 'crest.webp' },
  home: { hero: { title: 'قائمة المهندس حسين داود', slogan: 'تاريخ نحترمه .. ومستقبل نصنعه', image: 'team.webp' }, cta: { text: 'سجّل الآن برقم عضويتك', action: { label: 'سجّل شكوى', href: 'page:complaints' } } },
  support: { words: { hello: 'أهلًا %s', copy: 'نسخ اللينك' }, goal: 5 },
}, null, 2);
export const CLIENT = JSON.stringify({ slug: 'tantasportsclubelections', name: { ar: 'قائمة المهندس حسين داود' }, contact: { phones: ['0100000000'], address: null }, domains: { production: 'husseindawoudlist.com' }, api: { mode: 'demo' } }, null, 2);
export const MD = '---\nid: "team"\nlocale: "ar"\nslug: "team"\ntitle: "تعرّف على مرشحي القائمة"\ntemplate: "candidates"\ndescription: "وصف الصفحة"\n---\n<h2>المؤهلات</h2><ul><li>ليسانس الحقوق.</li></ul><p>أحد أبناء النادي.</p>\n';

export class FakeGH {
  constructor() {
    this.n = 0; this.commits = new Map(); this.branches = new Map();
    const root = this.addCommit(null, new Map([['elections.json', ELECTIONS], ['client.json', CLIENT], ['content/ar/team.md', MD], ['public/favicon.png', 'PNG']]));
    this.branches.set(LIVE, root);
  }
  addCommit(parent, files, message = '') { const sha = `c${++this.n}`; this.commits.set(sha, { parent, files, message }); return sha; }
  async tip(b) { if (!this.branches.has(b)) throw new Error('no branch ' + b); return this.branches.get(b); }
  async readClientFiles(sha) { return new Map([...this.commits.get(sha).files].filter(([k]) => k === 'elections.json' || k === 'client.json' || k.startsWith('content/'))); }
  async makeCommit(base, files, message) {
    for (const rel of Object.keys(files)) if (!pathAllowed(DIR, `${DIR}/${rel}`)) throw new Error('path not allowed');
    const m = new Map(this.commits.get(base).files);
    for (const [k, v] of Object.entries(files)) m.set(k, v);
    return this.addCommit(base, m, message);
  }
  async fastForward(b, sha) {
    let c = sha; while (c) { if (c === this.branches.get(b)) { this.branches.set(b, sha); return true; } c = this.commits.get(c).parent; }
    return false;
  }
  async createBranch(b, sha) { this.branches.set(b, sha); }
  async deleteBranch(b) { if (!b.startsWith('claude/content-')) throw new Error('refused'); this.branches.delete(b); }
  async branchesStartingWith(prefix) { return [...this.branches].filter(([n]) => n.startsWith(prefix)).map(([name, sha]) => ({ name, sha })); }
  async commitMessage(sha) { return this.commits.get(sha).message; }
  ancestors(sha) { const out = []; for (let c = sha; c; c = this.commits.get(c).parent) out.push(c); return out; }
  async compare(base, head) {
    const anc = new Set(this.ancestors(base));
    const headAnc = this.ancestors(head);
    const mergeBase = headAnc.find((c) => anc.has(c));
    const a = this.commits.get(mergeBase).files, b = this.commits.get(head).files;
    const files = [];
    for (const [k, v] of b) if (!a.has(k)) files.push({ path: `${DIR}/${k}`, status: 'added' }); else if (a.get(k) !== v) files.push({ path: `${DIR}/${k}`, status: 'modified' });
    for (const k of a.keys()) if (!b.has(k)) files.push({ path: `${DIR}/${k}`, status: 'removed' });
    return { mergeBase, aheadBy: headAnc.indexOf(mergeBase), files };
  }
  /** Test helper: what the agent does. files: {rel: newText} or a function(oldFiles) -> {rel: newText}. */
  agentPush(branch, files, message = 'Request') {
    const base = this.branches.get(LIVE);
    const m = new Map(this.commits.get(base).files);
    for (const [k, v] of Object.entries(typeof files === 'function' ? files(m) : files)) { if (v === null) m.delete(k); else m.set(k, v); }
    const sha = this.addCommit(base, m, message); this.branches.set(branch, sha); return sha;
  }
  push(files, message = 'site builder') { const sha = this.addCommit(this.branches.get(LIVE), new Map([...this.commits.get(this.branches.get(LIVE)).files, ...Object.entries(files)]), message); this.branches.set(LIVE, sha); return sha; }
  liveFile(rel) { return this.commits.get(this.branches.get(LIVE)).files.get(rel); }
}

export const ADMIN_KEY = 'admin-key-0123456789-abcdefghij';
export const ORIGIN = 'https://app.test';

/** A full app (API + relay) on fakes. Each person gets a real login cookie through an invite link. */
export async function setup() {
  const db = makeDb(), gh = new FakeGH();
  const pushes = [], fired = [];
  const fire = async (env, text) => { fired.push(text); if (fire.fail) throw new Error('down'); return 'https://claude.ai/code/session_test'; };
  const app = createApp({ gh, fire, push: { notify: async (pid) => pushes.push(pid) } });
  const pending = [];
  const env = { DB: db, GITHUB_REPO: 'x/y', LIVE_BRANCH: LIVE, CLIENT_DIR: DIR, SITE_URL: 'https://site.test', ADMIN_KEY };
  const ctx = { waitUntil: (p) => pending.push(p) };
  const settle = async () => { while (pending.length) await pending.shift(); };

  async function req(path, { body, cookie, headers = {}, method } = {}) {
    const init = { method: method || (body !== undefined ? 'POST' : 'GET'), headers: { ...headers } };
    if (body !== undefined) { init.body = JSON.stringify(body); init.headers['content-type'] = 'application/json'; init.headers.origin = ORIGIN; }
    if (cookie) init.headers.cookie = cookie;
    const res = await app.fetch(new Request(ORIGIN + path, init), env, ctx);
    await settle();
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* */ }
    return { status: res.status, json, headers: res.headers };
  }
  const adminCall = (body) => req('/api/admin', { body, headers: { 'x-admin-key': ADMIN_KEY } });
  /** Make the next poll check GitHub now (skip the 10-second throttle) */
  const due = () => db.raw.prepare('UPDATE requests SET checked_at = 0').run();
  const ago = (id, field, sec) => db.raw.prepare(`UPDATE requests SET ${field} = ${field} - ? WHERE id = ?`).run(sec, id);

  async function person(name, role) {
    const a = await adminCall({ action: 'add', name, role });
    const inv = await adminCall({ action: 'invite', personId: a.json.personId });
    const token = new URL(inv.json.link).hash.slice(6);
    const j = await req('/api/join', { body: { token } });
    const cookie = j.headers.get('set-cookie').split(';')[0];
    return {
      id: a.json.personId, name, cookie, token,
      send: async (text) => (await req('/api/requests', { body: { text }, cookie })),
      list: async () => { due(); return (await req('/api/requests', { cookie })).json; },
      get: async (id) => { due(); return (await req('/api/requests', { cookie })).json.requests.find((r) => r.id === id); },
      act: (id, action) => req(`/api/requests/${id}/${action}`, { body: {}, cookie }),
    };
  }
  const client = await person('حسين', 'client');
  const cab = await person('Mona', 'cabinet');
  const audit = () => db.raw.prepare('SELECT * FROM audit ORDER BY id').all();
  const row = (id) => db.raw.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  const branch = (id) => `claude/content-${id.toLowerCase()}`;
  return { db, gh, app, env, ctx, settle, req, adminCall, person, client, cab, audit, row, branch, fired, fire, pushes, ago, due };
}
