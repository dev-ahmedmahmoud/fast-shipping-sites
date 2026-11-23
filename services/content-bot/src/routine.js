// Starts one run of the site agent: a Claude Code routine with an API trigger.
// Docs: https://code.claude.com/docs/en/routines  (POST .../routines/{id}/fire, research preview)
export async function fireRoutine(env, text, fetchImpl = fetch) {
  const res = await fetchImpl(`https://api.anthropic.com/v1/claude_code/routines/${env.ROUTINE_ID}/fire`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ROUTINE_TOKEN}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'experimental-cc-routine-2026-04-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) { const e = new Error(`routine fire -> ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  return j.claude_code_session_url || null;
}

/** The request as the agent receives it. The routine's saved prompt (docs/ROUTINE.md) says what to do with it. */
export function payload(req, person, env) {
  const b = `claude/content-${req.id.toLowerCase()}`;
  return [
    `REQUEST_ID: ${req.id}`,
    `LIVE_BRANCH: ${env.LIVE_BRANCH}`,
    `PUSH_BRANCH: ${b}`,
    `REFUSE_BRANCH: ${b}-refused`,
    `FROM: ${person.name.replace(/[\r\n]/g, ' ')} (${person.role})`,
    'REQUEST:',
    req.text,
  ].join('\n');
}
