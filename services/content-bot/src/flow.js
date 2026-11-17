// The conversation rules: who may do what. Everything that changes the site goes through here.
import { LIMITS } from './config.js';
import { audit, nowSec, sha8, personByPhone, personById, activeClient, hit, firstSight, addConvo, recentConvo, newChangeId } from './db.js';
import { runAgent, wrapUserText } from './claude.js';
import { t, detectLang, REJECT_KEY } from './messages.js';
import { toAsciiDigits } from './validate.js';

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');
const previewUrlFor = (env, id) => env.PREVIEW_URL_TEMPLATE.replace('{id}', id.toLowerCase());
const branchFor = (id) => `content/${id.toLowerCase()}`;

export function parseCommand(raw) {
  const s = toAsciiDigits(raw).trim().replace(/[.!؟?]+$/, '').replace(/\s+/g, ' ');
  const m = /^(yes|y|ok|نعم|موافق|موافقه|موافقة|اوافق|أوافق|ايوه|أيوه|تمام)(?: ([A-Za-z0-9]{4,8}))?$/i.exec(s);
  if (m) return { cmd: 'approve', id: m[2]?.toUpperCase() };
  const n = /^(no|n|لا|الغاء|إلغاء|رفض|ارفض)(?: ([A-Za-z0-9]{4,8}))?$/i.exec(s);
  if (n) return { cmd: 'reject', id: n[2]?.toUpperCase() };
  const u = /^(undo|تراجع|ارجاع|إرجاع)(?: ([A-Za-z0-9]{4,8}))?$/i.exec(s);
  if (u) return { cmd: 'undo', id: u[2]?.toUpperCase() };
  if (/^(help|مساعدة|مساعده|\?)$/i.test(s)) return { cmd: 'help' };
  return null;
}

function redact(env, s) {
  let out = String(s);
  for (const k of ['WHATSAPP_TOKEN', 'META_APP_SECRET', 'ANTHROPIC_API_KEY', 'GITHUB_TOKEN', 'WEBHOOK_VERIFY_TOKEN']) {
    if (env[k] && env[k].length > 6) out = out.split(env[k]).join('[secret]');
  }
  return out;
}

export class Bot {
  constructor(app) { Object.assign(this, app); }   // { env, db, gh, wa, callModel, loadStore }

  // ---------- sending ----------
  async say(person, text, extra = {}) {
    if (this.env.BOT_MODE === 'off') return;
    try {
      await this.wa.sendText(person.phone, text);
      await audit(this.db, { actor: 'bot', event: 'msg_out', changeId: extra.changeId, detail: `to ${person.name}: ${clip(oneLine(text), 300)}` });
    } catch (e) {
      await audit(this.db, { actor: 'bot', event: 'send_failed', changeId: extra.changeId, detail: `to ${person.name}: ${redact(this.env, e.message)}` });
      if (extra.template && (e.code === 131047 || e.code === 131026 || e.status === 400)) await this.sayTemplate(person, extra.template, extra.changeId);
    }
  }
  async sayTemplate(person, params, changeId) {
    try {
      await this.wa.sendTemplate(person.phone, this.env.APPROVAL_TEMPLATE, this.env.APPROVAL_TEMPLATE_LANG || 'ar', params);
      await audit(this.db, { actor: 'bot', event: 'template_out', changeId, detail: `to ${person.name}` });
    } catch (e) {
      await audit(this.db, { actor: 'bot', event: 'send_failed', changeId, detail: `template to ${person.name}: ${redact(this.env, e.message)}` });
    }
  }

  // ---------- entry point ----------
  async handle(msg) {
    const { db, env } = this;
    if (!(await firstSight(db, msg.id))) return;                 // WhatsApp retry
    const person = await personByPhone(db, msg.from);
    if (!person) {                                                // not on the allowlist: no reply, just a log line
      const h = await sha8(msg.from + (env.WEBHOOK_VERIFY_TOKEN || ''));
      const { over } = await hit(db, `unk:${h}`, 3600, 3);
      if (!over) await audit(db, { actor: `unknown:${h}`, event: 'ignored_unknown_sender', detail: `type=${msg.type}` });
      return;
    }
    await db.prepare('UPDATE people SET last_inbound_at = ? WHERE id = ?').bind(nowSec(), person.id).run();
    const text = clip((msg.text || '').trim(), LIMITS.maxIncomingChars);
    const lang = detectLang(text, person.lang);
    await audit(db, { actor: person.name, event: 'msg_in', detail: msg.type === 'text' ? text : `type=${msg.type}` });
    if (env.BOT_MODE === 'off') return;

    const { n, over } = await hit(db, `msg:${person.id}`, 3600, LIMITS.msgPerHour);
    if (over) { if (n === LIMITS.msgPerHour + 1) await this.say(person, t('slowDown', lang)); return; }
    if (msg.type !== 'text' || !text) return this.say(person, t('textOnlyMedia', lang));

    try {
      const c = parseCommand(text);
      if (c?.cmd === 'help') return this.say(person, t('help', lang, { client: (await activeClient(db))?.name || '' }));
      if (c) return await this.command(person, c, lang);
      return await this.request(person, text, lang);
    } catch (e) {
      await audit(db, { actor: person.name, event: 'error', detail: redact(env, e.stack || e.message).slice(0, 800) });
      await this.say(person, t('busy', lang));
    }
  }

