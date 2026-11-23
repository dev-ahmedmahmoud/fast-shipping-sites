// Is the change visible yet? With a read-only Cloudflare Pages token: wait for the production build.
// Without it: open the real page on the website and look for the new text (or that a deleted point is gone).
import { toAsciiDigits } from './validate.js';

const norm = (s) => toAsciiDigits(String(s)).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[\u0640\u064B-\u065F]/g, '').replace(/\s+/g, ' ').trim();

async function visibleOnSite(env, edits, fetchImpl) {
  const e = edits.find((x) => x.op !== 'delete' && x.new) || edits[0];
  if (!e || !env.SITE_URL) return null;
  const res = await fetchImpl(`${env.SITE_URL}${e.route || '/'}?_v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' }, cf: { cacheTtl: 0 } });
  if (!res.ok) return null;
  const html = norm(await res.text());
  const probe = norm(e.op === 'delete' ? e.old : e.new).slice(0, 60);
  if (!probe) return null;
  return e.op === 'delete' ? !html.includes(probe) : html.includes(probe);
}

export async function buildState(env, sinceSec, fetchImpl = (...a) => fetch(...a), edits = []) {
  const age = Date.now() / 1000 - sinceSec;
  if (env.CF_PAGES_TOKEN && env.CF_ACCOUNT_ID && env.PAGES_PROJECT) {
    const res = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${env.PAGES_PROJECT}/deployments?env=production&per_page=5`,
      { headers: { Authorization: `Bearer ${env.CF_PAGES_TOKEN}` } });
    if (res.ok) {
      const j = await res.json();
      for (const d of j.result || []) {
        if (Date.parse(d.created_on) / 1000 < sinceSec - 5) continue;          // a build that started after our commit
        if (d.latest_stage?.name === 'deploy' && d.latest_stage?.status === 'success') return 'success';
        if (d.latest_stage?.status === 'failure') return 'failure';
      }
      return age > 3600 ? 'success' : 'pending';
    }
  }
  try {
    const seen = await visibleOnSite(env, edits, fetchImpl);
    if (seen === true) return 'success';
  } catch { /* site not reachable: keep waiting */ }
  return age > 3600 ? 'success' : 'pending';                                  // after an hour stop waiting
}
