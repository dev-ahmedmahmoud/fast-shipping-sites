// Invite links, login cookies, admin key. Tokens are random; only their SHA-256 is stored.
import { nowSec, hit } from './db.js';

const enc = new TextEncoder();
export const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
export async function sha256hex(s) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const SESSION_DAYS = 180, INVITE_DAYS = 7;
export const sessionCookie = (token) => `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
export const clearCookie = 'sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

export function readCookie(request, name) {
  const c = request.headers.get('cookie') || '';
  const m = c.split(/;\s*/).find((p) => p.startsWith(name + '='));
  return m ? m.slice(name.length + 1) : null;
}

/** The logged-in, active person for this request, or null. */
export async function currentPerson(db, request) {
  const token = readCookie(request, 'sid');
  if (!token || token.length > 100) return null;
  const h = await sha256hex(token);
  const row = await db.prepare(`SELECT p.*, s.last_seen AS s_last_seen FROM sessions s JOIN people p ON p.id = s.person_id
    WHERE s.token_hash = ? AND s.revoked = 0 AND p.active = 1 AND s.created_at > ?`).bind(h, nowSec() - SESSION_DAYS * 86400).first();
  if (row && nowSec() - row.s_last_seen > 3600) await db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').bind(nowSec(), h).run();
  return row;
}

export async function createInvite(db, personId) {
  const token = randomToken();
  await db.prepare('INSERT INTO invites (token_hash, person_id, created_at, expires_at) VALUES (?,?,?,?)')
    .bind(await sha256hex(token), personId, nowSec(), nowSec() + INVITE_DAYS * 86400).run();
  return token;
}

/** One-time: marks the invite used and opens a session. Returns { token, person } or null. */
export async function redeemInvite(db, inviteToken) {
  if (typeof inviteToken !== 'string' || inviteToken.length < 20 || inviteToken.length > 100) return null;
  const h = await sha256hex(inviteToken);
  const used = await db.prepare('UPDATE invites SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING person_id')
    .bind(nowSec(), h, nowSec()).first();
  if (!used) return null;
  const person = await db.prepare('SELECT * FROM people WHERE id = ? AND active = 1').bind(used.person_id).first();
  if (!person) return null;
  const token = randomToken();
  await db.prepare('INSERT INTO sessions (token_hash, person_id, created_at, last_seen) VALUES (?,?,?,?)')
    .bind(await sha256hex(token), person.id, nowSec(), nowSec()).run();
  return { token, person };
}

/** Admin requests carry X-Admin-Key. After 10 wrong keys in an hour, that IP is blocked for the hour. */
export async function isAdmin(db, request, env) {
  const key = request.headers.get('x-admin-key') || '';
  const ip = await sha256hex(request.headers.get('cf-connecting-ip') || 'unknown');
  const w = Math.floor(nowSec() / 3600);
  const fails = await db.prepare('SELECT n FROM rate WHERE key = ? AND window = ?').bind(`adminfail:${ip}`, w).first();
  if ((fails?.n || 0) >= 10) return false;
  const ok = !!env.ADMIN_KEY && env.ADMIN_KEY.length >= 24 && safeEqual(key, env.ADMIN_KEY);
  if (!ok) await hit(db, `adminfail:${ip}`, 3600, 10);
  return ok;
}
