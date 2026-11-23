// Serves the app files packed into src/static.js, with the security headers from public/_headers.
import { FILES, HEADERS_FILE } from './static.js';

function parseHeaders(text) {
  const rules = []; let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { path: line.trim(), headers: {} }; rules.push(cur); continue; }
    const i = line.indexOf(':');
    if (cur && i > 0) cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
const RULES = parseHeaders(HEADERS_FILE);
const bin = new Map();

export function serveStatic(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405 });
  let path = new URL(request.url).pathname;
  if (path === '/' || !FILES[path]) path = path === '/admin' || path === '/admin/' ? '/admin.html' : FILES[path] ? path : '/index.html';
  const f = FILES[path];
  const headers = { 'Content-Type': f.type, 'Cache-Control': 'no-cache' };
  for (const r of RULES) if (r.path === '/*' || r.path === path) Object.assign(headers, r.headers);
  let body = f.text;
  if (f.b64) {
    if (!bin.has(path)) bin.set(path, Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)));
    body = bin.get(path);
    headers['Cache-Control'] = 'public, max-age=86400';
  }
  return new Response(request.method === 'HEAD' ? null : body, { headers });
}
