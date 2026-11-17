// The rules: who may do what. Everything that changes the site goes through here.
import { LIMITS } from './config.js';
import { audit, nowSec, personById, activeClient, hit, firstSight, addChat, recentChat, newChangeId } from './db.js';
import { runAgent, wrapUserText } from './claude.js';
import { t, REJECT_KEY, STATUS_AR } from './messages.js';
import { toAsciiDigits } from './validate.js';

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');
const SECRETS = ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN', 'ADMIN_KEY', 'VAPID_PRIVATE_JWK'];

/** Typed commands still work (the app also has buttons): "نعم K7M2QX", "YES", "لا K7M2QX", "تراجع K7M2QX". */
export function parseCommand(raw) {
  const s = toAsciiDigits(raw).trim().replace(/[.!؟?]+$/, '').replace(/\s+/g, ' ');
  const m = /^(yes|y|ok|نعم|موافق|موافقه|موافقة|اوافق|أوافق|ايوه|أيوه|تمام|انشر)(?: ([A-Za-z0-9]{4,8}))?$/i.exec(s);
  if (m) return { cmd: 'approve', id: m[2]?.toUpperCase() };
  const n = /^(no|n|لا|الغاء|إلغاء|رفض|ارفض)(?: ([A-Za-z0-9]{4,8}))?$/i.exec(s);
  if (n) return { cmd: 'reject', id: n[2]?.toUpperCase() };
  const u = /^(undo|تراجع|ارجاع|إرجاع)(?: ([A-Za-z0-9]{4,8}))?$/i.exec(s);
  if (u) return { cmd: 'undo', id: u[2]?.toUpperCase() };
  if (/^(help|مساعدة|مساعده|\?)$/i.test(s)) return { cmd: 'help' };
  return null;
}

export class Bot {
  constructor(app) { Object.assign(this, app); }   // { env, db, gh, push, callModel, loadStore }

  redact(s) {
    let out = String(s);
    for (const k of SECRETS) if (this.env[k] && this.env[k].length > 6) out = out.split(this.env[k]).join('[secret]');
    return out;
  }

  /** Add a line to someone's chat. alert = also send a phone alert (for things they must see). */
  async post(person, kind, text, changeId = null, alert = false) {
    const id = await addChat(this.db, person.id, kind, text, changeId);
    if (alert && this.push) await this.push.notify(person.id);
    return id;
  }

  // ---------- a chat message (from the queue) ----------
  async handleChat(chatId) {
    const { db, env } = this;
    if (!(await firstSight(db, `chat:${chatId}`))) return;               // queue delivered it twice
    const row = await db.prepare("SELECT * FROM chat WHERE id = ? AND kind = 'user'").bind(chatId).first();
    if (!row) return;
    const person = await db.prepare('SELECT * FROM people WHERE id = ? AND active = 1').bind(row.person_id).first();
    if (!person) return;
    try {
      const c = parseCommand(row.text);
      if (c?.cmd === 'help') return void (await this.post(person, 'reply', t('help', { client: (await activeClient(db))?.name || '' })));
      if (c) return void (await this.command(person, c));
      await this.request(person, row);
    } catch (e) {
      await audit(db, { actor: person.name, event: 'error', detail: this.redact(e.stack || e.message).slice(0, 800) });
      await this.post(person, 'reply', t('busy'));
    }
  }

  async command(person, c) {
    const { db } = this;
    const client = await activeClient(db);
    if ((c.cmd === 'approve' || c.cmd === 'undo') && person.role !== 'client') {
      await audit(db, { actor: person.name, event: `${c.cmd}_denied`, changeId: c.id || null, detail: 'not the client' });
      return this.post(person, 'reply', t('onlyClient', { client: client?.name || '' }));
    }
    let id = c.id;
    if (!id && c.cmd === 'approve') {
      const w = await db.prepare("SELECT id FROM changes WHERE status = 'pending' AND expires_at > ? LIMIT 2").bind(nowSec()).all();
      if (w.results.length === 1) id = w.results[0].id;                    // one change waiting: plain YES approves it
      else return this.post(person, 'reply', w.results.length ? t('needId', { example: w.results[0].id }) : t('nothingWaiting'));
    }
    if (!id) return this.post(person, 'reply', t('needId', { example: 'K7M2QX' }));
    const r = await this.act(person, c.cmd, id);
    if (!r.ok) await this.post(person, 'reply', r.message);
  }

