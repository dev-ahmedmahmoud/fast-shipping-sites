import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, LIVE, ORIGIN, ELECTIONS } from './helpers.mjs';
import { validEndpoint, publicKeyFromJwk } from '../src/push.js';
import { payload } from '../src/routine.js';

const OLD = 'تاريخ نحترمه .. ومستقبل نصنعه';
const NEW = 'شعار جديد للقائمة';
const ASK = `غير الشعار الى ${NEW}`;
const sloganEdit = (m) => ({ 'elections.json': m.get('elections.json').replace(`"slogan": "${OLD}"`, `"slogan": "${NEW}"`) });

async function sent(s, who = s.cab, text = ASK) {
  const r = await who.send(text);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json.id;
}

test('request -> agent run -> its branch is checked -> live -> done; nobody approves', async () => {
  const s = await setup();
  const id = await sent(s);
  assert.equal(s.fired.length, 1);
  assert.match(s.fired[0], new RegExp(`REQUEST_ID: ${id}`));
  assert.match(s.fired[0], new RegExp(`PUSH_BRANCH: claude/content-${id.toLowerCase()}`));
  assert.match(s.fired[0], /FROM: Mona \(cabinet\)/);
  assert.equal((await s.cab.get(id)).status, 'working');
  assert.deepEqual((await s.cab.get(id)).can, { abort: true, revert: false });

  s.gh.agentPush(s.branch(id), sloganEdit);
  let r = await s.cab.get(id);
  assert.equal(r.status, 'building');
  assert.match(s.gh.liveFile('elections.json'), new RegExp(NEW));
  assert.equal(s.gh.liveFile('elections.json').split(NEW).length, 2, 'only the list slogan changed, as the agent did');
  assert.ok(!s.gh.branches.has(s.branch(id)), 'agent branch deleted');
  assert.deepEqual(r.edits, [{ page: 'اسم القائمة وشعارها', old: OLD, new: NEW }]);
  const msg = s.gh.commits.get(s.gh.branches.get(LIVE)).message;
  assert.match(msg, new RegExp(`Text request ${id}`)); assert.match(msg, /Requested-by: Mona/);

  s.ago(id, 'building_since', 100);                       // no Pages token: done 90 s after publishing
  r = await s.cab.get(id);
  assert.equal(r.status, 'done'); assert.equal(r.statusText, 'تم. حدّث صفحة الموقع.');
  assert.ok(s.pushes.includes(s.cab.id), 'requester alerted when done');
  const ev = s.audit().map((a) => a.event);
  for (const e of ['request', 'agent_started', 'published', 'site_updated']) assert.ok(ev.includes(e), e);
  assert.equal(s.audit().find((a) => a.event === 'published').commit_sha, s.row(id).live_commit);
});

test('the client sees everyone\'s requests; a team member sees only their own', async () => {
  const s = await setup();
  const a = await sent(s, s.cab);
  const b = await sent(s, s.client, 'غير نسخ اللينك الى انسخ');
  assert.deepEqual((await s.client.list()).requests.map((r) => r.id).sort(), [a, b].sort());
  assert.deepEqual((await s.cab.list()).requests.map((r) => r.id), [a]);
});

test('the gate refuses an agent branch that changes more than text', async () => {
  const cases = [
    ['design file', () => ({ 'public/favicon.png': 'X' })],
    ['new file', () => ({ 'content/ar/new.md': '---\ntitle: "x"\n---\n' })],
    ['deleted file', () => ({ 'content/ar/team.md': null })],
    ['link value', (m) => ({ 'elections.json': m.get('elections.json').replace('page:complaints', 'https://evil.example') })],
    ['image value', (m) => ({ 'elections.json': m.get('elections.json').replace('crest.webp', 'evil.webp') })],
    ['html tag', (m) => ({ 'content/ar/team.md': m.get('content/ar/team.md').replace('<p>أحد', '<p><script>x</script>أحد') })],
    ['markup in text', (m) => ({ 'elections.json': m.get('elections.json').replace(OLD, `<b>${NEW}</b>`) })],
    ['invented words', (m) => ({ 'elections.json': m.get('elections.json').replace(`"slogan": "${OLD}"`, '"slogan": "أفضل قائمة في تاريخ النادي"') })],
    ['reformatted json', (m) => ({ 'elections.json': JSON.stringify(JSON.parse(m.get('elections.json'))) })],
  ];
  for (const [name, change] of cases) {
    const s = await setup();
    const before = s.gh.liveFile('elections.json');
    const id = await sent(s);
    s.gh.agentPush(s.branch(id), change);
    const r = await s.cab.get(id);
    assert.equal(r.status, 'refused', name);
    assert.ok(r.message, name);
    assert.equal(s.gh.liveFile('elections.json'), before, name);
    assert.ok(!s.gh.branches.has(s.branch(id)), name + ': branch cleaned');
  }
});

