import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { pathAllowed } from '../src/config.js';
import { hash8 } from '../src/segments.js';
import { Bot } from '../src/flow.js';
import { loadStore } from '../src/store.js';

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

// --- in-memory GitHub ---
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
    this.n = 0; this.commits = new Map(); this.branches = new Map(); this.log = [];
    const root = this.addCommit(null, new Map([
      ['elections.json', ELECTIONS], ['client.json', CLIENT], ['content/ar/team.md', MD], ['public/favicon.png', 'PNG'],
    ]));
    this.branches.set(LIVE, root);
  }
  addCommit(parent, files, message = '') { const sha = `c${++this.n}`; this.commits.set(sha, { parent, files, message }); return sha; }
  async tip(b) { if (!this.branches.has(b)) throw new Error('no branch ' + b); return this.branches.get(b); }
  async listFiles(sha) { return [...this.commits.get(sha).files.keys()]; }
  async readFile(rel, sha) { return this.commits.get(sha).files.get(rel); }
  async makeCommit(base, files, message) {
    for (const rel of Object.keys(files)) if (!pathAllowed(DIR, `${DIR}/${rel}`)) throw new Error('path not allowed');
    const m = new Map(this.commits.get(base).files);
    for (const [k, v] of Object.entries(files)) m.set(k, v);
    return this.addCommit(base, m, message);
  }
  async fastForward(b, sha) {
    let c = sha; while (c) { if (c === this.branches.get(b)) { this.branches.set(b, sha); this.log.push(['ff', b, sha]); return true; } c = this.commits.get(c).parent; }
    return false;
  }
  async createBranch(b, sha) { this.branches.set(b, sha); }
  async deleteBranch(b) { if (!b.startsWith('content/')) throw new Error('refused'); this.branches.delete(b); }
  // test helper: someone else (the site builder) pushes to live
  push(files, message = 'site builder') { const sha = this.addCommit(this.branches.get(LIVE), new Map([...this.commits.get(this.branches.get(LIVE)).files, ...Object.entries(files)]), message); this.branches.set(LIVE, sha); return sha; }
  liveFile(rel) { return this.commits.get(this.branches.get(LIVE)).files.get(rel); }
}

export class FakeWA {
  constructor() { this.sent = []; this.failFree = false; }
  async sendText(to, text) { if (this.failFree) { const e = new Error('window'); e.code = 131047; e.status = 400; throw e; } this.sent.push({ to, text, kind: 'text' }); }
  async sendTemplate(to, name, lang, params) { this.sent.push({ to, name, lang, params, kind: 'template' }); }
  to(phone) { return this.sent.filter((s) => s.to === phone); }
}

export const refOf = (file, locator) => hash8(`${file}|${locator}`);
export const toolUse = (name, input) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_' + Math.random().toString(36).slice(2), name, input }] });
export const say = (text) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });

export const CLIENT_PHONE = '201000000001', CAB_PHONE = '201000000002', STRANGER = '201999999999';

export async function setup({ script } = {}) {
  const db = makeDb(), gh = new FakeGH(), wa = new FakeWA();
  const t0 = Math.floor(Date.now() / 1000);
  db.raw.prepare("INSERT INTO people (name, phone, role, lang, created_at, last_inbound_at) VALUES ('حسين','" + CLIENT_PHONE + "','client','ar',?,?)").run(t0, t0);
  db.raw.prepare("INSERT INTO people (name, phone, role, lang, created_at) VALUES ('Mona','" + CAB_PHONE + "','cabinet','en',?)").run(t0);
  const calls = [];
  const state = { script: script || [] };
  const callModel = async (params) => { calls.push(params); const n = state.script.shift(); if (!n) throw new Error('script exhausted'); return typeof n === 'function' ? n(params) : n; };
  const env = {
    DB: db, GITHUB_REPO: 'x/y', LIVE_BRANCH: LIVE, CLIENT_DIR: DIR, PREVIEW_URL_TEMPLATE: 'https://content-{id}.site.pages.dev',
    PHONE_NUMBER_ID: 'PN1', APPROVAL_TEMPLATE: 'change_approval_request', APPROVAL_TEMPLATE_LANG: 'ar', WEBHOOK_VERIFY_TOKEN: 'verify-secret-token', META_APP_SECRET: 'app-secret-xyz',
  };
  const bot = new Bot({ env, db, gh, wa, callModel, loadStore: (tip) => loadStore(gh, tip, DIR) });
  let seq = 0;
  const msg = (from, text, extra = {}) => bot.handle({ from, id: 'wamid.' + (++seq), type: 'text', text, ts: 0, ...extra });
  const audit = () => db.raw.prepare('SELECT * FROM audit ORDER BY id').all();
  return { db, gh, wa, bot, env, msg, audit, state, calls };
}