  /** Buttons and typed commands both end here. Returns { ok, message }. */
  async act(person, action, id) {
    const { db } = this;
    const client = await activeClient(db);
    if ((action === 'approve' || action === 'undo') && person.role !== 'client') {
      await audit(db, { actor: person.name, event: `${action}_denied`, changeId: id, detail: 'not the client' });
      return { ok: false, message: t('onlyClient', { client: client?.name || '' }) };
    }
    const ch = await db.prepare('SELECT * FROM changes WHERE id = ?').bind(id).first();
    if (!ch) return { ok: false, message: t('unknownChange', { id }) };
    if (action === 'approve') return this.approve(person, ch);
    if (action === 'undo') return this.undo(person, ch);
    if (action === 'reject') return this.reject(person, ch);
    return { ok: false, message: t('rejectOther') };
  }

  async approve(client, ch) {
    const { db } = this;
    if (ch.status === 'pending' && ch.expires_at <= nowSec()) await this.expireOne(ch);
    const claim = await db.prepare("UPDATE changes SET status = 'applying', applying_op = 'approve', applying_since = ?, approver_id = ?, decided_at = ? WHERE id = ? AND status = 'pending' AND expires_at > ?")
      .bind(nowSec(), client.id, nowSec(), ch.id, nowSec()).run();
    if (claim.meta.changes !== 1) {
      const cur = await db.prepare('SELECT status FROM changes WHERE id = ?').bind(ch.id).first();
      return { ok: false, message: t('notPending', { id: ch.id, status: STATUS_AR[cur.status] }) };
    }
    const requester = await personById(db, ch.requester_id);
    const edits = JSON.parse(ch.edits_json);
    let sha;
    try {
      sha = await this.commitLive(edits, () => this.message('Text change', ch.id, edits, requester.name, client.name));
    } catch (e) {
      const stale = e.code === 'stale';
      await db.prepare("UPDATE changes SET status = 'failed' WHERE id = ?").bind(ch.id).run();
      await audit(db, { actor: client.name, event: stale ? 'approve_stale' : 'approve_error', changeId: ch.id, detail: this.redact(e.message) });
      await this.dropPreview(ch);
      return { ok: false, message: stale ? t('stale', { id: ch.id }) : t('busy') };
    }
    await db.prepare("UPDATE changes SET status = 'live', live_commit = ? WHERE id = ?").bind(sha, ch.id).run();
    await audit(db, { actor: client.name, event: 'approved_live', changeId: ch.id, detail: `requested by ${requester.name}`, commit: sha });
    await this.dropPreview(ch);
    await this.post(client, 'notice', t('live', { id: ch.id }), ch.id);
    if (requester.id !== client.id) await this.post(requester, 'notice', t('liveRequester', { id: ch.id, client: client.name }), ch.id, true);
    return { ok: true, message: t('live', { id: ch.id }) };
  }

  async reject(person, ch) {
    const { db } = this;
    if (person.role !== 'client' && ch.requester_id !== person.id) {
      return { ok: false, message: t('onlyClient', { client: (await activeClient(db))?.name || '' }) };
    }
    const r = await db.prepare("UPDATE changes SET status = 'rejected', decided_at = ?, approver_id = ? WHERE id = ? AND status = 'pending'")
      .bind(nowSec(), person.id, ch.id).run();
    if (r.meta.changes !== 1) return { ok: false, message: t('notPending', { id: ch.id, status: STATUS_AR[ch.status] }) };
    await audit(db, { actor: person.name, event: 'rejected', changeId: ch.id });
    await this.dropPreview(ch);
    await this.post(person, 'notice', t('rejected', { id: ch.id }), ch.id);
    const other = person.id === ch.requester_id ? await activeClient(db) : await personById(db, ch.requester_id);
    if (other && other.id !== person.id) await this.post(other, 'notice', t('rejectedOther', { id: ch.id, who: person.name }), ch.id, person.role === 'client');
    return { ok: true, message: t('rejected', { id: ch.id }) };
  }

  async undo(client, ch) {
    const { db } = this;
    const claim = await db.prepare("UPDATE changes SET status = 'applying', applying_op = 'undo', applying_since = ? WHERE id = ? AND status = 'live'").bind(nowSec(), ch.id).run();
    if (claim.meta.changes !== 1) return { ok: false, message: t('notLive', { id: ch.id }) };
    const requester = await personById(db, ch.requester_id);
    const inverse = JSON.parse(ch.edits_json).map((e) => ({ ...e, old: e.new, new: e.old }));
    try {
      const sha = await this.commitLive(inverse, () => this.message('Undo text change', ch.id, inverse, requester.name, client.name));
      await db.prepare("UPDATE changes SET status = 'reverted', revert_commit = ? WHERE id = ?").bind(sha, ch.id).run();
      await audit(db, { actor: client.name, event: 'undone', changeId: ch.id, commit: sha });
      await this.post(client, 'notice', t('undone', { id: ch.id }), ch.id);
      if (requester.id !== client.id) await this.post(requester, 'notice', t('undoneOther', { id: ch.id, client: client.name }), ch.id, true);
      return { ok: true, message: t('undone', { id: ch.id }) };
    } catch (e) {
      await db.prepare("UPDATE changes SET status = 'live' WHERE id = ?").bind(ch.id).run();
      await audit(db, { actor: client.name, event: e.code === 'stale' ? 'undo_stale' : 'undo_error', changeId: ch.id, detail: this.redact(e.message) });
      return { ok: false, message: e.code === 'stale' ? t('undoStale', { id: ch.id }) : t('busy') };
    }
  }

