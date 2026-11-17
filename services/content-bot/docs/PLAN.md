# Plan: WhatsApp text-edit bot for husseindawoudlist.com

For Ahmed. Simple English. Nothing is created yet. I need your YES first (list at the bottom).

## What it does
1. A person on the list sends a WhatsApp message (Arabic or English): "Change the slogan to ...".
2. The bot shows: which page, **old text -> new text**, a preview link, a 6-letter change ID.
3. Only the **client** can publish: he replies `YES <id>` (or `نعم <id>`). A cabinet member's request is forwarded to him.
4. YES -> the bot commits to the live branch. The site rebuilds itself in about 1 minute.
5. `UNDO <id>` (client only) puts the old text back. `NO <id>` or 24 hours of silence drops the change.
6. Numbers not on the list get **no reply**. They are only logged (as a hash, never the raw number).

## Safety (all enforced in code, not only in the AI prompt)
- Claude only *proposes* through tools. It never edits files. The server checks every change before git:
  same file, same keys, same structure; only existing string values; no `< >` / scripts; length limit; only the client's folder.
- **Every new word must come from the person's own message.** The bot never writes slogans or claims by itself. If the exact text is missing, it asks.
- Design or layout request -> "I can only change text; ask Ahmed for design changes."
- Meta signature (`X-Hub-Signature-256`) checked on every call. Per-number rate limit. Messages are treated as data, never as instructions.
- Audit log in D1 (append-only, protected by triggers): who asked what, who approved, commit hash, time.
- Secrets only in Cloudflare secrets. GitHub token: fine-grained, this repo only, Contents write.
- Commit text names the requester and approver by name. Never phone numbers.

## Files treated as "text" (the rest is design/config and stays untouched)
- `elections.json`: ~600 visible strings (titles, slogan, descriptions, form labels, messages). NOT: image names, links (`href`), colours, icons, numbers, the election date/time value.
- `content/ar/**/*.md`: page title/description and the text inside the HTML (`<p>`, `<li>`, `<h2>`...). Tags and other front-matter keys cannot change.
- `client.json`: only name, motto, copyright, footer credit, contact address/hours/phones/emails, social label and https link. Domains, api, samples stay out.
- The list lives in `src/config.js` (one file to review).

## Cloudflare pieces (Syncology account) - all NEW, none touches the existing sites or DNS
| Piece | Name | Notes |
|---|---|---|
| Worker | `tanta-content-bot` | Webhook at `https://tanta-content-bot.<account>.workers.dev/webhook`. Separate from the Pages site, so the site build is not touched. |
| Queue | `tanta-content-bot-inbox` | Webhook drops each message here; the slow work (AI + GitHub) runs from the queue, so no 30-second cut-off. |
| D1 database | `tanta-content-bot` | people, changes, audit, rate limits |
| Cron | hourly | drops changes older than 24 h |
| Secrets | `WHATSAPP_TOKEN`, `META_APP_SECRET`, `WEBHOOK_VERIFY_TOKEN`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` | set with `wrangler secret put` |
| Pages setting | project `site-tantasportsclubelections` | Preview builds only for branch `content/*` |

One WhatsApp number is reused. The site forms (API.md) can use the same number and token later. No second integration.

## Meta steps for you
Short list here; full click-by-click is in `META-STEPS.md`.
1. developers.facebook.com -> Create app (Business) -> add **WhatsApp**. Use the free **test number** first.
2. Add 3-5 test recipient numbers. Create a permanent System User token. Copy the App Secret. (Give these to Cloudflare secrets, not to chat.)
3. Webhook: callback URL + verify token (I give you both). Subscribe to `messages`.
4. Create the approval template `change_approval_request` (Utility, Arabic). Text is ready in `META-STEPS.md`.
5. For the real number: Business verification (can take days), add the number, display name approval.

## Monthly cost (Workers FREE plan, as Ahmed chose)
| Item | Cost |
|---|---|
| Cloudflare Worker + Queue + D1 + cron (free plan) | $0 |
| Claude Sonnet 5.5: about 4 cents per request | about $4 per 100 requests |
| WhatsApp: replies when the person wrote first | $0 |
| WhatsApp template (client silent > 24 h) | about $0.01-0.03 each (check Meta's Egypt rate card) |
| GitHub, Pages builds (2 per change, 500/month free) | $0 |
| **Total** | **about $2-10 / month** |

Risk on the free plan: Cloudflare allows 10 ms of CPU per run. Measured: about 5-10 ms. If logs show "exceeded CPU" (error 1102), switch to Workers Paid ($5/month). No code change needed.

## Things you should know
- Preview links are public if someone has the link (random 6 letters). Option: protect previews with Cloudflare Access.
- The election date (`election.at`) is a code value, so the bot will not change it. The visible date text can change. Tell me if you want the date editable.
- Contact phone: `client.json` has no phone yet. The bot can change existing values, not add new fields. Add the field once and the bot can edit it.
- Pages preview builds must use the same build settings/variables as production, or previews will look broken.

## I need your YES for
1. Creating Worker `tanta-content-bot` + D1 + Queue (+ cron), free plan. 2. (no paid plan) 3. Preview builds for `content/*` on the Pages project. 4. A fine-grained GitHub token (this repo, Contents write). 5. A Meta app + test number. 6. Names and numbers: the client, and each cabinet member.
