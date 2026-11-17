import { verifySignature, parseWebhook, WhatsApp, safeEqual } from './whatsapp.js';
import { GitHub } from './github.js';
import { Bot } from './flow.js';
import { makeSdkCaller } from './claude.js';
import { loadStore } from './store.js';
import { pathAllowed } from './config.js';
import { audit, housekeeping } from './db.js';

export function makeBot(env, overrides = {}) {
  const gh = overrides.gh || new GitHub({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, clientDir: env.CLIENT_DIR, pathAllowed: (p) => pathAllowed(env.CLIENT_DIR, p) });
  return new Bot({
    env, db: env.DB, gh,
    wa: overrides.wa || new WhatsApp({ token: env.WHATSAPP_TOKEN, phoneNumberId: env.PHONE_NUMBER_ID, graphVersion: env.GRAPH_VERSION }),
    callModel: overrides.callModel || makeSdkCaller(env),
    loadStore: overrides.loadStore || ((tip) => loadStore(gh, tip, env.CLIENT_DIR)),
  });
}

async function processMessages(env, messages) {
  const bot = makeBot(env);
  for (const m of messages) {
    try { await bot.handle(m); }
    catch (e) { try { await audit(env.DB, { actor: 'bot', event: 'fatal', detail: String(e.message).slice(0, 300) }); } catch { /* nothing more to do */ } }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname !== '/webhook') return new Response('not found', { status: 404 });

    if (request.method === 'GET') {                       // Meta's one-time webhook check
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && safeEqual(url.searchParams.get('hub.verify_token') || '', env.WEBHOOK_VERIFY_TOKEN || '-');
      return ok ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 }) : new Response('forbidden', { status: 403 });
    }
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

    const raw = await request.text();
    if (raw.length > 262144) return new Response('too large', { status: 413 });
    if (!(await verifySignature(env.META_APP_SECRET, request.headers.get('x-hub-signature-256'), raw))) {
      try { await audit(env.DB, { actor: 'unknown', event: 'bad_signature' }); } catch { /* ignore */ }
      return new Response('bad signature', { status: 401 });
    }
    let payload;
    try { payload = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
    const messages = parseWebhook(payload, env.PHONE_NUMBER_ID);
    if (messages.length) ctx.waitUntil(processMessages(env, messages));
    return new Response('ok');
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => { await makeBot(env).expireAll(); await housekeeping(env.DB); })());
  },
};
