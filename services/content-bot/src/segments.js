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

// ---------- Markdown pages: text edits + deleting whole points (<li>) or paragraphs (<p>) ----------
const INLINE = new Set(['strong', 'em', 'b', 'i', 'br', 'span']);
const DELETABLE = new Set(['li', 'p']);
const tagInfo = (t) => { const m = /^<(\/?)([a-zA-Z0-9]+)\s*(\/?)>$/.exec(t); return m ? { close: !!m[1], name: m[2].toLowerCase(), plain: true } : { plain: false }; };
const isWs = (t) => !/\S/.test(t);

/** Body -> units: a deletable block (<li>..</li> or <p>..</p> with only inline tags inside) is one unit; else single tokens. */
function units(body) {
  const pieces = body.split(TAG_SPLIT);
  const toks = [];
  pieces.forEach((p, i) => { if (i % 2 === 1) toks.push({ tag: true, raw: p }); else if (p !== '') toks.push({ tag: false, raw: p }); });
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const info = t.tag ? tagInfo(t.raw) : null;
    if (info?.plain && !info.close && DELETABLE.has(info.name)) {
      let k = i + 1, ok = false;
      for (; k < toks.length; k++) {
        if (!toks[k].tag) continue;
        const ki = tagInfo(toks[k].raw);
        if (ki.plain && ki.close && ki.name === info.name) { ok = true; break; }
        if (!ki.plain || !INLINE.has(ki.name)) break;            // a block inside: not a simple point
      }
      if (ok) { out.push({ block: true, toks: toks.slice(i, k + 1) }); i = k; continue; }
    }
    out.push({ block: false, toks: [t] });
  }
  return out;
}
const unitText = (u) => u.toks.filter((t) => !t.tag).map((t) => decodeEnt(t.raw)).join('').replace(/\s+/g, ' ').trim();
const BIG = new Map();
function bigrams(s) {                              // letter pairs of a text, cached
  let m = BIG.get(s);
  if (m) return m;
  const t = s.toLowerCase().replace(/\s+/g, ' ');
  m = new Map();
  for (let i = 0; i < t.length - 1; i++) { const g = t.charCodeAt(i) * 65536 + t.charCodeAt(i + 1); m.set(g, (m.get(g) || 0) + 1); }
  m.total = Math.max(0, t.length - 1);
  if (BIG.size > 5000) BIG.clear();
  BIG.set(s, m);
  return m;
}
function similarity(x, y) {                       // Dice coefficient on letter pairs: 1 = same, 0 = nothing in common
  const a = bigrams(x), b = bigrams(y);
  const total = a.total + b.total;
  if (!total) return 1;
  let both = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [g, c] of small) { const o = big.get(g); if (o) both += Math.min(c, o); }
  return (2 * both) / total;
}
function matchCost(a, b) {
  if (a.toks.length !== b.toks.length || a.block !== b.block) return Infinity;
  let c = 0;
  for (let i = 0; i < a.toks.length; i++) {
    const x = a.toks[i], y = b.toks[i];
    if (x.tag !== y.tag) return Infinity;
    if (x.tag) { if (x.raw !== y.raw) return Infinity; continue; }
    if (x.raw === y.raw || x.raw.trim() === y.raw.trim()) continue;
    c += 0.5 + (1 - similarity(x.raw, y.raw));       // a small edit costs less than a rewrite
  }
  return c;
}
const DEL_COST = 2.5, WS_COST = 0.1;
/** A new point may only be plain text: <li>words</li> or <p>words</p>. */
const simplePoint = (u) => u.block && u.toks.length === 3 && !u.toks[1].tag && /\S/.test(u.toks[1].raw);
/** A new <li> must sit inside a list (between points or the list's own tags); a new <p> must sit outside lists. */
function placedOk(B, j) {
  const name = tagInfo(B[j].toks[0].raw).name;
  const near = (k) => {
    const u = B[k]; if (!u) return 'edge';
    if (u.block) return `block:${tagInfo(u.toks[0].raw).name}`;
    const t = u.toks[0]; if (!t.tag) return 'text';
    const ti = tagInfo(t.raw); return ti.plain ? `${ti.close ? '/' : ''}${ti.name}` : 'tag';
  };
  let prev = j - 1; while (B[prev] && !B[prev].block && !B[prev].toks[0].tag && isWs(B[prev].toks[0].raw)) prev--;
  let next = j + 1; while (B[next] && !B[next].block && !B[next].toks[0].tag && isWs(B[next].toks[0].raw)) next++;
  const p = near(prev), n = near(next);
  const inList = ['block:li', 'ul', 'ol'].includes(p) && ['block:li', '/ul', '/ol'].includes(n);
  return name === 'li' ? inList : !['block:li', 'ul', 'ol'].includes(p) && !['block:li', '/ul', '/ol'].includes(n);
}

/**
 * Compare an old and new .md file. Allowed: front-matter text values change, text inside tags changes,
 * whole <li>/<p> points deleted. Anything else throws. Returns { ops, rebuild(acceptedOps) -> newText }.
 * ops: { op:'edit', locator, old, new, raw } | { op:'delete', old, unit }
 */
