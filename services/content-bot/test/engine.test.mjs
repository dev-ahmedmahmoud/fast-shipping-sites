import test from 'node:test';
import assert from 'node:assert/strict';
import { indexFile, applyEdits, verifyEdits } from '../src/segments.js';
import { checkNewText, wordsComeFromRequest } from '../src/validate.js';
import { pathAllowed } from '../src/config.js';
import { verifySignature, hmacSha256Hex, parseWebhook } from '../src/whatsapp.js';
import { parseCommand } from '../src/flow.js';
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

test('webhook signature (X-Hub-Signature-256)', async () => {
  const body = '{"a":1}', sig = 'sha256=' + await hmacSha256Hex('secret', body);
  assert.equal(await verifySignature('secret', sig, body), true);
  assert.equal(await verifySignature('secret', sig, body + ' '), false);
  assert.equal(await verifySignature('other', sig, body), false);
  assert.equal(await verifySignature('secret', null, body), false);
  assert.equal(await verifySignature('secret', 'sha256=' + 'a'.repeat(64), body), false);
});

test('webhook parsing keeps only our number and texts', () => {
  const p = { object: 'whatsapp_business_account', entry: [{ changes: [{ value: { metadata: { phone_number_id: 'PN1' }, messages: [{ from: '2010', id: 'w1', type: 'text', text: { body: 'hi' }, timestamp: '1' }] } }, { value: { metadata: { phone_number_id: 'OTHER' }, messages: [{ from: '1', id: 'w2', type: 'text', text: { body: 'x' } }] } }] }] };
  const m = parseWebhook(p, 'PN1');
  assert.equal(m.length, 1); assert.equal(m[0].text, 'hi');
});

test('commands in English and Arabic', () => {
  assert.deepEqual(parseCommand('YES k7m2qx'), { cmd: 'approve', id: 'K7M2QX' });
  assert.deepEqual(parseCommand('نعم ab3k7q'), { cmd: 'approve', id: 'AB3K7Q' });
  assert.deepEqual(parseCommand('no AB3K7Q.'), { cmd: 'reject', id: 'AB3K7Q' });
  assert.deepEqual(parseCommand('تراجع AB3K7Q'), { cmd: 'undo', id: 'AB3K7Q' });
  assert.deepEqual(parseCommand('yes'), { cmd: 'approve', id: undefined });
  assert.equal(parseCommand('yes please change the slogan'), null);
});
