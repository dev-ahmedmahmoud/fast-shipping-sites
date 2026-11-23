// The app's rules. A request goes to the site agent; the agent pushes a branch; THIS code checks the branch
// (text only, the person's own words) and only then puts the change on the live site.
import { LIMITS, pathAllowed } from './config.js';
import { audit, nowSec, personById, hit, newId } from './db.js';
import { fireRoutine, payload } from './routine.js';
import { buildState } from './pages.js';
import { diffFile, diffMd, kindOfFile, indexFile, applyEdits, verifyEdits } from './segments.js';
import { Store } from './store.js';
import { checkNewText } from './validate.js';
import { t, STATUS_AR, CHECK_MSG } from './messages.js';

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');
const SECRETS = ['GITHUB_TOKEN', 'ADMIN_KEY', 'VAPID_PRIVATE_JWK', 'ROUTINE_TOKEN', 'CF_PAGES_TOKEN'];
const IN_PROGRESS = ['working', 'checking', 'building', 'reverting'];
const branchOf = (id) => `claude/content-${id.toLowerCase()}`;
class CheckError extends Error { constructor(code) { super(code); this.code = code; } }

export class Relay {
  constructor(app) { Object.assign(this, app); }   // { env, db, gh, push, loadStore, fire? }

  redact(s) {
    let out = String(s);
    for (const k of SECRETS) if (this.env[k] && this.env[k].length > 6) out = out.split(this.env[k]).join('[secret]');
    return out;
  }
  async set(req, fields) {
    const keys = Object.keys(fields);
    await this.db.prepare(`UPDATE requests SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
      .bind(...keys.map((k) => fields[k]), nowSec(), req.id).run();
    Object.assign(req, fields);
  }
  async notify(req) { if (this.push) await this.push.notify(req.person_id); }

  // ---------- send ----------
  async submit(person, text) {
    const { db, env } = this;
    const busy = await db.prepare(`SELECT COUNT(*) n FROM requests WHERE person_id = ? AND status IN ('working','checking','building') AND created_at > ?`).bind(person.id, nowSec() - 3600).first();
    if (busy.n >= LIMITS.inProgressPerPerson) return { ok: false, message: t('tooMany') };
    if ((await hit(db, `req:${person.id}`, 3600, LIMITS.requestsPerHour)).over || (await hit(db, 'fire', 3600, LIMITS.firesPerHour)).over) return { ok: false, message: t('slowDown') };
    const req = { id: newId(), person_id: person.id, text };
    await db.prepare("INSERT INTO requests (id, person_id, text, status, created_at, updated_at) VALUES (?,?,?,'working',?,?)").bind(req.id, person.id, text, nowSec(), nowSec()).run();
    await audit(db, { actor: person.name, event: 'request', changeId: req.id, detail: text });
    try {
      const url = await (this.fire || fireRoutine)(env, payload(req, person, env));
      await this.set(req, { session_url: url, checked_at: nowSec() });
      await audit(db, { actor: 'bot', event: 'agent_started', changeId: req.id, detail: url });
    } catch (e) {
      await this.set(req, { status: 'failed', message: t('sendFailed') });
      await audit(db, { actor: 'bot', event: 'agent_start_failed', changeId: req.id, detail: this.redact(e.message) });
    }
    return { ok: true, id: req.id };
  }

  // ---------- stop / undo ----------
  canAbort(req, person) { return req.status === 'working' && (person.role === 'client' || req.person_id === person.id); }
  canRevert(req, person) { return ['done', 'building'].includes(req.status) && !!req.files_json && (person.role === 'client' || req.person_id === person.id); }

  async abort(person, id) {
    const req = await this.db.prepare('SELECT * FROM requests WHERE id = ?').bind(id).first();
    if (!req || !this.canAbort(req, person)) return { ok: false, message: req ? t('cannotAbort') : t('notAllowed') };
    const r = await this.db.prepare("UPDATE requests SET status = 'aborted', message = ?, updated_at = ? WHERE id = ? AND status = 'working'").bind(t('aborted'), nowSec(), id).run();
    if (r.meta.changes !== 1) return { ok: false, message: t('cannotAbort') };     // the checker already took it
    await audit(this.db, { actor: person.name, event: 'aborted', changeId: id });
    await this.cleanBranches(id);
    return { ok: true, message: t('aborted') };
  }

  async revert(person, id) {
    const { db } = this;
    const req = await db.prepare('SELECT * FROM requests WHERE id = ?').bind(id).first();
    if (!req || !req.files_json || !this.canRevert(req, person)) return { ok: false, message: t('cannotRevert') };
    const was = req.status;
    const claim = await db.prepare("UPDATE requests SET status = 'reverting', updated_at = ? WHERE id = ? AND status = ?").bind(nowSec(), id, was).run();
    if (claim.meta.changes !== 1) return { ok: false, message: t('cannotRevert') };
    const requester = await personById(db, req.person_id);
    try {
      const sha = await this.commitLive(JSON.parse(req.files_json), 'back', JSON.parse(req.edits_json), `Undo text request ${id}`, requester.name, person.name);
      await this.set(req, { status: 'reverted', revert_commit: sha, message: t('reverted') });
      await audit(db, { actor: person.name, event: 'reverted', changeId: id, commit: sha });
      if (req.person_id !== person.id) await this.notify(req);
      return { ok: true, message: t('reverted') };
    } catch (e) {
      await this.set(req, { status: was });
      await audit(db, { actor: person.name, event: e.code === 'stale' ? 'revert_stale' : 'revert_error', changeId: id, detail: this.redact(e.message) });
      return { ok: false, message: e.code === 'stale' ? t('revertStale') : t('error') };
    }
  }

  // ---------- follow a request (called by the app's polling and by the 2-minute cron) ----------
  async advance(req) {
    const now = nowSec();
    if (req.status === 'working') {
      if (now - req.checked_at < LIMITS.checkEverySec) return;
      await this.set(req, { checked_at: now });
      const found = await this.gh.branchesStartingWith(branchOf(req.id));
      const refused = found.find((b) => b.name === `${branchOf(req.id)}-refused`);
      const done = found.find((b) => b.name === branchOf(req.id));
      if (!refused && !done) {
        if (now - req.created_at > LIMITS.agentTimeoutSec) { await this.finish(req, 'failed', t('timeout'), 'agent_timeout'); }
        return;
      }
      const claim = await this.db.prepare("UPDATE requests SET status = 'checking', updated_at = ? WHERE id = ? AND status = 'working'").bind(now, req.id).run();
      if (claim.meta.changes !== 1) return;                                   // stopped, or another check took it
      req.status = 'checking';
      if (done && !refused) return this.publish(req, done);
      const why = clip(oneLine(await this.gh.commitMessage(refused.sha)).replace(/[<>]/g, ''), 300);
      await this.finish(req, 'refused', why || t('textOnly'), 'agent_refused');
      return this.cleanBranches(req.id);
    }
    if (req.status === 'building') {
      const st = await buildState(this.env, req.building_since);
      if (st === 'success') await this.finish(req, 'done', null, 'site_updated');
      else if (st === 'failure') await this.finish(req, 'failed', t('buildFailed'), 'build_failed');
      return;
    }
    if (req.status === 'aborted' && now - req.updated_at < 3 * 3600 && now - req.checked_at >= 300) {
      await this.set(req, { checked_at: now });
      await this.cleanBranches(req.id);                                        // the agent may push after a stop
    }
  }

  async finish(req, status, message, event) {
    await this.set(req, { status, message });
    await audit(this.db, { actor: 'bot', event, changeId: req.id, detail: message });
    await this.notify(req);
  }

  /** The gate: only text in the client's text files (plus deleting whole points), the person's own words. Then put it live. */
  async publish(req, branch) {
    const { db } = this;
    let res;
    try { res = await this.checkBranch(req, branch.sha); } catch (e) {
      const code = e.code || 'type';
      await this.finish(req, 'refused', t(CHECK_MSG[code] || 'textOnly'), 'refused_by_checks');
      await audit(db, { actor: 'bot', event: 'check_detail', changeId: req.id, detail: this.redact(e.message) });
      return this.cleanBranches(req.id);
    }
    const requester = await personById(db, req.person_id);
    const agentNote = clip(oneLine((await this.gh.commitMessage(branch.sha)).split('\n').filter((l) => /^(NOTE|ملاحظة)\s*:/.test(l.trim())).map((l) => l.replace(/^\s*(NOTE|ملاحظة)\s*:\s*/, '')).join(' ')).replace(/[<>]/g, ''), 300);
    const skippedNote = res.skipped.length ? `${t('partSkipped')} ${res.skipped.map((x) => `«${clip(x.old, 60)}»`).join('، ')} — ${t(CHECK_MSG[res.skipped[0].code] || 'textOnly')}` : '';
    const note = [agentNote, skippedNote].filter(Boolean).join('\n') || null;
    try {
      const sha = await this.commitLive(res.files, 'forward', res.display, `Text request ${req.id}`, requester.name, null);
      await this.set(req, { status: 'building', edits_json: JSON.stringify(res.display), files_json: JSON.stringify(res.files), live_commit: sha, building_since: nowSec(), message: note });
      await audit(db, { actor: requester.name, event: 'published', changeId: req.id, commit: sha, detail: JSON.stringify(res.display.map((e) => ({ op: e.op, old: clip(e.old, 120), new: e.new && clip(e.new, 120) }))) });
      if (res.skipped.length) await audit(db, { actor: 'bot', event: 'check_detail', changeId: req.id, detail: `skipped: ${res.skipped.map((x) => x.code).join(', ')}` });
    } catch (e) {
      await this.finish(req, 'failed', e.code === 'stale' ? t('stale') : t('error'), 'publish_failed');
      await audit(db, { actor: 'bot', event: 'check_detail', changeId: req.id, detail: this.redact(e.message) });
    }
    await this.cleanBranches(req.id);
  }

  /**
   * Returns { files: [{ rel, before, after, edits, deletes }], display: [{ page, op, old, new }], skipped: [{ code, old }] }.
   * Structure problems throw (nothing is published). A single bad text is skipped; the rest goes live.
   */
  async checkBranch(req, headSha) {
    const { gh, env } = this;
    const live = await gh.tip(env.LIVE_BRANCH);
    const cmp = await gh.compare(live, headSha);
    if (cmp.aheadBy < 1) throw new CheckError('no-change');
    if (cmp.aheadBy > 5) throw new CheckError('too-many-commits');
    const prefix = env.CLIENT_DIR + '/';
    const rels = [];
    for (const f of cmp.files) {
      if (!pathAllowed(env.CLIENT_DIR, f.path) || !kindOfFile(f.path.slice(prefix.length))) throw new CheckError('not-text-file');
      if (f.status === 'added') throw new CheckError('file-added');
      if (f.status !== 'modified') throw new CheckError('file-removed');
      rels.push(f.path.slice(prefix.length));
    }
    if (!rels.length) throw new CheckError('no-change');
    const [base, head] = await Promise.all([gh.readClientFiles(cmp.mergeBase), gh.readClientFiles(headSha)]);
    const files = [], display = [], skipped = [];
    const code = (e) => String(e.message).split(':')[0];
    for (const rel of rels) {
      if (!base.has(rel) || !head.has(rel)) throw new CheckError('not-text-file');
      const before = base.get(rel);
      if (kindOfFile(rel) === 'json') {
        let list;
        try { list = diffFile(rel, before, head.get(rel)); } catch (e) { throw new CheckError(code(e)); }
        const ok = [];
        for (const e of list) {
          const r = checkNewText({ text: e.old, kind: e.kind }, e.new, [req.text]);
          if (r.ok) ok.push({ ...e, new: r.value }); else skipped.push({ code: r.code, old: e.old });
        }
        if (!ok.length) continue;
        const after = applyEdits(rel, before, ok);
        verifyEdits(rel, before, after, ok.map((e) => e.locator));
        files.push({ rel, before, after, edits: ok.map(({ file, locator, old, new: nw }) => ({ file, locator, old, new: nw })), deletes: 0 });
        for (const e of ok) display.push({ page: e.page.label.ar, op: 'edit', old: e.old, new: e.new });
      } else {
        let d;
        try { d = diffMd(rel, before, head.get(rel)); } catch (e) { throw new CheckError(code(e)); }
        const page = (indexFile(rel, before)[0]?.page.label.ar) || rel;
        const ok = [];
        for (const o of d.ops) {
          if (o.op === 'delete') { ok.push(o); continue; }
          const r = checkNewText({ text: o.old || '', kind: 'text' }, o.new, [req.text]);
          if (r.ok) { o.new = r.value; ok.push(o); } else skipped.push({ code: r.code, old: o.old });
        }
        if (!ok.length) continue;
        const after = d.rebuild(ok);
        try { diffMd(rel, before, after); } catch { throw new CheckError('structure-changed'); }
        const deletes = ok.filter((o) => o.op !== 'edit').length;      // added or deleted points: undo needs the exact file
        files.push({ rel, before, after, deletes, edits: deletes ? [] : ok.map((o) => ({ file: rel, locator: o.locator, old: o.old, new: o.new })) });
        for (const o of ok) display.push({ page, op: o.op, old: o.old, new: o.op === 'delete' ? null : o.new });
      }
    }
    if (!display.length) throw new CheckError(skipped[0]?.code || 'no-change');
    if (display.length > LIMITS.maxEditsPerChange) throw new CheckError('too-many-edits');
    return { files, display, skipped };
  }

  /**
   * Write the planned files on the newest live tip and fast-forward. A file nobody touched since gets the exact
   * planned text. A file changed meanwhile only works for plain word edits (re-applied by position); with
   * deleted points it is refused as stale. direction: 'forward' (publish) or 'back' (undo).
   */
  async commitLive(plans, direction, display, title, requesterName, reverterName) {
    const { gh, env } = this;
    const clean = (s) => oneLine(s).replace(/[<>]/g, '');
    const lines = display.map((e) => e.op === 'delete' ? `- delete: "${clip(clean(e.old), 100)}"` : e.op === 'add' ? `- add: "${clip(clean(e.new), 100)}"` : `- "${clip(clean(e.old), 100)}" -> "${clip(clean(e.new), 100)}"`).join('\n');
    const msg = `${title}\n\n${lines}\n\nRequested-by: ${clean(requesterName)}${reverterName ? `\nReverted-by: ${clean(reverterName)}` : ''}\n`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const tip = await gh.tip(env.LIVE_BRANCH);
      const current = await gh.readClientFiles(tip);
      const out = {};
      for (const p of plans) {
        const from = direction === 'forward' ? p.before : p.after, to = direction === 'forward' ? p.after : p.before;
        const cur = current.get(p.rel);
        if (cur === from) { out[p.rel] = to; continue; }
        if (p.deletes || !p.edits.length) { const e = new Error(`file changed: ${p.rel}`); e.code = 'stale'; throw e; }
        const edits = direction === 'forward' ? p.edits : p.edits.map((e) => ({ ...e, old: e.new, new: e.old }));
        const built = new Store(tip, new Map([[p.rel, cur]])).build(edits);
        if (!built.ok) { const e = new Error(`cannot apply: ${built.code}`); e.code = built.code === 'structure' ? 'structure' : 'stale'; throw e; }
        out[p.rel] = built.files[p.rel];
      }
      const sha = await gh.makeCommit(tip, out, msg);
      if (await gh.fastForward(env.LIVE_BRANCH, sha)) return sha;
    }
    throw new Error('branch kept moving');
  }

  async cleanBranches(id) {
    for (const name of [branchOf(id), `${branchOf(id)}-refused`]) {
      try { await this.gh.deleteBranch(name); } catch (e) { await audit(this.db, { actor: 'bot', event: 'branch_cleanup_failed', changeId: id, detail: this.redact(e.message) }); }
    }
  }

  /** What one person sees, and which buttons they get. */
  view(req, viewer, names) {
    return {
      id: req.id, text: req.text, status: req.status, statusText: STATUS_AR[req.status], message: req.message,
      from: names.get(req.person_id) || '', mine: req.person_id === viewer.id, at: req.created_at,
      inProgress: IN_PROGRESS.includes(req.status),
      edits: req.edits_json ? JSON.parse(req.edits_json).map((e) => ({ page: typeof e.page === 'string' ? e.page : e.page?.label?.ar, op: e.op || 'edit', old: e.old, new: e.new })) : [],
      can: { abort: this.canAbort(req, viewer), revert: this.canRevert(req, viewer) },
    };
  }

  async advanceAll() {
    const r = await this.db.prepare("SELECT * FROM requests WHERE status IN ('working','building') OR (status = 'aborted' AND updated_at > ?) ORDER BY created_at LIMIT 5").bind(nowSec() - 3 * 3600).all();
    for (const req of r.results) {
      try { await this.advance(req); } catch (e) { await audit(this.db, { actor: 'bot', event: 'advance_error', changeId: req.id, detail: this.redact(e.message) }); }
    }
  }
}