  message(title, id, edits, requesterName, approverName) {
    const clean = (s) => oneLine(s).replace(/[<>]/g, '');
    const pages = [...new Set(edits.map((e) => e.page.label.en))].slice(0, 3).join(', ');
    const lines = edits.map((e) => `- ${clean(e.page.label.en)}: "${clip(clean(e.old), 100)}" -> "${clip(clean(e.new), 100)}"`).join('\n');
    return `${title} ${id}: ${clean(pages)}\n\n${lines}\n\nRequested-by: ${clean(requesterName)}\nApproved-by: ${clean(approverName)}\nChange-id: ${id}\n`;
  }

  /** Re-read the newest live tip, re-check the old text is still there, commit, fast-forward. Retries if the branch moved. */
  async commitLive(edits, makeMessage) {
    const { gh, env } = this;
    for (let attempt = 0; attempt < 4; attempt++) {
      const tip = await gh.tip(env.LIVE_BRANCH);
      const store = await this.snapshot(tip);
      const plan = store.build(edits);
      if (!plan.ok) { const e = new Error(`cannot apply: ${plan.code}`); e.code = plan.code === 'structure' ? 'structure' : 'stale'; throw e; }
      const sha = await gh.makeCommit(tip, plan.files, makeMessage());
      if (await gh.fastForward(env.LIVE_BRANCH, sha)) return sha;
    }
    throw new Error('branch kept moving');
  }

  async snapshot(tip) {
    const store = await this.loadStore(tip);
    if (store.skipped?.length) await audit(this.db, { actor: 'bot', event: 'file_skipped', detail: store.skipped.join('; ') });
    return store;
  }

  async dropPreview(ch) {
    if (!ch.preview_branch) return;
    try { await this.gh.deleteBranch(ch.preview_branch); } catch (e) { await audit(this.db, { actor: 'bot', event: 'preview_cleanup_failed', changeId: ch.id, detail: this.redact(e.message) }); }
  }

  // ---------- a normal request ----------
  async request(person, row) {
    const { db, env } = this;
    const text = row.text;
    const pend = await db.prepare("SELECT COUNT(*) n FROM changes WHERE requester_id = ? AND status = 'pending'").bind(person.id).first();
    if (pend.n >= LIMITS.pendingPerPerson) return this.post(person, 'reply', t('tooManyPending', { n: pend.n }));
    if ((await hit(db, `claude:${person.id}`, 86400, LIMITS.claudeCallsPerDay)).over) return this.post(person, 'reply', t('slowDown'));

    const history = await recentChat(db, person.id, row.id, LIMITS.convoMinutes);
    const requestTexts = [...history.filter((h) => h.role === 'user').map((h) => h.content), text];
    const tip = await this.gh.tip(env.LIVE_BRANCH);
    const store = await this.snapshot(tip);
    const out = await runAgent({
      callModel: this.callModel, store,
      history: history.map((h) => (h.role === 'user' ? { role: 'user', content: wrapUserText(person.name, person.role, h.content) } : h)),
      userMessage: wrapUserText(person.name, person.role, text), requestTexts,
    });

    if (out.kind === 'text') return this.post(person, 'reply', clip(out.text, 700));
    if (out.kind === 'refuse') {
      await audit(db, { actor: person.name, event: 'refused_not_text', detail: text });
      return this.post(person, 'reply', t('designRefused'));
    }
    if (out.kind === 'invalid') {
      await audit(db, { actor: person.name, event: 'refused_by_checks', detail: `${out.code}: ${text}` });
      return this.post(person, 'reply', t(REJECT_KEY[out.code] || 'rejectOther'));
    }
    return this.propose(person, out.plan, tip);
  }

