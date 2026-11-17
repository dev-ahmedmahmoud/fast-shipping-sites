#!/usr/bin/env bash
# One-shot setup. NOT RUN YET: it creates real Cloudflare resources, so it needs Ahmed's yes first.
# Needs: CLOUDFLARE_API_TOKEN (Workers + D1 edit, Syncology account) and CLOUDFLARE_ACCOUNT_ID in your shell.
# Secrets are read from the environment names below and piped straight into Cloudflare. They are never printed or stored.
#   ANTHROPIC_API_KEY  GITHUB_TOKEN  (WhatsApp ones can be added later with: ./scripts/setup.sh whatsapp)
set -euo pipefail
cd "$(dirname "$0")/.."
secret() { # secret NAME  (value comes from the env var of the same name)
  [ -n "${!1:-}" ] || { echo "skip $1 (not set in environment)"; return 0; }
  printf '%s' "${!1}" | npx wrangler secret put "$1" >/dev/null && echo "set secret $1"
}
if [ "${1:-}" = "whatsapp" ]; then
  secret WHATSAPP_TOKEN; secret META_APP_SECRET; secret WEBHOOK_VERIFY_TOKEN
  echo "Now put PHONE_NUMBER_ID in wrangler.toml [vars] and run: npx wrangler deploy"; exit 0
fi
npm ci
if grep -q REPLACE_AFTER_D1_CREATE wrangler.toml; then
  out=$(npx wrangler d1 create tanta-content-bot)
  id=$(printf '%s' "$out" | grep -oE '[0-9a-f]{8}-[0-9a-f-]{27}' | head -1)
  sed -i "s/REPLACE_AFTER_D1_CREATE/$id/" wrangler.toml
  echo "D1 created. Commit the database_id in wrangler.toml (it is not a secret)."
fi
npx wrangler d1 migrations apply tanta-content-bot --remote
npx wrangler deploy
secret ANTHROPIC_API_KEY; secret GITHUB_TOKEN
echo "Worker URL is printed above. Webhook URL = <worker url>/webhook"
