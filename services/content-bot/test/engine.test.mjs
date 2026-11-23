import test from 'node:test';
import assert from 'node:assert/strict';
import { indexFile, applyEdits, verifyEdits } from '../src/segments.js';
import { checkNewText, wordsComeFromRequest } from '../src/validate.js';
import { pathAllowed } from '../src/config.js';
import { ELECTIONS, CLIENT, MD } from './helpers.mjs';

test('only text values are indexed: images, hrefs, numbers, domains are not', () => {
  const locs = indexFile('elections.json', ELECTIONS).map((s) => s.locator);
  assert.ok(locs.includes('/list/slogan'));
  for (const bad of ['/list/crest', '/home/hero/image', '/home/cta/action/href', '/election/at', '/support/goal']) assert.ok(!locs.includes(bad), bad);
  const c = indexFile('client.json', CLIENT).map((s) => s.locator);
  assert.deepEqual(c, ['/name/ar', '/contact/phones/0']);          // address is null -> not editable; domains/api never
});

test('json edit keeps formatting and structure; verify rejects structural tampering', () => {
  const out = applyEdits('elections.json', ELECTIONS, [{ locator: '/list/slogan', new: 'شعار جديد' }]);
  assert.equal(out.replace('شعار جديد', 'تاريخ نحترمه .. ومستقبل نصنعه'), ELECTIONS);
  verifyEdits('elections.json', ELECTIONS, out, ['/list/slogan']);
  assert.throws(() => verifyEdits('elections.json', ELECTIONS, out, ['/list/name']), /unexpected-change/);
  const tampered = JSON.stringify({ ...JSON.parse(out), extra: 1 }, null, 2);
  assert.throws(() => verifyEdits('elections.json', ELECTIONS, tampered, ['/list/slogan']), /structure-changed/);
  const hrefChanged = out.replace('page:complaints', 'https://evil.example');
  assert.throws(() => verifyEdits('elections.json', ELECTIONS, hrefChanged, ['/list/slogan']), /unexpected-change/);
});

test('markdown: text nodes change, tags and front matter keys stay', () => {
  const segs = indexFile('content/ar/team.md', MD);
  assert.deepEqual(segs.map((s) => s.locator), ['fm:title', 'fm:description', 'body:0', 'body:1', 'body:2']);
  const out = applyEdits('content/ar/team.md', MD, [{ locator: 'body:1', new: 'ليسانس الآداب & الحقوق.' }]);
  assert.ok(out.includes('<li>ليسانس الآداب &amp; الحقوق.</li>'));
  verifyEdits('content/ar/team.md', MD, out, ['body:1']);
  const injected = MD.replace('<p>', '<p><script>x</script>');
  assert.throws(() => verifyEdits('content/ar/team.md', MD, injected, ['body:2']), /structure-changed|unexpected-change/);
  const idChanged = MD.replace('id: "team"', 'id: "evil"');
  assert.throws(() => verifyEdits('content/ar/team.md', MD, idChanged, []), /structure-changed/);
});