test('agent refuses: its reason is shown; nothing changes', async () => {
  const s = await setup();
  const id = await sent(s, s.cab, 'خلي الهيدر أزرق');
  s.gh.agentPush(`${s.branch(id)}-refused`, {}, 'أستطيع تغيير النصوص فقط.');
  const r = await s.cab.get(id);
  assert.equal(r.status, 'refused'); assert.equal(r.message, 'أستطيع تغيير النصوص فقط.');
  assert.ok(!s.gh.branches.has(`${s.branch(id)}-refused`));
});

test('stop: the run is ignored even if it pushes later; only requester or client may stop', async () => {
  const s = await setup();
  const id = await sent(s, s.client);
  assert.equal((await s.cab.act(id, 'abort')).status, 409, 'not your request');
  assert.equal((await s.client.act(id, 'abort')).status, 200);
  const before = s.gh.liveFile('elections.json');
  s.gh.agentPush(s.branch(id), sloganEdit);
  s.ago(id, 'checked_at', 400);
  const r = await s.client.get(id);
  assert.equal(r.status, 'aborted');
  assert.equal(s.gh.liveFile('elections.json'), before);
  assert.ok(!s.gh.branches.has(s.branch(id)), 'late branch deleted');
  assert.equal((await s.client.act(id, 'abort')).status, 409);
});

test('undo: puts the old text back; requester or client; refused if edited again later', async () => {
  const s = await setup();
  const original = s.gh.liveFile('elections.json');
  const id = await sent(s);
  s.gh.agentPush(s.branch(id), sloganEdit);
  await s.cab.get(id);
  assert.deepEqual((await s.cab.get(id)).can, { abort: false, revert: true });
  const other = await s.person('Ali', 'cabinet');
  assert.equal((await other.act(id, 'revert')).status, 409, 'someone else\'s request');
  assert.equal((await s.client.act(id, 'revert')).status, 200);
  assert.equal(s.gh.liveFile('elections.json'), original);
  assert.equal(s.row(id).status, 'reverted');
  assert.match(s.gh.commits.get(s.gh.branches.get(LIVE)).message, /Reverted-by: حسين/);

  const s2 = await setup();
  const id2 = await sent(s2);
  s2.gh.agentPush(s2.branch(id2), sloganEdit);
  await s2.cab.get(id2);
  s2.gh.push({ 'elections.json': s2.gh.liveFile('elections.json').replace(NEW, 'نص آخر') });
  const r = await s2.cab.act(id2, 'revert');
  assert.equal(r.status, 409); assert.match(r.json.message, /مرة أخرى/);
  assert.equal(s2.row(id2).status, 'building', 'status restored');
});

test('publish lands on top of newer site-builder commits; stale if the same text changed', async () => {
  const s = await setup();
  const id = await sent(s);
  s.gh.agentPush(s.branch(id), sloganEdit);
  const builder = s.gh.push({ 'public/favicon.png': 'NEW-ICON' });
  await s.cab.get(id);
  assert.equal(s.gh.commits.get(s.gh.branches.get(LIVE)).parent, builder);
  assert.equal(s.gh.liveFile('public/favicon.png'), 'NEW-ICON');

  const s2 = await setup();
  const id2 = await sent(s2);
  s2.gh.agentPush(s2.branch(id2), sloganEdit);
  s2.gh.push({ 'elections.json': s2.gh.liveFile('elections.json').replace(`"slogan": "${OLD}"`, '"slogan": "نص المصمم"') });
  const r = await s2.cab.get(id2);
  assert.equal(r.status, 'failed'); assert.match(r.message, /تغيّرت/);
  assert.match(s2.gh.liveFile('elections.json'), /نص المصمم/);
});

test('timeouts, send failure, limits, kill switch, cron', async () => {
  let s = await setup();
  let id = await sent(s);
  s.ago(id, 'created_at', 31 * 60);
  assert.equal((await s.cab.get(id)).status, 'failed');

  s = await setup();
  s.fire.fail = true;
  id = await sent(s);
  assert.equal(s.row(id).status, 'failed');
  assert.ok(s.audit().some((a) => a.event === 'agent_start_failed'));

  s = await setup();
  await sent(s); await sent(s);
  assert.equal((await s.cab.send('ثالث')).status, 429, 'max 2 running per person');
  s.env.BOT_MODE = 'off';
  assert.equal((await s.client.send('x')).status, 503);
  s.env.BOT_MODE = 'on';

  s = await setup();                                          // the 2-minute cron moves requests with the app closed
  id = await sent(s);
  s.gh.agentPush(s.branch(id), sloganEdit);
  s.due();
  await s.app.scheduled({}, s.env, s.ctx); await s.settle();
  assert.equal(s.row(id).status, 'building');
});

