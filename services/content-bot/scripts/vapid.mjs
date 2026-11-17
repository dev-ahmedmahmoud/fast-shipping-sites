#!/usr/bin/env node
// Makes the push-alert key pair. Prints ONLY the private key (JSON), so it can be piped straight into a secret:
//   node scripts/vapid.mjs | npx wrangler secret put VAPID_PRIVATE_JWK
const { privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', privateKey);
process.stdout.write(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }));
