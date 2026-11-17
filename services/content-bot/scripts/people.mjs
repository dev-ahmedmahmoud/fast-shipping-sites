#!/usr/bin/env node
// Manage who may talk to the bot (the allowlist) and read the audit log. Runs SQL on the REMOTE D1 via wrangler.
//   node scripts/people.mjs list
//   node scripts/people.mjs add 201012345678 "Name" cabinet [ar|en]
//   node scripts/people.mjs set-client 201012345678 "Name" [ar|en]     (replaces the one client)
//   node scripts/people.mjs remove 201012345678
//   node scripts/people.mjs audit [N] [change-id]
// Add --dry to only print the SQL. Numbers: digits with country code, no + (Egypt: 20 + number without the 0).
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2).filter((a) => a !== '--dry');
const dry = process.argv.includes('--dry');
const DB = process.env.D1_NAME || 'tanta-content-bot';
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const die = (m) => { console.error(m); process.exit(1); };
const phone = (p) => { const d = String(p ?? '').replace(/[\s+\-()]/g, ''); if (!/^\d{8,15}$/.test(d)) die('Phone must be digits with country code, e.g. 201012345678'); return d; };
const name = (n) => { if (!n || n.length > 60 || /[\r\n]/.test(n)) die('Give a short name'); return n; };
const lang = (l) => (l === 'en' ? 'en' : 'ar');

function run(sql) {
  if (dry) return console.log(sql);
  const r = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', sql], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const [cmd, a, b, c, d] = args;
const now = Math.floor(Date.now() / 1000);
switch (cmd) {
  case 'list': run('SELECT name, role, lang, active, substr(phone,1,5) || "******" AS phone_hint FROM people ORDER BY role, name'); break;
  case 'add':
    if (!['cabinet', 'client'].includes(c)) die('Role must be cabinet or client (use set-client to replace the client)');
    if (c === 'client') die('Use set-client for the client');
    run(`INSERT INTO people (name, phone, role, lang, created_at) VALUES (${q(name(b))}, ${q(phone(a))}, 'cabinet', ${q(lang(d))}, ${now}) ON CONFLICT(phone) DO UPDATE SET active = 1, name = excluded.name, lang = excluded.lang WHERE people.role = 'cabinet'`);
    break;
  case 'set-client':
    run(`UPDATE people SET active = 0 WHERE role = 'client'; INSERT INTO people (name, phone, role, lang, created_at) VALUES (${q(name(b))}, ${q(phone(a))}, 'client', ${q(lang(c))}, ${now}) ON CONFLICT(phone) DO UPDATE SET active = 1, name = excluded.name, role = 'client', lang = excluded.lang`);
    break;
  case 'remove': run(`UPDATE people SET active = 0 WHERE phone = ${q(phone(a))} AND role = 'cabinet'`); break;
  case 'audit': {
    const n = Math.min(Number(a) || 30, 500);
    const where = b ? `WHERE change_id = ${q(String(b).toUpperCase())}` : '';
    run(`SELECT datetime(ts,'unixepoch') AS time_utc, actor, event, change_id, substr(detail,1,120) AS detail, substr(commit_sha,1,10) AS commit_sha FROM audit ${where} ORDER BY id DESC LIMIT ${n}`);
    break;
  }
  default: die('Commands: list | add <phone> <name> cabinet [ar|en] | set-client <phone> <name> [ar|en] | remove <phone> | audit [N] [change-id]');
}