  // ---------- YES / NO / UNDO ----------
  async command(person, c, lang) {
    const { db } = this;
    const client = await activeClient(db);
    if (!c.id) {
      const pend = await db.prepare("SELECT id FROM changes WHERE status = 'pending' ORDER BY created_at DESC LIMIT 3").all();
      const ids = pend.results.map((r) => r.id).join(', ');
      return this.say(person, lang === 'ar' ? `اكتب رقم التعديل مع الرد. ${ids ? 'المعلّق الآن: ' + ids : 'لا توجد تعديلات معلّقة.'}` : `Please include the change id. ${ids ? 'Waiting now: ' + ids : 'Nothing is waiting.'}`);
    }
    const ch = await db.prepare('SELECT * FROM changes WHERE id = ?').bind(c.id).first();
    if ((c.cmd === 'approve' || c.cmd === 'undo') && person.role !== 'client') {
      await audit(db, { actor: person.name, event: `${c.cmd}_denied`, changeId: c.id, detail: 'not the client' });
      return this.say(person, t('onlyClient', lang, { client: client?.name || '' }));
    }
    if (!ch) return this.say(person, t('unknownChange', lang, { id: c.id }));
    if (c.cmd === 'approve') return this.approve(person, ch, lang);
    if (c.cmd === 'undo') return this.undo(person, ch, lang);
    return this.reject(person, ch, lang);
  }

  async approve(client, ch, lang) {
    const { db, env } = this;
    if (ch.status === 'pending' && ch.expires_at <= nowSec()) await this.expireOne(ch);
    const claim = await db.prepare("UPDATE changes SET status = 'applying', approver_id = ?, decided_at = ? WHERE id = ? AND status = 'pending' AND expires_at > ?")
      .bind(client.id, nowSec(), ch.id, nowSec()).run();
    if (claim.meta.changes !== 1) {
      const cur = await db.prepare('SELECT status FROM changes WHERE id = ?').bind(ch.id).first();
      return this.say(client, t('notPending', lang, { id: ch.id, status: cur.status }));
    }
    const requester = await personById(db, ch.requester_id);
    const edits = JSON.parse(ch.edits_json);
    let sha;
    try {
      sha = await this.commitLive(edits, (store) => this.message('Text change', ch.id, edits, requester.name, client.name));
    } catch (e) {
      const stale = e.code === 'stale';
      await db.prepare("UPDATE changes SET status = 'failed' WHERE id = ?").bind(ch.id).run();
      await audit(db, { actor: client.name, event: stale ? 'approve_stale' : 'approve_error', changeId: ch.id, detail: redact(env, e.message) });
      await this.dropPreview(ch);
      return this.say(client, stale ? t('stale', lang, { id: ch.id }) : t('busy', lang));
    }
    await db.prepare("UPDATE changes SET status = 'live', live_commit = ? WHERE id = ?").bind(sha, ch.id).run();
    await audit(db, { actor: client.name, event: 'approved_live', changeId: ch.id, detail: `requested by ${requester.name}`, commit: sha });
    await this.dropPreview(ch);
    await this.say(client, t('live', lang, { id: ch.id }), { changeId: ch.id });
    if (requester.id !== client.id) await this.say(requester, t('liveRequester', requester.lang, { id: ch.id, client: client.name }), { changeId: ch.id });
  }

