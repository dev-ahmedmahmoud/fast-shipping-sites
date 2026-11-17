export const nowSec = () => Math.floor(Date.now() / 1000);

export async function sha8(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function audit(db, { actor, event, changeId = null, detail = null, commit = null }) {
  const d = detail == null ? null : String(detail).slice(0, 2000);
  await db.prepare('INSERT INTO audit (ts, actor, event, change_id, detail, commit_sha) VALUES (?,?,?,?,?,?)')
    .bind(nowSec(), actor, event, changeId, d, commit).run();
}

export const personByPhone = (db, phone) =>
  db.prepare('SELECT * FROM people WHERE phone = ? AND active = 1').bind(phone).first();
export const personById = (db, id) => db.prepare('SELECT * FROM people WHERE id = ?').bind(id).first();
export const activeClient = (db) => db.prepare("SELECT * FROM people WHERE role = 'client' AND active = 1").first();

/** Counts a hit in a fixed window. Returns { n, over } where over = n > limit. */
export async function hit(db, key, windowSec, limit) {
  const w = Math.floor(nowSec() / windowSec);
  await db.prepare('INSERT INTO rate (key, window, n) VALUES (?,?,1) ON CONFLICT(key, window) DO UPDATE SET n = n + 1').bind(key, w).run();
  const row = await db.prepare('SELECT n FROM rate WHERE key = ? AND window = ?').bind(key, w).first();
  return { n: row.n, over: row.n > limit };
}

/** True the first time a WhatsApp message id is seen. */
export async function firstSight(db, wamid) {
  const r = await db.prepare('INSERT OR IGNORE INTO seen_messages (wamid, created_at) VALUES (?,?)').bind(wamid, nowSec()).run();
  return (r.meta?.changes ?? 0) === 1;
}

export async function addConvo(db, personId, role, content) {
  await db.prepare('INSERT INTO convo (person_id, role, content, created_at) VALUES (?,?,?,?)')
    .bind(personId, role, String(content).slice(0, 2000), nowSec()).run();
}
export async function recentConvo(db, personId, minutes) {
  const r = await db.prepare('SELECT role, content FROM convo WHERE person_id = ? AND created_at > ? ORDER BY id DESC LIMIT 8')
    .bind(personId, nowSec() - minutes * 60).all();
  return r.results.reverse();
}

export async function housekeeping(db) {
  const t = nowSec();
  await db.prepare('DELETE FROM convo WHERE created_at < ?').bind(t - 86400).run();
  await db.prepare('DELETE FROM seen_messages WHERE created_at < ?').bind(t - 7 * 86400).run();
  await db.prepare('DELETE FROM rate WHERE window < ?').bind(Math.floor(t / 3600) - 48).run();
}

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newChangeId() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return [...b].map((x) => ID_ALPHABET[x % ID_ALPHABET.length]).join('');
}