test('text checks', () => {
  const seg = { text: 'الشعار القديم', kind: 'text' };
  const req = ['غير الشعار الى مستقبل مشرق'];
  assert.equal(checkNewText(seg, 'مستقبل مشرق', req).ok, true);
  assert.equal(checkNewText(seg, '<b>مستقبل</b>', req).code, 'markup');
  assert.equal(checkNewText(seg, 'مستقبل <script>', req).code, 'markup');
  assert.equal(checkNewText(seg, 'javascript:alert(1)', ['javascript:alert(1)']).code, 'markup');
  assert.equal(checkNewText(seg, 'مستقبل مشرق للجميع وبلا حدود', req).code, 'not_from_request');   // words the person never wrote
  assert.equal(checkNewText(seg, '', req).code, 'empty');
  assert.equal(checkNewText(seg, 'الشعار القديم', req).code, 'same');
  assert.equal(checkNewText(seg, 'x'.repeat(5000), ['x'.repeat(5000)]).code, 'too_long');
  assert.equal(checkNewText(seg, 'مستقبل‮مشرق', req).code, 'bad_chars');
  assert.equal(checkNewText({ text: 'أهلًا %s', kind: 'text' }, 'مرحبا', ['مرحبا']).code, 'placeholder');
  assert.equal(checkNewText({ text: '0100', kind: 'phone' }, '٠١٠٠٩٩٩٨٨٨٧', ['٠١٠٠٩٩٩٨٨٨٧']).value, '01009998887');
  assert.equal(checkNewText({ text: '0100', kind: 'phone' }, 'call me', ['call me']).code, 'kind');
  assert.equal(checkNewText({ text: 'https://a.b', kind: 'url' }, 'http://a.b', ['http://a.b']).code, 'kind');
  assert.deepEqual(wordsComeFromRequest('a b', 'a c', ['please c']), []);
  assert.deepEqual(wordsComeFromRequest('a b', 'a 12', ['x 13']), ['12']);
});

test('path guard allows only the client text files', () => {
  const d = 'clients/tantasportsclubelections';
  assert.ok(pathAllowed(d, `${d}/elections.json`));
  assert.ok(pathAllowed(d, `${d}/content/ar/team/ashoush.md`));
  for (const p of [`${d}/media/logo.webp`, `${d}/content/../API.md`, 'clients/genesis/client.json', 'apps/site/src/layouts/Base.astro', `${d}/API.md`, `/${d}/client.json`]) assert.equal(pathAllowed(d, p), false, p);
});

test('GitHub: all client text files come back in ONE GraphQL call', async () => {
  const { GitHub } = await import('../src/github.js');
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ data: { repository: {
      a: { text: '{}' }, b: { text: '{}' },
      c: { entries: [{ name: 'ar', type: 'tree', object: { entries: [
        { name: 'home.md', type: 'blob', object: { text: 'H' } },
        { name: 'team', type: 'tree', object: { entries: [{ name: 'x.md', type: 'blob', object: { text: 'X' } }, { name: 'p.png', type: 'blob', object: { text: null } }] } },
      ] } }] },
    } } }), { status: 200 });
  };
  const gh = new GitHub({ token: 't', repo: 'o/r', clientDir: 'clients/c', pathAllowed: () => true, fetchImpl });
  const files = await gh.readClientFiles('abc');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.variables.c, 'abc:clients/c/content');
  assert.deepEqual([...files.keys()].sort(), ['client.json', 'content/ar/home.md', 'content/ar/team/x.md', 'elections.json']);
});

test('Pages build state: waits for a production build that started after the commit', async () => {
  const { buildState } = await import('../src/pages.js');
  const since = Math.floor(Date.now() / 1000) - 30;
  const env = { CF_PAGES_TOKEN: 't', CF_ACCOUNT_ID: 'a', PAGES_PROJECT: 'p' };
  const reply = (result) => async () => new Response(JSON.stringify({ result }), { status: 200 });
  assert.equal(await buildState(env, since, reply([{ created_on: new Date((since - 600) * 1000).toISOString(), latest_stage: { name: 'deploy', status: 'success' } }])), 'pending');
  assert.equal(await buildState(env, since, reply([{ created_on: new Date((since + 2) * 1000).toISOString(), latest_stage: { name: 'build', status: 'active' } }])), 'pending');
  assert.equal(await buildState(env, since, reply([{ created_on: new Date((since + 2) * 1000).toISOString(), latest_stage: { name: 'deploy', status: 'success' } }])), 'success');
  assert.equal(await buildState(env, since, reply([{ created_on: new Date((since + 2) * 1000).toISOString(), latest_stage: { name: 'build', status: 'failure' } }])), 'failure');
  assert.equal(await buildState({}, since), 'pending');                         // no token: 90 seconds
  assert.equal(await buildState({}, since - 100), 'success');
});
