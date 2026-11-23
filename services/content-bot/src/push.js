// Web Push alerts with NO content: the phone only shows "you have a new message" and opens the app.
// No message text ever goes through Apple/Google push servers. Signed with VAPID (ES256).
import { b64url } from './auth.js';

const enc = new TextEncoder();
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/** Public key for the browser = 0x04 || x || y (base64url), derived from the private JWK. */
export function publicKeyFromJwk(jwk) {
  const x = fromB64url(jwk.x), y = fromB64url(jwk.y);
  const out = new Uint8Array(65); out[0] = 4; out.set(x, 1); out.set(y, 33);
  return b64url(out);
}

async function vapidAuth(env, endpoint) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${publicKeyFromJwk(jwk)}`;
}

export class Push {
  constructor({ env, db, fetchImpl = (...a) => fetch(...a) }) { Object.assign(this, { env, db, fetchImpl }); }
  /** Alert every device of this person. Dead subscriptions are removed. Never throws. */
  async notify(personId) {
    if (!this.env.VAPID_PRIVATE_JWK) return;
    const subs = await this.db.prepare('SELECT endpoint FROM push_subs WHERE person_id = ?').bind(personId).all();
    for (const { endpoint } of subs.results) {
      try {
        const res = await this.fetchImpl(endpoint, { method: 'POST', headers: { TTL: '86400', Urgency: 'high', 'Content-Length': '0', Authorization: await vapidAuth(this.env, endpoint) } });
        if (res.status === 404 || res.status === 410) await this.db.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(endpoint).run();
      } catch { /* an alert is best effort; the message is in the app anyway */ }
    }
  }
}

/** Only real browser push services are accepted as endpoints. */
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.mozilla\.com$/, /\.mozaws\.net$/, /\.notify\.windows\.com$/];
export function validEndpoint(s) {
  try { const u = new URL(s); return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname)) && s.length < 1000; } catch { return false; }
}
