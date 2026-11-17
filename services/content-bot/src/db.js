export const nowSec = () => Math.floor(Date.now() / 1000);

export async function audit(db, { actor, event, changeId = null, detail = null, commit = null }) {
  const d = detail == null ? null : String(detail).slice(0, 2000);
  await db.prepare('INSERT INTO audit (ts, actor, event, change_id, detail, commit_sha) VALUES (?,?,?,?,?,?)')
    .bind(nowSec(), actor, event, changeId, d, commit).run();
}

export const personById = (db, id) => db.prepare('SELECT * FROM people WHERE id = ?').bind(id).first();
export const activeClient = (db) => db.prepare("SELECT * FROM people WHERE role = 'client' AND active = 1").first();

/** Counts a hit in a fixed window. Returns { n, over } where over = n > limit. */
export async function hit(db, key, windowSec, limit) {
  const w = Math.floor(nowSec() / windowSec);
  await db.prepare('INSERT INTO rate (key, window, n) VALUES (?,?,1) ON CONFLICT(key, window) DO UPDATE SET n = n + 1').bind(key, w).run();
  const row = await db.prepare('SELECT n FROM rate WHERE key = ? AND window = ?').bind(key, w).first();
  return { n: row.n, over: row.n > limit };
}

/** True the first time a key is seen (queue jobs can be delivered twice). */
export async function firstSight(db, key) {
  const r = await db.prepare('INSERT OR IGNORE INTO seen_jobs (key, created_at) VALUES (?,?)').bind(key, nowSec()).run();
  return (r.meta?.changes ?? 0) === 1;
}

export async function addChat(db, personId, kind, text, changeId = null) {
  const r = await db.prepare('INSERT INTO chat (person_id, kind, text, change_id, created_at) VALUES (?,?,?,?,?) RETURNING id')
    .bind(personId, kind, String(text).slice(0, 4000), changeId, nowSec()).first();
  return r.id;
}
/** Recent user/reply lines before message `beforeId`, oldest first (short memory for questions). */
export async function recentChat(db, personId, beforeId, minutes) {
  const r = await db.prepare("SELECT kind, text FROM chat WHERE person_id = ? AND id < ? AND kind IN ('user','reply') AND created_at > ? ORDER BY id DESC LIMIT 8")
    .bind(personId, beforeId, nowSec() - minutes * 60).all();
  return r.results.reverse().map((x) => ({ role: x.kind === 'user' ? 'user' : 'assistant', content: x.text }));
}

export async function housekeeping(db) {
  const t = nowSec();
  await db.prepare('DELETE FROM seen_jobs WHERE created_at < ?').bind(t - 7 * 86400).run();
  await db.prepare('DELETE FROM rate WHERE window < ?').bind(Math.floor(t / 3600) - 48).run();
  await db.prepare('DELETE FROM invites WHERE expires_at < ? AND used_at IS NULL').bind(t - 86400).run();
}

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newChangeId() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return [...b].map((x) => ID_ALPHABET[x % ID_ALPHABET.length]).join('');
}
