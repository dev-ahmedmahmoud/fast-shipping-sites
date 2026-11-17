import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { pathAllowed } from '../src/config.js';
import { hash8 } from '../src/segments.js';
import { createApp } from '../src/index.js';
import { createInvite } from '../src/auth.js';

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
  async deleteBranch(b) { if (!b.startsWith('content/')) throw new Error('refused'); this.branches.delete(b); }
  push(files, message = 'site builder') { const sha = this.addCommit(this.branches.get(LIVE), new Map([...this.commits.get(this.branches.get(LIVE)).files, ...Object.entries(files)]), message); this.branches.set(LIVE, sha); return sha; }
  liveFile(rel) { return this.commits.get(this.branches.get(LIVE)).files.get(rel); }
}

export const refOf = (file, locator) => hash8(`${file}|${locator}`);
export const toolUse = (name, input) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_' + Math.random().toString(36).slice(2), name, input }] });
export const say = (text) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });
export const propose = (ref, new_text) => toolUse('propose_change', { edits: [{ ref, new_text }] });
export const SLOGAN = refOf('elections.json', '/list/slogan');
export const ADMIN_KEY = 'admin-key-0123456789-abcdefghij';
export const ORIGIN = 'https://app.test';

/** A full app (API + bot) on fakes. Each person gets a real login cookie through an invite link. */
export async function setup({ script = [] } = {}) {
  const db = makeDb(), gh = new FakeGH();
  const pushes = [];
  const state = { script };
  const calls = [];
  const callModel = async (params) => { calls.push(params); const n = state.script.shift(); if (!n) throw new Error('script exhausted'); return typeof n === 'function' ? n(params) : n; };
  const app = createApp({ gh, callModel, push: { notify: async (pid) => pushes.push(pid) } });
  const pending = [];
  const env = {
    DB: db, GITHUB_REPO: 'x/y', LIVE_BRANCH: LIVE, CLIENT_DIR: DIR, PREVIEW_URL_TEMPLATE: 'https://content-{id}.site.pages.dev', ADMIN_KEY,
  };
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

  async function person(name, role) {
    const a = await adminCall({ action: 'add', name, role });
    const inv = await adminCall({ action: 'invite', personId: a.json.personId });
    const token = new URL(inv.json.link).hash.slice(6);
    const j = await req('/api/join', { body: { token } });
    const cookie = j.headers.get('set-cookie').split(';')[0];
    return {
      id: a.json.personId, name, cookie, token,
      say: (text) => req('/api/message', { body: { text }, cookie }),
      act: (id, action) => req(`/api/changes/${id}/${action}`, { body: {}, cookie }),
      chat: async () => (await req('/api/messages?after=0', { cookie })).json,
      last: async () => (await req('/api/messages?after=0', { cookie })).json.messages.at(-1),
    };
  }
  const client = await person('حسين', 'client');
  const cab = await person('Mona', 'cabinet');
  const audit = () => db.raw.prepare('SELECT * FROM audit ORDER BY id').all();
  const lastChange = () => db.raw.prepare('SELECT * FROM changes ORDER BY created_at DESC, rowid DESC LIMIT 1').get();
  return { db, gh, app, env, ctx, settle, req, adminCall, person, client, cab, audit, state, calls, pushes, lastChange };
}
