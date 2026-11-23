// A read-only snapshot of the client's text at ONE git commit. build() applies checked edits and re-verifies the files.
import { indexFile, applyEdits, verifyEdits, kindOfFile } from './segments.js';
import { pathAllowed } from './config.js';

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
  }

  /** Apply edits {file, locator, old, new}; the old text must still be there. Returns { ok, files } or { ok:false, code }. */
  build(edits) {
    const byFile = new Map();
    for (const e of edits) {
      const cur = this.segments.find((s) => s.file === e.file && s.locator === e.locator);
      if (!cur || cur.text !== e.old) return { ok: false, code: 'stale' };
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
    return { ok: true, files };
  }
}
