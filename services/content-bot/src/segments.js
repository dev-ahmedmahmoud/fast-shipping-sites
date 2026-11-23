// Turns the client's text files into "segments" (one editable string each) and applies edits to them.
// The structure of every file (keys, tags, order, formatting) is kept; only string values change.
import { EDITABLE, MD_FRONT_MATTER_KEYS, JSON_SECTIONS } from './config.js';

export function hash8(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0').slice(0, 5) + h2.toString(16).padStart(8, '0').slice(0, 3);
}

// ---------- JSON ----------
const esc = (k) => String(k).replace(/~/g, '~0').replace(/\//g, '~1');
function ruleRegex(pattern) {
  return new RegExp('^' + pattern.split('/').map((s) => (s === '*' ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$');
}
const COMPILED = new Map();
function rulesFor(rel) {
  if (!COMPILED.has(rel)) COMPILED.set(rel, EDITABLE[rel].rules.map((r) => ({ ...r, re: ruleRegex(r.pattern) })));
  return COMPILED.get(rel);
}
export function serializeJson(obj, originalText) {
  const out = JSON.stringify(obj, null, 2);
  return originalText.endsWith('\n') ? out + '\n' : out;
}
function* walkJson(node, path = '') {
  if (Array.isArray(node)) yield* walkArr(node, path);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) yield* walkJson(v, path + '/' + esc(k));
  else yield [path, node];
}
function* walkArr(arr, path) { for (let i = 0; i < arr.length; i++) yield* walkJson(arr[i], path + '/' + i); }

function getAt(obj, pointer) {
  let cur = obj;
  for (const seg of pointer.split('/').slice(1)) cur = cur?.[seg.replace(/~1/g, '/').replace(/~0/g, '~')];
  return cur;
}
function setAt(obj, pointer, value) {
  const parts = pointer.split('/').slice(1).map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts.at(-1)] = value;
}

function jsonPage(rel, doc, pointer) {
  if (rel === 'client.json') return { label: { ar: 'إعدادات الموقع العامة', en: 'Site-wide details' }, route: '/' };
  const parts = pointer.split('/');
  const top = parts[1];
  const sec = JSON_SECTIONS[top] || { ar: top, en: top, route: '/' };
  if (top === 'candidates') {
    const c = doc.candidates?.[Number(parts[2])];
    return { label: { ar: `مرشح: ${c?.name ?? ''}`, en: `Candidate: ${c?.name ?? ''}` }, route: c ? `/team/${c.slug}/` : '/team/' };
  }
  if (top === 'files') {
    const f = doc.files?.[Number(parts[2])];
    return { label: { ar: `ملف: ${f?.title ?? ''}`, en: `File: ${f?.title ?? ''}` }, route: f ? `/files/${f.slug}/` : '/files/' };
  }
  return { label: { ar: sec.ar, en: sec.en }, route: sec.route };
}

function indexJson(rel, text) {
  const doc = JSON.parse(text);
  if (serializeJson(doc, text) !== text) throw new Error(`unsupported-format:${rel}`);
  const rules = rulesFor(rel);
  const out = [];
  for (const [pointer, value] of walkJson(doc)) {
    if (typeof value !== 'string') continue;
    const rule = rules.find((r) => r.re.test(pointer));
    if (!rule) continue;
    out.push({ file: rel, locator: pointer, text: value, kind: rule.kind, page: jsonPage(rel, doc, pointer) });
  }
  return out;
}
function applyJson(rel, text, edits) {
  const doc = JSON.parse(text);
  for (const e of edits) setAt(doc, e.locator, e.new);
  return serializeJson(doc, text);
}
function verifyJson(oldText, newText, expected) {
  const a = JSON.parse(oldText), b = JSON.parse(newText);
  const changed = new Set();
  const cmp = (x, y, path) => {
    if (Array.isArray(x)) {
      if (!Array.isArray(y) || x.length !== y.length) throw new Error('structure-changed');
      x.forEach((v, i) => cmp(v, y[i], path + '/' + i));
    } else if (x && typeof x === 'object') {
      if (!y || typeof y !== 'object' || Array.isArray(y)) throw new Error('structure-changed');
      const kx = Object.keys(x), ky = Object.keys(y);
      if (kx.length !== ky.length || kx.some((k, i) => k !== ky[i])) throw new Error('structure-changed');
      for (const k of kx) cmp(x[k], y[k], path + '/' + esc(k));
    } else {
      if (typeof x !== typeof y) throw new Error('structure-changed');
      if (x !== y) { if (typeof x !== 'string') throw new Error('non-string-changed'); changed.add(path); }
    }
  };
  cmp(a, b, '');
  sameSet(changed, expected);
}

// ---------- Markdown (front matter + HTML text nodes) ----------
const TAG_SPLIT = /(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/;
const decodeEnt = (s) => s.replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const encodeEnt = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseMd(text) {
  if (text.includes('\r')) throw new Error('unsupported-format:crlf');
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const head = m ? m[0] : '';
  const fmLines = m ? m[1].split('\n') : [];
  const body = text.slice(head.length);
  const pieces = body.split(TAG_SPLIT);
  // text pieces are the even indexes; skip those inside <script>/<style>
  let skip = 0;
  const textIdx = [];
  pieces.forEach((p, i) => {
    if (i % 2 === 1) {
      const t = /^<(\/?)(script|style)\b/i.exec(p);
      if (t) skip += t[1] ? -1 : 1;
    } else if (!skip && /\S/.test(p)) textIdx.push(i);
  });
  return { head, fmLines, pieces, textIdx, hasFm: !!m };
}
const FM_LINE = /^([A-Za-z][A-Za-z0-9_]*): (".*")$/;

function indexMd(rel, text) {
  const { fmLines, pieces, textIdx } = parseMd(text);
  const out = [];
  let title = '', slug = '';
  for (const line of fmLines) {
    const m = FM_LINE.exec(line);
    if (m && m[1] === 'title') title = JSON.parse(m[2]);
    const sm = /^slug: "(.*)"$/.exec(line);
    if (sm) slug = sm[1];
  }
  const page = { label: { ar: title || rel, en: title || rel }, route: slug ? `/${slug}/` : '/' };
  for (const line of fmLines) {
    const m = FM_LINE.exec(line);
    if (!m || !MD_FRONT_MATTER_KEYS.includes(m[1])) continue;
    let v; try { v = JSON.parse(m[2]); } catch { continue; }
    if (typeof v === 'string') out.push({ file: rel, locator: `fm:${m[1]}`, text: v, kind: 'text', page });
  }
  textIdx.forEach((pi, n) => {
    const core = pieces[pi].trim();
    out.push({ file: rel, locator: `body:${n}`, text: decodeEnt(core), kind: 'text', page });
  });
  return out;
}
function applyMd(rel, text, edits) {
  const parsed = parseMd(text);
  const { head, fmLines, pieces, textIdx } = parsed;
  const byLoc = new Map(edits.map((e) => [e.locator, e.new]));
  const newFm = fmLines.map((line) => {
    const m = FM_LINE.exec(line);
    if (m && byLoc.has(`fm:${m[1]}`)) return `${m[1]}: ${JSON.stringify(byLoc.get(`fm:${m[1]}`))}`;
    return line;
  });
  textIdx.forEach((pi, n) => {
    const loc = `body:${n}`;
    if (!byLoc.has(loc)) return;
    const p = pieces[pi];
    const lead = /^\s*/.exec(p)[0], trail = /\s*$/.exec(p)[0];
    pieces[pi] = lead + encodeEnt(byLoc.get(loc)) + trail;
  });
  const newHead = parsed.hasFm ? `---\n${newFm.join('\n')}\n---\n` : '';
  return newHead + pieces.join('');
}
function mdSkeleton(text) {
  const { fmLines, pieces, textIdx, hasFm } = parseMd(text);
  const fm = fmLines.map((l) => { const m = FM_LINE.exec(l); return m && MD_FRONT_MATTER_KEYS.includes(m[1]) ? `${m[1]}: <v>` : l; });
  const idx = new Set(textIdx);
  const body = pieces.map((p, i) => (idx.has(i) ? '\u0001' : p)).join('');
  return `${hasFm}\n${fm.join('\n')}\n@@\n${body}`;
}
function verifyMd(rel, oldText, newText, expected) {
  if (mdSkeleton(oldText) !== mdSkeleton(newText)) throw new Error('structure-changed');
  const a = indexMd(rel, oldText), b = indexMd(rel, newText);
  if (a.length !== b.length) throw new Error('structure-changed');
  const changed = new Set();
  a.forEach((s, i) => {
    if (s.locator !== b[i].locator) throw new Error('structure-changed');
    if (s.text !== b[i].text) changed.add(s.locator);
  });
  sameSet(changed, expected);
}

function sameSet(a, b) {
  if (a.size !== b.size || [...a].some((x) => !b.has(x))) throw new Error('unexpected-change');
}

// ---------- public API (rel = path inside the client folder) ----------
export function kindOfFile(rel) {
  if (EDITABLE[rel]) return 'json';
  if (rel.startsWith('content/') && rel.endsWith('.md')) return 'md';
  return null;
}
export function indexFile(rel, text) {
  const k = kindOfFile(rel);
  const segs = k === 'json' ? indexJson(rel, text) : k === 'md' ? indexMd(rel, text) : null;
  if (!segs) throw new Error('not-editable-file');
  return segs.map((s) => ({ ...s, ref: hash8(`${s.file}|${s.locator}`) }));
}
export function applyEdits(rel, text, edits) {
  const k = kindOfFile(rel);
  return k === 'json' ? applyJson(rel, text, edits) : applyMd(rel, text, edits);
}
export function verifyEdits(rel, oldText, newText, locators) {
  const set = new Set(locators);
  return kindOfFile(rel) === 'json' ? verifyJson(oldText, newText, set) : verifyMd(rel, oldText, newText, set);
}

/**
 * Compare two versions of one client file written by someone else (the agent).
 * Returns the list of text edits, or throws if anything other than editable text changed.
 */
export function diffFile(rel, oldText, newText) {
  const a = indexFile(rel, oldText), b = indexFile(rel, newText);
  if (a.length !== b.length || a.some((s, i) => s.locator !== b[i].locator)) throw new Error('structure-changed');
  const changed = [];
  a.forEach((s, i) => { if (s.text !== b[i].text) changed.push({ file: rel, locator: s.locator, old: s.text, new: b[i].text, kind: s.kind, page: s.page }); });
  verifyEdits(rel, oldText, newText, changed.map((c) => c.locator));   // anything else changed -> throws
  return changed;
}