  async reject(person, ch, lang) {
    const { db } = this;
    if (person.role !== 'client' && ch.requester_id !== person.id) {
      return this.say(person, t('onlyClient', lang, { client: (await activeClient(db))?.name || '' }));
    }
    const r = await db.prepare("UPDATE changes SET status = 'rejected', decided_at = ?, approver_id = ? WHERE id = ? AND status = 'pending'")
      .bind(nowSec(), person.id, ch.id).run();
    if (r.meta.changes !== 1) return this.say(person, t('notPending', lang, { id: ch.id, status: ch.status }));
    await audit(db, { actor: person.name, event: 'rejected', changeId: ch.id });
    await this.dropPreview(ch);
    await this.say(person, t('rejected', lang, { id: ch.id }), { changeId: ch.id });
    if (ch.requester_id !== person.id) {
      const req = await personById(db, ch.requester_id);
      await this.say(req, t('rejectedRequester', req.lang, { id: ch.id, who: person.name }), { changeId: ch.id });
    }
  }

  async undo(client, ch, lang) {
    const { db, env } = this;
    const claim = await db.prepare("UPDATE changes SET status = 'applying' WHERE id = ? AND status = 'live'").bind(ch.id).run();
    if (claim.meta.changes !== 1) return this.say(client, t('notLive', lang, { id: ch.id }));
    const requester = await personById(db, ch.requester_id);
    const inverse = JSON.parse(ch.edits_json).map((e) => ({ ...e, old: e.new, new: e.old }));
    try {
      const sha = await this.commitLive(inverse, () => this.message('Undo text change', ch.id, inverse, requester.name, client.name));
      await db.prepare("UPDATE changes SET status = 'reverted', revert_commit = ? WHERE id = ?").bind(sha, ch.id).run();
      await audit(db, { actor: client.name, event: 'undone', changeId: ch.id, commit: sha });
      await this.say(client, t('undone', lang, { id: ch.id }), { changeId: ch.id });
    } catch (e) {
      await db.prepare("UPDATE changes SET status = 'live' WHERE id = ?").bind(ch.id).run();
      await audit(db, { actor: client.name, event: e.code === 'stale' ? 'undo_stale' : 'undo_error', changeId: ch.id, detail: redact(env, e.message) });
      await this.say(client, e.code === 'stale' ? t('undoStale', lang, { id: ch.id }) : t('busy', lang));
    }
  }

  message(title, id, edits, requesterName, approverName) {
    const clean = (s) => oneLine(s).replace(/[<>]/g, '');
    const pages = [...new Set(edits.map((e) => e.page.label.en))].slice(0, 3).join(', ');
    const lines = edits.map((e) => `- ${clean(e.page.label.en)}: "${clip(clean(e.old), 100)}" -> "${clip(clean(e.new), 100)}"`).join('\n');
    return `${title} ${id}: ${clean(pages)}\n\n${lines}\n\nRequested-by: ${clean(requesterName)}\nApproved-by: ${clean(approverName)}\nChange-id: ${id}\n`;
  }

  /** Re-read the newest live tip, re-check that the old text is still there, commit, fast-forward. Retries if the branch moved. */
  async commitLive(edits, makeMessage) {
    const { gh, env } = this;
    for (let attempt = 0; attempt < 4; attempt++) {
      const tip = await gh.tip(env.LIVE_BRANCH);
      const store = await this.loadStore(tip);
      const plan = store.build(edits);
      if (!plan.ok) { const e = new Error(`cannot apply: ${plan.code}`); e.code = plan.code === 'structure' ? 'structure' : 'stale'; throw e; }
      const sha = await gh.makeCommit(tip, plan.files, makeMessage(store));
      if (await gh.fastForward(env.LIVE_BRANCH, sha)) return sha;
    }
    throw new Error('branch kept moving');
  }

  async dropPreview(ch) {
    if (!ch.preview_branch) return;
    try { await this.gh.deleteBranch(ch.preview_branch); } catch (e) { await audit(this.db, { actor: 'bot', event: 'preview_cleanup_failed', changeId: ch.id, detail: redact(this.env, e.message) }); }
  }

