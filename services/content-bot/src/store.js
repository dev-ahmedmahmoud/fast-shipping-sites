// A read-only snapshot of the client's text at ONE git commit, plus the strict "plan an edit" gate.
import { indexFile, applyEdits, verifyEdits, kindOfFile } from './segments.js';
import { pathAllowed, LIMITS } from './config.js';
import { checkNewText, normalize, tokens } from './validate.js';

export async function loadStore(gh, tip, clientDir) {
  const all = await gh.readClientFiles(tip);
  const files = new Map([...all].filter(([rel]) => kindOfFile(rel) && pathAllowed(clientDir, `${clientDir}/${rel}`)));
  return new Store(tip, files);
}

export class Store {
  constructor(tip, files) {
    this.tip = tip;
    this.files = files;
    this.segments = [];
    this.skipped = [];                 // a file we cannot rewrite safely is skipped, the rest keeps working
    for (const [rel, text] of files) {
      try { this.segments.push(...indexFile(rel, text)); } catch (e) { this.skipped.push(`${rel}: ${e.message}`); files.delete(rel); }
    }
    for (const s of this.segments) { s.norm = normalize(s.text); s.toks = new Set(tokens(s.text)); }   // once, for fast search
    this.byRef = new Map(this.segments.map((s) => [s.ref, s]));
    if (this.byRef.size !== this.segments.length) throw new Error('duplicate segment refs');
  }

  pageKey(s) {
    if (s.file !== 'elections.json') return s.file;
    const p = s.locator.split('/');
    return `${s.file}#${['candidates', 'files'].includes(p[1]) ? p.slice(1, 3).join('/') : p[1]}`;
  }
  pages() {
    const m = new Map();
    for (const s of this.segments) {
      const k = this.pageKey(s);
      const e = m.get(k) || { key: k, label: s.page.label.ar, count: 0 };
      e.count++; m.set(k, e);
    }
    return [...m.values()];
  }
  page(key) { return this.segments.filter((s) => this.pageKey(s) === key); }
  find(query, limit = 12) {
    const qt = tokens(query);
    if (!qt.length) return [];
    const q = normalize(query);
    return this.segments
      .map((s) => {
        const n = s.norm, st = s.toks;
        const score = n.includes(q) ? 1 + q.length / (n.length + 1) : qt.filter((t) => st.has(t) || n.includes(t)).length / qt.length;
        return { s, score };
      })
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.s);
  }

  /**
   * The gate. edits = [{ ref, new_text }]. Returns { ok:true, edits, files } or { ok:false, code, ref? }.
   * `files` holds the full new text of every changed file; structure was re-verified independently.
   */
  plan(rawEdits, requestTexts) {
    if (!Array.isArray(rawEdits) || !rawEdits.length) return { ok: false, code: 'type' };
    if (rawEdits.length > LIMITS.maxEditsPerChange) return { ok: false, code: 'too_many' };
    const seen = new Set();
    const edits = [];
    for (const e of rawEdits) {
      const seg = this.byRef.get(e?.ref);
      if (!seg) return { ok: false, code: 'unknown_ref', ref: e?.ref };
      if (seen.has(seg.ref)) return { ok: false, code: 'duplicate', ref: seg.ref };
      seen.add(seg.ref);
      const r = checkNewText(seg, e.new_text, requestTexts);
      if (!r.ok) return { ok: false, code: r.code, ref: seg.ref };
      edits.push({ file: seg.file, locator: seg.locator, old: seg.text, new: r.value, kind: seg.kind, page: seg.page });
    }
    return this.build(edits);
  }

  /** Apply already-validated edits {file,locator,old,new} to this snapshot. Used for preview, approve and undo. */
  build(edits) {
    const byFile = new Map();
    for (const e of edits) {
      const cur = this.segments.find((s) => s.file === e.file && s.locator === e.locator);
      if (!cur || cur.text !== e.old) return { ok: false, code: 'stale', ref: cur?.ref };
      (byFile.get(e.file) || byFile.set(e.file, []).get(e.file)).push(e);
    }
    const files = {};
    for (const [rel, list] of byFile) {
      const oldText = this.files.get(rel);
      const newText = applyEdits(rel, oldText, list);
      try { verifyEdits(rel, oldText, newText, list.map((e) => e.locator)); } catch { return { ok: false, code: 'structure' }; }
      if (newText === oldText) return { ok: false, code: 'same' };
      files[rel] = newText;
    }
    return { ok: true, edits, files };
  }
}
