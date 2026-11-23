# Plan: text-request app for husseindawoudlist.com

For Ahmed. Nothing is created yet.

## What it does
1. The client and his team open a small web app on their phone (home-screen icon, no app store). Login is a one-time invite link from Ahmed.
2. They type one request, e.g. «غيّر نص الفوتر في الصفحة الرئيسية إلى …», and tap **إرسال**.
3. The app shows progress: **sent → agent editing → checking & publishing → site updating → Done, refresh**.
4. Behind it, the app starts the site agent: a **Claude Code routine** on the same repo, a fresh copy for each request. The agent pushes its edit to a branch `claude/content-<id>`.
5. The app checks that branch in code: text only, the person's own words. Only then does the app put it on the live branch. The site updates in about 1 minute.
6. **إيقاف (Stop)** on a running request: the app ignores the agent's result.
7. **تراجع (Undo)** on a finished one: the old text comes back.
8. Nobody approves. Everyone on the list can send. The client sees all requests; each team member sees their own.

## Why it stays safe
- Only the app moves the live branch for these requests. It refuses the agent's branch if:
  - any file outside the client's text files changed, or a file was added or deleted;
  - anything other than text changed: keys, HTML tags, links, image names, numbers, structure;
  - the new text has `< >`, scripts or odd characters, is far too long, or breaks `%d`;
  - the new text has words the requester didn't write.
- Login: invite links work once and expire after 7 days. Ahmed can block anyone at once.
- Phone alerts carry no text.
- Audit log, append-only, on the admin page: who asked, what changed, commit hash, time.
- Secrets live in Cloudflare only. The GitHub token is for this repo only, Contents write.

## Text files (the rest is design and stays untouched)
`elections.json` (about 600 strings), `content/ar/**/*.md` (titles, descriptions, text between tags), and a few `client.json` text keys. The full list is in `src/config.js`.

## Pieces
| Piece | Where | Notes |
|---|---|---|
| Worker `tanta-content-bot` | Cloudflare (Syncology), free plan | App + API + admin page; cron every 2 min |
| D1 `tanta-content-bot` | Cloudflare | people, requests, audit |
| Routine "Tanta text requests" | claude.ai/code/routines (Ahmed's account) | The agent. Prompt in `docs/ROUTINE.md` |
| Secrets | Cloudflare | `GITHUB_TOKEN`, `ADMIN_KEY`, `ROUTINE_TOKEN`, `VAPID_PRIVATE_JWK`, optional `CF_PAGES_TOKEN` |

## Monthly cost
| Item | Cost |
|---|---|
| Cloudflare Worker, D1, cron (free plan) | $0 |
| Agent runs | Your Claude subscription (no extra bill). Limit: 30 runs/hour |
| Phone alerts | $0 |
| GitHub, Pages builds (1 per change, 500/month free) | $0 |
| **Total extra** | **$0** |

Risk: the free plan allows 10 ms CPU per run. If logs show error 1102, switch to Workers Paid ($5/month). No code change needed.

## Limits
- Anthropic's routine trigger is a "research preview" and may change.
- A routine run can't be stopped from outside. Stop means "ignore it and delete its branch".
- iPhone alerts need "Add to Home Screen" (iOS 16.4+).
- The bot changes existing text only. It can't add new fields.
