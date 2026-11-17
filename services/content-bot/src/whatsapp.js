// WhatsApp Business Cloud API: signature check, webhook parsing, sending.
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmacSha256Hex(secret, body) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
}
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/** X-Hub-Signature-256: "sha256=<hex>" over the RAW body. */
export async function verifySignature(appSecret, header, rawBody) {
  if (!appSecret || !header || !header.startsWith('sha256=')) return false;
  return safeEqual(header.slice(7).toLowerCase(), await hmacSha256Hex(appSecret, rawBody));
}

/** -> [{ from, id, type, text, ts }] for our phone number only. */
export function parseWebhook(payload, phoneNumberId) {
  const out = [];
  if (payload?.object !== 'whatsapp_business_account') return out;
  for (const entry of payload.entry || []) for (const ch of entry.changes || []) {
    const v = ch.value;
    if (!v?.messages || (phoneNumberId && v.metadata?.phone_number_id !== phoneNumberId)) continue;
    for (const m of v.messages) {
      out.push({ from: String(m.from || '').replace(/\D/g, ''), id: m.id, type: m.type, text: m.type === 'text' ? m.text?.body ?? '' : '', ts: Number(m.timestamp) || 0 });
    }
  }
  return out;
}

export class WhatsApp {
  constructor({ token, phoneNumberId, graphVersion = 'v26.0', fetchImpl = fetch }) {
    Object.assign(this, { token, phoneNumberId, graphVersion, fetchImpl });
  }
  async post(body) {
    const res = await this.fetchImpl(`https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    });
    if (!res.ok) {
      let code; try { code = (await res.json())?.error?.code; } catch { /* ignore */ }
      const e = new Error(`whatsapp send -> ${res.status}${code ? ` (code ${code})` : ''}`);
      e.status = res.status; e.code = code;
      throw e;
    }
  }
  sendText(to, text) { return this.post({ to, type: 'text', text: { body: text.slice(0, 4000), preview_url: true } }); }
  /** params: array of strings. WhatsApp forbids newlines/tabs in template params. */
  sendTemplate(to, name, lang, params) {
    const clean = params.map((p) => String(p).replace(/[\n\r\t]+/g, ' ').replace(/ {5,}/g, '    ').slice(0, 900));
    return this.post({
      to, type: 'template',
      template: { name, language: { code: lang }, components: [{ type: 'body', parameters: clean.map((text) => ({ type: 'text', text })) }] },
    });
  }
}
