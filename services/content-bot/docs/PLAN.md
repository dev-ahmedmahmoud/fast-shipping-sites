# Plan: text-edit chat app for husseindawoudlist.com

For Ahmed. Nothing is created yet.

## What it does
1. The client and his cabinet open a small web app on their phone (icon on the home screen, no app store).
2. They type, in Arabic: "غيّر الشعار في الصفحة الرئيسية إلى ...".
3. The app shows a card: page, **old text -> new text**, a **Preview** button, and an ID (e.g. `K7M2QX`).
4. Only the **client** sees **Publish** (نشر). A cabinet request goes to him with a phone alert.
5. Publish -> commit to the live branch -> the site updates in about 1 minute.
6. **Undo** (تراجع), client only, puts the old text back. **Reject** (رفض), or 24 hours with no answer, drops the change.
7. Login is by one-time invite link from Ahmed. No link = no access.

## Safety (in code, not only in the AI prompt)
- Claude only *proposes*. The server checks every change before git: same file, same keys and structure, only existing string values, no `< >` or scripts, length limit, only the client's folder.
- **Every new word must come from the person's own message.** The bot never writes slogans itself. If the text is unclear, it asks.
- Design or layout request -> "أستطيع تغيير النصوص فقط. للتعديلات على التصميم تواصل مع أحمد."
- Messages are treated as data, never as instructions. Per-person rate limit.
- Invite links work once and expire after 7 days. Ahmed can block anyone instantly.
- Phone alerts carry **no text**. They only say "new message", so nothing passes through Apple or Google.
- Audit log in D1 (append-only): who asked what, who approved, commit hash, time. Visible on the admin page.
- Secrets only in Cloudflare. The GitHub token is fine-grained, for this repo only, with Contents write.

## Text files (everything else is design and stays untouched)
- `elections.json`: about 600 visible strings. NOT images, links, colours, icons, numbers or the countdown date value.
- `content/ar/**/*.md`: title, description and the text inside the HTML. Tags cannot change.
- `client.json`: name, motto, copyright, contact text and social links only.
- The full list is in `src/config.js`.

## Cloudflare (Syncology account, Workers FREE plan)
| Piece | Name | Notes |
|---|---|---|
| Worker | `tanta-content-bot` | App + API + admin page at `https://tanta-content-bot.<account>.workers.dev` |
| Queue | `tanta-content-bot-inbox` | AI work runs here (no 30-second cut-off) |
| D1 | `tanta-content-bot` | people, chat, changes, audit |
| Cron | hourly | 24 h expiry, fixes stuck changes |
| Secrets | `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `ADMIN_KEY`, `VAPID_PRIVATE_JWK` | set in Cloudflare |
| Pages setting | `site-tantasportsclubelections` | preview builds for `content/*` |

## Monthly cost
| Item | Cost |
|---|---|
| Cloudflare Worker, Queue, D1, cron (free plan) | $0 |
| Claude Sonnet 5.5, about 4¢ per request | about $4 per 100 requests |
| Phone alerts (Web Push) | $0 |
| GitHub, Pages builds (2 per change, 500/month free) | $0 |
| **Total** | **about $1-5 / month** |

Free-plan risk: 10 ms CPU per run (measured about 5-10 ms). If logs show "exceeded CPU" (1102), switch to Workers Paid ($5/month). No code change.

## Limits to know
- iPhone alerts work only after "Add to Home Screen" (iOS 16.4 or newer). The app shows this hint.
- Preview links are public if someone has the link (random). They are deleted after publish, reject or 24 h.
- The bot changes existing text. It cannot add new fields. For example, `client.json` has no contact phone yet.
