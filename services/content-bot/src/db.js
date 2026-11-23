export const nowSec = () => Math.floor(Date.now() / 1000);

export async function audit(db, { actor, event, changeId = null, detail = null, commit = null }) {
  const d = detail == null ? null : String(detail).slice(0, 2000);
  await db.prepare('INSERT INTO audit (ts, actor, event, change_id, detail, commit_sha) VALUES (?,?,?,?,?,?)')
    .bind(nowSec(), actor, event, changeId, d, commit).run();
}

export const personById = (db, id) => db.prepare('SELECT * FROM people WHERE id = ?').bind(id).first();

/** Counts a hit in a fixed window. Returns { n, over } where over = n > limit. */
export async function hit(db, key, windowSec, limit) {
  const w = Math.floor(nowSec() / windowSec);
  await db.prepare('INSERT INTO rate (key, window, n) VALUES (?,?,1) ON CONFLICT(key, window) DO UPDATE SET n = n + 1').bind(key, w).run();
  const row = await db.prepare('SELECT n FROM rate WHERE key = ? AND window = ?').bind(key, w).first();
  return { n: row.n, over: row.n > limit };
}

export async function housekeeping(db) {
  const t = nowSec();
  await db.prepare('DELETE FROM rate WHERE window < ?').bind(Math.floor(t / 86400) - 3).run();
  await db.prepare('DELETE FROM invites WHERE expires_at < ? AND used_at IS NULL').bind(t - 86400).run();
}

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newId() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return [...b].map((x) => ID_ALPHABET[x % ID_ALPHABET.length]).join('');
}