  async propose(person, plan, tip) {
    const { db, env, gh } = this;
    const now = nowSec();
    let id;
    for (let i = 0; i < 5 && !id; i++) {
      const cand = newChangeId();
      const r = await db.prepare("INSERT OR IGNORE INTO changes (id, status, requester_id, edits_json, created_at, expires_at) VALUES (?,'pending',?,?,?,?)")
        .bind(cand, person.id, JSON.stringify(plan.edits), now, now + LIMITS.pendingHours * 3600).run();
      if (r.meta.changes === 1) id = cand;
    }
    if (!id) throw new Error('no free change id');
    const branch = `content/${id.toLowerCase()}`;
    try {
      const sha = await gh.makeCommit(tip, plan.files, `Preview of change ${id} (not live)\n\nChange-id: ${id}\n`);
      await gh.createBranch(branch, sha);
    } catch (e) {
      await db.prepare("UPDATE changes SET status = 'failed' WHERE id = ?").bind(id).run();
      await audit(db, { actor: person.name, event: 'preview_error', changeId: id, detail: this.redact(e.message) });
      throw e;
    }
    const route = plan.edits[0].page.route.replace(/^\//, '');
    const link = `${env.PREVIEW_URL_TEMPLATE.replace('{id}', id.toLowerCase())}/${route}`;
    await db.prepare('UPDATE changes SET preview_branch = ?, preview_url = ? WHERE id = ?').bind(branch, link, id).run();
    await audit(db, { actor: person.name, event: 'proposed', changeId: id, detail: JSON.stringify(plan.edits.map((e) => ({ f: e.file, l: e.locator, old: clip(e.old, 200), new: clip(e.new, 200) }))) });

    const client = await activeClient(db);
    if (person.role === 'client' || !client) {
      await this.post(person, 'notice', t('proposalOwn', { id }), id);
    } else {
      await this.post(person, 'notice', t('proposalCabinet', { id, client: client.name }), id);
      await this.post(client, 'notice', t('approvalRequest', { requester: person.name, id }), id, true);
    }
  }

  /** What one person sees on a change card, and which buttons they get. */
  view(ch, viewer, names) {
    const isClient = viewer.role === 'client';
    const pending = ch.status === 'pending' && ch.expires_at > nowSec();
    return {
      id: ch.id, status: ch.status, statusText: STATUS_AR[ch.status], requester: names.get(ch.requester_id) || '',
      edits: JSON.parse(ch.edits_json).map((e) => ({ page: e.page.label.ar, old: e.old, new: e.new })),
      preview: pending ? ch.preview_url : null, expiresAt: ch.expires_at,
      can: { approve: isClient && pending, reject: pending && (isClient || ch.requester_id === viewer.id), undo: isClient && ch.status === 'live' },
    };
  }

  // ---------- hourly job ----------
  async expireOne(ch) {
    const r = await this.db.prepare("UPDATE changes SET status = 'expired', decided_at = ? WHERE id = ? AND status = 'pending'").bind(nowSec(), ch.id).run();
    if (r.meta.changes !== 1) return;
    await audit(this.db, { actor: 'bot', event: 'expired', changeId: ch.id });
    await this.dropPreview(ch);
    const req = await personById(this.db, ch.requester_id);
    if (req) await this.post(req, 'notice', t('expired', { id: ch.id }), ch.id, true);
  }
  async expireAll() {
    const r = await this.db.prepare("SELECT * FROM changes WHERE status = 'pending' AND expires_at <= ?").bind(nowSec()).all();
    for (const ch of r.results) await this.expireOne(ch);
    return r.results.length;
  }
  /** If the Worker died in the middle of publish/undo, set the status to what the live site really shows. */
  async recoverStuck() {
    const { db, env } = this;
    const r = await db.prepare("SELECT * FROM changes WHERE status = 'applying' AND applying_since < ?").bind(nowSec() - 900).all();
    if (!r.results.length) return 0;
    const store = await this.snapshot(await this.gh.tip(env.LIVE_BRANCH));
    for (const ch of r.results) {
      const edits = JSON.parse(ch.edits_json);
      const newIsLive = store.build(edits.map((e) => ({ ...e, old: e.new, new: e.old }))).ok;
      const status = ch.applying_op === 'approve' ? (newIsLive ? 'live' : 'failed') : (newIsLive ? 'live' : 'reverted');
      await db.prepare("UPDATE changes SET status = ? WHERE id = ? AND status = 'applying'").bind(status, ch.id).run();
      await audit(db, { actor: 'bot', event: 'stuck_recovered', changeId: ch.id, detail: `${ch.applying_op} -> ${status}` });
      if (ch.applying_op === 'approve') await this.dropPreview(ch);
    }
    return r.results.length;
  }
}
