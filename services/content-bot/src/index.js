// One Worker: serves the app (public/) and its API (/api/*). Requests are relayed to the site agent (a Claude Code routine).
import { GitHub } from './github.js';
import { Relay } from './relay.js';
import { loadStore } from './store.js';
import { pathAllowed, LIMITS } from './config.js';
import { audit, housekeeping, hit, nowSec } from './db.js';
import { currentPerson, redeemInvite, createInvite, sessionCookie, clearCookie, isAdmin, sha256hex, readCookie } from './auth.js';
import { Push, validEndpoint, publicKeyFromJwk } from './push.js';

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const fail = (status, message) => json({ ok: false, message }, status);

export function createApp(overrides = {}) {
  const makeRelay = (env) => {
    const gh = overrides.gh || new GitHub({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, clientDir: env.CLIENT_DIR, pathAllowed: (p) => pathAllowed(env.CLIENT_DIR, p) });
    return new Relay({
      env, db: env.DB, gh, fire: overrides.fire,
      push: overrides.push || new Push({ env, db: env.DB }),
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
    const relay = makeRelay(env);

    if (path === '/api/logout' && request.method === 'POST') {
      const tok = readCookie(request, 'sid');
      if (tok) await db.prepare('UPDATE sessions SET revoked = 1 WHERE token_hash = ?').bind(await sha256hex(tok)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': clearCookie });
    }
    if (path === '/api/me' && request.method === 'GET') {
      return json({ ok: true, name: person.name, role: person.role, site: env.SITE_URL,
        vapidPublicKey: env.VAPID_PRIVATE_JWK ? publicKeyFromJwk(JSON.parse(env.VAPID_PRIVATE_JWK)) : null });
    }
    if (path === '/api/requests' && request.method === 'GET') {
      // The client sees everyone's requests; a team member sees their own.
      const rows = person.role === 'client'
        ? (await db.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 30').all()).results
        : (await db.prepare('SELECT * FROM requests WHERE person_id = ? ORDER BY created_at DESC LIMIT 30').bind(person.id).all()).results;
      let advanced = 0;
      for (const r of rows) {                         // move running requests forward while someone is watching
        if (advanced >= 3 || !['working', 'building', 'aborted'].includes(r.status)) continue;
        advanced++;
        try { await relay.advance(r); } catch (e) { await audit(db, { actor: 'bot', event: 'advance_error', changeId: r.id, detail: relay.redact(e.message) }); }
      }
      const names = new Map((await db.prepare('SELECT id, name FROM people').all()).results.map((p) => [p.id, p.name]));
      return json({ ok: true, requests: rows.map((r) => relay.view(r, person, names)) });
    }
    if (path === '/api/requests' && request.method === 'POST') {
      if (env.BOT_MODE === 'off') return fail(503, 'الخدمة متوقفة مؤقتًا.');
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return fail(400, 'اكتب طلبك.');
      if (text.length > LIMITS.maxIncomingChars) return fail(400, 'الطلب طويل جدًا.');
      const r = await relay.submit(person, text);
      return json(r, r.ok ? 200 : 429);
    }
    const m = /^\/api\/requests\/([A-Z2-9]{6})\/(abort|revert)$/.exec(path);
    if (m && request.method === 'POST') {
      if ((await hit(db, `act:${person.id}`, 3600, 60)).over) return fail(429, 'محاولات كثيرة.');
      const r = m[2] === 'abort' ? await relay.abort(person, m[1]) : await relay.revert(person, m[1]);
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
    async scheduled(_event, env, ctx) {
      ctx.waitUntil((async () => { await makeRelay(env).advanceAll(); await housekeeping(env.DB); })());
    },
  };
}

export default createApp();