export function diffMd(rel, oldText, newText) {
  const a = parseMd(oldText), b = parseMd(newText);
  if (a.hasFm !== b.hasFm || a.fmLines.length !== b.fmLines.length) throw new Error('structure-changed');
  const ops = [];
  a.fmLines.forEach((line, i) => {
    if (line === b.fmLines[i]) return;
    const m1 = FM_LINE.exec(line), m2 = FM_LINE.exec(b.fmLines[i]);
    if (!m1 || !m2 || m1[1] !== m2[1] || !MD_FRONT_MATTER_KEYS.includes(m1[1])) throw new Error('structure-changed');
    ops.push({ op: 'edit', locator: `fm:${m1[1]}`, old: JSON.parse(m1[2]), new: JSON.parse(m2[2]), fmIndex: i });
  });
  const A = units(a.pieces.join('')), B = units(b.pieces.join(''));
  // DP: cheapest way to turn A into B with: match (text may change), delete a point, add/remove whitespace.
  const n = A.length, m = B.length;
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  const step = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
  cost[n][m] = 0;
  for (let i = n; i >= 0; i--) for (let j = m; j >= 0; j--) {
    if (i === n && j === m) continue;
    let best = Infinity, s = 0;
    if (i < n && j < m) { const c = matchCost(A[i], B[j]) + cost[i + 1][j + 1]; if (c < best) { best = c; s = 1; } }
    if (i < n) {
      const del = A[i].block ? DEL_COST : (!A[i].toks[0].tag && isWs(A[i].toks[0].raw) ? WS_COST : Infinity);
      const c = del + cost[i + 1][j]; if (c < best) { best = c; s = 2; }
    }
    if (j < m && !B[j].block && !B[j].toks[0].tag && isWs(B[j].toks[0].raw)) { const c = WS_COST + cost[i][j + 1]; if (c < best) { best = c; s = 3; } }
    if (j < m && simplePoint(B[j]) && placedOk(B, j)) { const c = DEL_COST + cost[i][j + 1]; if (c < best) { best = c; s = 4; } }
    cost[i][j] = best; step[i][j] = s;
  }
  if (!Number.isFinite(cost[0][0])) throw new Error('structure-changed');
  // walk the path; number text nodes like indexMd does (non-whitespace text in document order)
  const plan = [];                                   // per A unit: { keep:true, newToks } | { keep:false }
  let i = 0, j = 0;
  while (i < n || j < m) {
    const s = step[i][j];
    if (s === 1) { plan.push({ unit: A[i], with: B[j] }); i++; j++; }
    else if (s === 2) { plan.push({ unit: A[i], with: null }); i++; }
    else if (s === 3) { j++; }
    else if (s === 4) { plan.push({ insert: B[j] }); j++; }
    else throw new Error('structure-changed');
  }
  let textNo = 0;
  for (const p of plan) {
    if (p.insert) { ops.push({ op: 'add', old: '', new: unitText(p.insert), plan: p }); continue; }
    if (!p.with) {
      if (p.unit.block) ops.push({ op: 'delete', old: unitText(p.unit), unit: p.unit });
      textNo += p.unit.toks.filter((t) => !t.tag && /\S/.test(t.raw)).length;
      continue;
    }
    p.unit.toks.forEach((t, k) => {
      if (t.tag || !/\S/.test(t.raw)) return;
      const nt = p.with.toks[k].raw;
      if (nt.trim() !== t.raw.trim()) ops.push({ op: 'edit', locator: `body:${textNo}`, old: decodeEnt(t.raw.trim()), new: decodeEnt(nt.trim()), plan: p, k });
      textNo++;
    });
  }
  /** Old text with only the accepted ops applied (anything not accepted stays as it was). */
  function rebuild(accepted) {
    const acc = new Set(accepted);
    const fm = a.fmLines.map((line, idx) => {
      const e = ops.find((o) => o.fmIndex === idx && acc.has(o));
      return e ? `${FM_LINE.exec(line)[1]}: ${JSON.stringify(e.new)}` : line;
    });
    let body = '';
    for (const p of plan) {
      if (p.insert) {
        const add = ops.find((o) => o.op === 'add' && o.plan === p);
        if (add && acc.has(add)) { const tag = tagInfo(p.insert.toks[0].raw).name; body += `<${tag}>${encodeEnt(add.new)}</${tag}>`; }
        continue;
      }
      const del = ops.find((o) => o.op === 'delete' && o.unit === p.unit);
      if (del && acc.has(del)) continue;
      p.unit.toks.forEach((t, k) => {
        const e = ops.find((o) => o.op === 'edit' && o.plan === p && o.k === k);
        if (e && acc.has(e)) { const lead = /^\s*/.exec(t.raw)[0], trail = /\s*$/.exec(t.raw)[0]; body += lead + encodeEnt(e.new) + trail; }
        else body += t.raw;
      });
    }
    return (a.hasFm ? `---\n${fm.join('\n')}\n---\n` : '') + body;
  }
  return { ops, rebuild };
}
