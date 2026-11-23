#!/usr/bin/env bash
# One-shot setup on the Syncology Cloudflare account (Workers FREE plan). Creates: D1, Worker, push key.
# Needs CLOUDFLARE_API_TOKEN (Workers Scripts + D1: Edit) and CLOUDFLARE_ACCOUNT_ID.
# It never sees GITHUB_TOKEN, ADMIN_KEY or ROUTINE_TOKEN: Ahmed types those into the Cloudflare dashboard.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
if grep -q REPLACE_AFTER_D1_CREATE wrangler.toml; then
  out=$(npx wrangler d1 create tanta-content-bot)
  id=$(printf '%s' "$out" | grep -oE '[0-9a-f]{8}-[0-9a-f-]{27}' | head -1)
  sed -i "s/REPLACE_AFTER_D1_CREATE/$id/" wrangler.toml
  echo "D1 created. Commit the database_id in wrangler.toml (it is not a secret)."
fi
npx wrangler d1 migrations apply tanta-content-bot --remote
npx wrangler deploy
# Push-alert key: made here and piped straight into Cloudflare (never printed, never stored).
node scripts/vapid.mjs | npx wrangler secret put VAPID_PRIVATE_JWK >/dev/null && echo "set secret VAPID_PRIVATE_JWK"
echo "Done. App = the workers.dev URL above. Admin page = <that URL>/admin"
echo "Ahmed sets in the dashboard: GITHUB_TOKEN, ADMIN_KEY, ROUTINE_TOKEN (Workers > tanta-content-bot > Settings > Variables and Secrets)"