  // ---------- a normal request ----------
  async request(person, text, lang) {
    const { db, env } = this;
    const pend = await db.prepare("SELECT COUNT(*) n FROM changes WHERE requester_id = ? AND status = 'pending'").bind(person.id).first();
    if (pend.n >= LIMITS.pendingPerPerson) return this.say(person, t('tooManyPending', lang, { n: pend.n }));
    if ((await hit(db, `claude:${person.id}`, 86400, LIMITS.claudeCallsPerDay)).over) return this.say(person, t('slowDown', lang));

    const history = await recentConvo(db, person.id, LIMITS.convoMinutes);
    const requestTexts = [...history.filter((h) => h.role === 'user').map((h) => h.content), text];
    await addConvo(db, person.id, 'user', text);
    const tip = await this.gh.tip(env.LIVE_BRANCH);
    const store = await this.loadStore(tip);
    // Only words typed by this person count as "their words". The wrapper keeps their text as data.
    const out = await runAgent({
      callModel: this.callModel, store,
      history: history.map((h) => (h.role === 'user' ? { role: 'user', content: wrapUserText(person.name, person.role, h.content) } : h)),
      userMessage: wrapUserText(person.name, person.role, text), requestTexts,
    });

    if (out.kind === 'text') {
      const reply = clip(out.text, 700);
      await addConvo(db, person.id, 'assistant', reply);
      return this.say(person, reply);
    }
    if (out.kind === 'refuse') {
      await audit(db, { actor: person.name, event: 'refused_not_text', detail: text });
      return this.say(person, t('designRefused', lang));
    }
    if (out.kind === 'invalid') {
      await audit(db, { actor: person.name, event: 'refused_by_checks', detail: `${out.code}: ${text}` });
      return this.say(person, t(REJECT_KEY[out.code] || 'rejectOther', lang));
    }
    return this.propose(person, out.plan, tip, lang);
  }

  async propose(person, plan, tip, lang) {
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
    const branch = branchFor(id), preview = previewUrlFor(env, id);
    try {
      const sha = await gh.makeCommit(tip, plan.files, `Preview of change ${id} (not live)\n\nChange-id: ${id}\n`);
      await gh.createBranch(branch, sha);
    } catch (e) {
      await db.prepare("UPDATE changes SET status = 'failed' WHERE id = ?").bind(id).run();
      await audit(db, { actor: person.name, event: 'preview_error', changeId: id, detail: redact(env, e.message) });
      throw e;
    }
    const pagePath = plan.edits[0].page.route === '/' ? '' : plan.edits[0].page.route.replace(/^\//, '');
    const link = `${preview}/${pagePath}`;
    await db.prepare('UPDATE changes SET preview_branch = ?, preview_url = ? WHERE id = ?').bind(branch, link, id).run();
    await audit(db, { actor: person.name, event: 'proposed', changeId: id, detail: JSON.stringify(plan.edits.map((e) => ({ f: e.file, l: e.locator, old: clip(e.old, 200), new: clip(e.new, 200) }))) });

    const lines = (lg) => plan.edits.map((e) => `• ${e.page.label[lg]}\n${lg === 'ar' ? 'القديم' : 'Old'}: «${clip(oneLine(e.old), 220)}»\n${lg === 'ar' ? 'الجديد' : 'New'}: «${clip(oneLine(e.new), 220)}»`).join('\n');
    const client = await activeClient(db);
    const body = t('proposal', lang, { id, lines: lines(lang), preview: link });
    if (person.role === 'client') {
      await this.say(person, `${body}\n${t('askClientNow', lang, { id })}`, { changeId: id });
    } else {
      await this.say(person, `${body}\n${t('sentToClient', lang, { client: client?.name || '' })}`, { changeId: id });
      if (client) {
        const clang = client.lang;
        const free = t('approvalRequest', clang, { requester: person.name, lines: lines(clang), preview: link, id });
        const summary = `${plan.edits[0].page.label[clang]}: ${clip(oneLine(plan.edits[0].old), 80)} ← ${clip(oneLine(plan.edits[0].new), 80)}${plan.edits.length > 1 ? ` (+${plan.edits.length - 1})` : ''}`;
        const tpl = [person.name, id, summary, link];
        const open = client.last_inbound_at && nowSec() - client.last_inbound_at < 23 * 3600;
        if (open) await this.say(client, free, { changeId: id, template: tpl });
        else await this.sayTemplate(client, tpl, id);
      }
    }
  }

  // ---------- 24-hour cleanup (cron) ----------
  async expireOne(ch) {
    const r = await this.db.prepare("UPDATE changes SET status = 'expired', decided_at = ? WHERE id = ? AND status = 'pending'").bind(nowSec(), ch.id).run();
    if (r.meta.changes !== 1) return;
    await audit(this.db, { actor: 'bot', event: 'expired', changeId: ch.id });
    await this.dropPreview(ch);
    const req = await personById(this.db, ch.requester_id);
    if (req && this.env.BOT_MODE !== 'off') await this.say(req, t('expired', req.lang, { id: ch.id }), { changeId: ch.id });
  }
  async expireAll() {
    const r = await this.db.prepare("SELECT * FROM changes WHERE status = 'pending' AND expires_at <= ?").bind(nowSec()).all();
    for (const ch of r.results) await this.expireOne(ch);
    return r.results.length;
  }
}
