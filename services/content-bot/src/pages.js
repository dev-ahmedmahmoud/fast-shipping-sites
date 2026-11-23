// Is the newest production build of the site finished? Uses a read-only Cloudflare token (optional).
// Without the token the app simply waits 90 seconds after publishing.
export async function buildState(env, sinceSec, fetchImpl = (...a) => fetch(...a)) {
  if (!env.CF_PAGES_TOKEN || !env.CF_ACCOUNT_ID || !env.PAGES_PROJECT) return Date.now() / 1000 - sinceSec >= 90 ? 'success' : 'pending';
  const res = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${env.PAGES_PROJECT}/deployments?env=production&per_page=5`,
    { headers: { Authorization: `Bearer ${env.CF_PAGES_TOKEN}` } });
  if (!res.ok) return Date.now() / 1000 - sinceSec >= 90 ? 'success' : 'pending';
  const j = await res.json();
  for (const d of j.result || []) {
    if (Date.parse(d.created_on) / 1000 < sinceSec - 5) continue;            // a build that started after our commit
    if (d.latest_stage?.name === 'deploy' && d.latest_stage?.status === 'success') return 'success';
    if (d.latest_stage?.status === 'failure') return 'failure';
  }
  return Date.now() / 1000 - sinceSec > 900 ? 'success' : 'pending';      // after 15 minutes stop waiting
}