test('no login -> no access; invite works once; blocked person is out', async () => {
  const s = await setup();
  assert.equal((await s.req('/api/requests')).status, 401);
  assert.equal((await s.req('/api/requests', { body: { text: 'x' } })).status, 401);
  assert.equal((await s.req('/api/join', { body: { token: s.cab.token } })).status, 401);
  assert.equal((await s.req('/api/requests', { cookie: 'sid=forged' })).status, 401);
  await s.adminCall({ action: 'block', personId: s.cab.id });
  assert.equal((await s.cab.send('hello')).status, 401);
  assert.equal(s.fired.length, 0);
});

test('admin key rate limit; one active client; cross-site blocked', async () => {
  const s = await setup();
  for (let i = 0; i < 11; i++) await s.req('/api/admin', { body: { action: 'list' }, headers: { 'x-admin-key': 'wrong' } });
  assert.equal((await s.adminCall({ action: 'list' })).status, 401);
  const s2 = await setup();
  assert.equal((await s2.adminCall({ action: 'add', name: 'X', role: 'client' })).status, 409);
  const evil = await s2.app.fetch(new Request(ORIGIN + '/api/requests', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json', cookie: s2.client.cookie }, body: '{"text":"x"}' }), s2.env, s2.ctx);
  assert.equal(evil.status, 403);
  const form = await s2.app.fetch(new Request(ORIGIN + '/api/requests', { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'text/plain', cookie: s2.client.cookie }, body: '{"text":"x"}' }), s2.env, s2.ctx);
  assert.equal(form.status, 415);
});

test('payload format; push endpoints; audit append-only', async () => {
  const p = payload({ id: 'K7M2QX', text: 'غير\nالشعار' }, { name: 'A\nB', role: 'cabinet' }, { LIVE_BRANCH: 'live' });
  assert.match(p, /^REQUEST_ID: K7M2QX\nLIVE_BRANCH: live\nPUSH_BRANCH: claude\/content-k7m2qx\nREFUSE_BRANCH: claude\/content-k7m2qx-refused\nFROM: A B \(cabinet\)\nREQUEST:\n/);
  assert.ok(validEndpoint('https://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(validEndpoint('https://web.push.apple.com/QK'));
  assert.ok(!validEndpoint('https://evil.example/x'));
  const { privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  assert.equal(publicKeyFromJwk(await crypto.subtle.exportKey('jwk', privateKey)).length, 87);
  const s = await setup();
  assert.throws(() => s.db.raw.exec("UPDATE audit SET actor='x'"), /append-only/);
});

test('voice: audio in, Arabic text out; login, type and size checked', async () => {
  const s = await setup();
  const seen = [];
  s.env.AI = { run: async (model, input) => { seen.push({ model, input }); return { text: '  غير الشعار   الى شعار جديد ' }; } };
  const audio = new Uint8Array(5000).fill(7);
  const post = (headers, body = audio) => s.app.fetch(new Request(ORIGIN + '/api/voice', { method: 'POST', headers: { origin: ORIGIN, ...headers }, body }), s.env, s.ctx);
  let r = await post({ 'content-type': 'audio/webm', cookie: s.cab.cookie });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).text, 'غير الشعار الى شعار جديد');
  assert.equal(seen[0].model, '@cf/openai/whisper-large-v3-turbo');
  assert.equal(seen[0].input.language, 'ar');
  assert.equal(Buffer.from(seen[0].input.audio, 'base64').length, 5000);
  assert.equal((await post({ 'content-type': 'audio/webm' })).status, 401, 'no login');
  assert.equal((await post({ 'content-type': 'text/plain', cookie: s.cab.cookie })).status, 415);
  assert.equal((await post({ 'content-type': 'audio/mp4', cookie: s.cab.cookie }, new Uint8Array(10))).status, 400, 'too short');
  assert.equal((await post({ 'content-type': 'audio/mp4', cookie: s.cab.cookie }, new Uint8Array(3_100_000))).status, 413);
  assert.equal((await s.app.fetch(new Request(ORIGIN + '/api/voice', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'audio/webm', cookie: s.cab.cookie }, body: audio }), s.env, s.ctx)).status, 403);
  s.env.AI = { run: async () => { throw new Error('ai down'); } };
  assert.equal((await post({ 'content-type': 'audio/webm', cookie: s.cab.cookie })).status, 502);
});
