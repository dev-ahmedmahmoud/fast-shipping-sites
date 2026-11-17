// One Worker: serves the app (public/) and its API (/api/*). Heavy AI work runs from a Queue.
import { GitHub } from './github.js';
import { Bot } from './flow.js';
import { makeSdkCaller } from './claude.js';
import { loadStore } from './store.js';
import { pathAllowed, LIMITS } from './config.js';
import { audit, housekeeping, hit, addChat, nowSec } from './db.js';
import { currentPerson, redeemInvite, createInvite, sessionCookie, clearCookie, isAdmin, sha256hex, readCookie } from './auth.js';
import { Push, validEndpoint, publicKeyFromJwk } from './push.js';

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const fail = (status, message) => json({ ok: false, message }, status);

export function createApp(overrides = {}) {
  const makeBot = (env) => {
    const gh = overrides.gh || new GitHub({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, clientDir: env.CLIENT_DIR, pathAllowed: (p) => pathAllowed(env.CLIENT_DIR, p) });
    return new Bot({
      env, db: env.DB, gh,
      push: overrides.push || new Push({ env, db: env.DB }),
      callModel: overrides.callModel || makeSdkCaller(env),
      loadStore: overrides.loadStore || ((tip) => loadStore(gh, tip, env.CLIENT_DIR)),
    });
  };

  async function api(request, env, ctx, url) {
    const db = env.DB;
    const path = url.pathname;
    if (request.method === 'POST') {
      // Only our own page may call the API (with SameSite=Strict cookies this blocks cross-site requests).
      if (request.headers.get('origin') !== url.origin) return fail(403, 'forbidden');
      if (!(request.headers.get('content-type') || '').startsWith('application/json')) return fail(415, 'json only');
    }
    let body = {};
    if (request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > 8000) return fail(413, 'too large');
      try { body = raw ? JSON.parse(raw) : {}; } catch { return fail(400, 'bad json'); }
    }

    if (path === '/api/admin' && request.method === 'POST') return admin(request, env, body, url);

    if (path === '/api/join' && request.method === 'POST') {
      const r = await redeemInvite(db, body.token);
      if (!r) { await audit(db, { actor: 'unknown', event: 'join_failed' }); return fail(401, 'هذا الرابط غير صالح أو استُخدم من قبل. اطلب رابطًا جديدًا من أحمد.'); }
      await audit(db, { actor: r.person.name, event: 'joined', detail: (request.headers.get('user-agent') || '').slice(0, 120) });
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(r.token) });
    }

    const person = await currentPerson(db, request);
    if (!person) return fail(401, 'login');
    const bot = makeBot(env);

    if (path === '/api/logout' && request.method === 'POST') {
      const tok = readCookie(request, 'sid');
      if (tok) await db.prepare('UPDATE sessions SET revoked = 1 WHERE token_hash = ?').bind(await sha256hex(tok)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': clearCookie });
    }
    if (path === '/api/me' && request.method === 'GET') {
      const client = await db.prepare("SELECT name FROM people WHERE role = 'client' AND active = 1").first();
      return json({ ok: true, name: person.name, role: person.role, client: client?.name || '', site: env.SITE_URL,
        vapidPublicKey: env.VAPID_PRIVATE_JWK ? publicKeyFromJwk(JSON.parse(env.VAPID_PRIVATE_JWK)) : null });
    }
    if (path === '/api/messages' && request.method === 'GET') {
      const after = Math.max(0, Number(url.searchParams.get('after')) || 0);
      const rows = after
        ? (await db.prepare('SELECT id, kind, text, change_id, created_at FROM chat WHERE person_id = ? AND id > ? ORDER BY id LIMIT 100').bind(person.id, after).all()).results
        : (await db.prepare('SELECT * FROM (SELECT id, kind, text, change_id, created_at FROM chat WHERE person_id = ? ORDER BY id DESC LIMIT 100) ORDER BY id').bind(person.id).all()).results;
      const ids = (await db.prepare('SELECT DISTINCT change_id FROM (SELECT change_id FROM chat WHERE person_id = ? AND change_id IS NOT NULL ORDER BY id DESC LIMIT 100)').bind(person.id).all()).results.map((r) => r.change_id);
      const names = new Map((await db.prepare('SELECT id, name FROM people').all()).results.map((p) => [p.id, p.name]));
      const changes = [];
      for (const id of ids) { const ch = await db.prepare('SELECT * FROM changes WHERE id = ?').bind(id).first(); if (ch) changes.push(bot.view(ch, person, names)); }
      const lastUser = await db.prepare("SELECT id, created_at FROM chat WHERE person_id = ? AND kind = 'user' ORDER BY id DESC LIMIT 1").bind(person.id).first();
      const answered = lastUser && (await db.prepare("SELECT 1 FROM chat WHERE person_id = ? AND kind != 'user' AND id > ? LIMIT 1").bind(person.id, lastUser.id).first());
      const waiting = !!lastUser && !answered && nowSec() - lastUser.created_at < 180;
      return json({ ok: true, messages: rows.map((r) => ({ id: r.id, kind: r.kind, text: r.text, changeId: r.change_id, at: r.created_at })), changes, waiting });
    }
    if (path === '/api/message' && request.method === 'POST') {
      if (env.BOT_MODE === 'off') return fail(503, 'الخدمة متوقفة مؤقتًا.');
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return fail(400, 'اكتب رسالة.');
      if (text.length > LIMITS.maxIncomingChars) return fail(400, 'الرسالة طويلة جدًا.');
      if ((await hit(db, `msg:${person.id}`, 3600, LIMITS.msgPerHour)).over) return fail(429, 'رسائل كثيرة. انتظر قليلًا ثم حاول مرة أخرى.');
      const chatId = await addChat(db, person.id, 'user', text);
      await audit(db, { actor: person.name, event: 'msg_in', detail: text });
      if (env.INBOX) await env.INBOX.send({ chatId });
      else ctx.waitUntil(bot.handleChat(chatId));
      return json({ ok: true, id: chatId });
    }
    const m = /^\/api\/changes\/([A-Z2-9]{6})\/(approve|reject|undo)$/.exec(path);
    if (m && request.method === 'POST') {
      if (env.BOT_MODE === 'off') return fail(503, 'الخدمة متوقفة مؤقتًا.');
      if ((await hit(db, `act:${person.id}`, 3600, 60)).over) return fail(429, 'محاولات كثيرة.');
      const r = await bot.act(person, m[2], m[1]);
      return json(r, r.ok ? 200 : 409);
    }
    if (path === '/api/push' && request.method === 'POST') {
      if (!validEndpoint(body.endpoint)) return fail(400, 'bad endpoint');
      await db.prepare('INSERT INTO push_subs (endpoint, person_id, created_at) VALUES (?,?,?) ON CONFLICT(endpoint) DO UPDATE SET person_id = excluded.person_id')
        .bind(body.endpoint, person.id, nowSec()).run();
      const n = await db.prepare('SELECT COUNT(*) n FROM push_subs WHERE person_id = ?').bind(person.id).first();
      if (n.n > 5) await db.prepare('DELETE FROM push_subs WHERE person_id = ? AND endpoint NOT IN (SELECT endpoint FROM push_subs WHERE person_id = ? ORDER BY created_at DESC LIMIT 5)').bind(person.id, person.id).run();
      return json({ ok: true });
    }
    return fail(404, 'not found');
  }

  async function admin(request, env, body, url) {
    const db = env.DB;
    if (!(await isAdmin(db, request, env))) { await audit(db, { actor: 'unknown', event: 'admin_denied' }); return fail(401, 'مفتاح الإدارة غير صحيح.'); }
    const name = typeof body.name === 'string' ? body.name.trim().replace(/[\r\n<>]/g, '') : '';
    const pid = Number(body.personId) || 0;
    switch (body.action) {
      case 'list': {
        const people = await db.prepare(`SELECT p.id, p.name, p.role, p.active,
          (SELECT COUNT(*) FROM sessions s WHERE s.person_id = p.id AND s.revoked = 0) AS devices,
          (SELECT MAX(last_seen) FROM sessions s WHERE s.person_id = p.id) AS last_seen,
          (SELECT COUNT(*) FROM push_subs x WHERE x.person_id = p.id) AS alerts
          FROM people p ORDER BY p.active DESC, p.role, p.name`).all();
        return json({ ok: true, people: people.results });
      }
      case 'add': {
        if (!name || name.length > 60) return fail(400, 'اكتب اسمًا قصيرًا.');
        if (!['client', 'cabinet'].includes(body.role)) return fail(400, 'الدور غير صحيح.');
        try {
          const r = await db.prepare('INSERT INTO people (name, role, created_at) VALUES (?,?,?) RETURNING id').bind(name, body.role, nowSec()).first();
          await audit(db, { actor: 'admin', event: 'person_added', detail: `${name} (${body.role})` });
          return json({ ok: true, personId: r.id });
        } catch { return fail(409, 'يوجد مرشح (عميل) نشط بالفعل. احظره أولًا.'); }
      }
      case 'invite': {
        const p = await db.prepare('SELECT * FROM people WHERE id = ? AND active = 1').bind(pid).first();
        if (!p) return fail(404, 'غير موجود أو محظور.');
        const token = await createInvite(db, p.id);
        await audit(db, { actor: 'admin', event: 'invite_created', detail: p.name });
        return json({ ok: true, link: `${url.origin}/#join=${token}`, name: p.name });
      }
      case 'block': {
        await db.prepare('UPDATE people SET active = 0 WHERE id = ?').bind(pid).run();
        await db.prepare('UPDATE sessions SET revoked = 1 WHERE person_id = ?').bind(pid).run();
        await db.prepare('DELETE FROM push_subs WHERE person_id = ?').bind(pid).run();
        await db.prepare('UPDATE invites SET used_at = ? WHERE person_id = ? AND used_at IS NULL').bind(nowSec(), pid).run();
        await audit(db, { actor: 'admin', event: 'person_blocked', detail: String(pid) });
        return json({ ok: true });
      }
      case 'unblock': {
        try { await db.prepare('UPDATE people SET active = 1 WHERE id = ?').bind(pid).run(); }
        catch { return fail(409, 'يوجد مرشح (عميل) نشط بالفعل. احظره أولًا.'); }
        await audit(db, { actor: 'admin', event: 'person_unblocked', detail: String(pid) });
        return json({ ok: true });
      }
      case 'audit': {
        const n = Math.min(Number(body.limit) || 100, 500);
        const rows = await db.prepare('SELECT id, ts, actor, event, change_id, detail, commit_sha FROM audit ORDER BY id DESC LIMIT ?').bind(n).all();
        return json({ ok: true, rows: rows.results });
      }
      default: return fail(400, 'unknown action');
    }
  }

  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        try { return await api(request, env, ctx, url); }
        catch (e) {
          try { await audit(env.DB, { actor: 'bot', event: 'api_error', detail: String(e.message).slice(0, 300) }); } catch { /* ignore */ }
          return fail(500, 'حدث خطأ. حاول مرة أخرى.');
        }
      }
      if (url.pathname === '/health') return new Response('ok');
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('not found', { status: 404 });
    },
    async queue(batch, env) {
      const bot = makeBot(env);
      for (const m of batch.messages) {
        try { await bot.handleChat(Number(m.body?.chatId)); } catch (e) { try { await audit(env.DB, { actor: 'bot', event: 'fatal', detail: String(e.message).slice(0, 300) }); } catch { /* ignore */ } }
        m.ack();
      }
    },
    async scheduled(_event, env, ctx) {
      ctx.waitUntil((async () => { const bot = makeBot(env); await bot.recoverStuck(); await bot.expireAll(); await housekeeping(env.DB); })());
    },
  };
}

export default createApp();
