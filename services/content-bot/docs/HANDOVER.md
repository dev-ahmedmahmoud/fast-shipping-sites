# Handover: how the WhatsApp text bot works

## Day to day
- Anyone on the list sends a message: "Change the slogan to ...". The bot answers with the old and new text, a preview link and an ID (e.g. `K7M2QX`).
- **Only the client** publishes: `YES K7M2QX` (or `نعم K7M2QX`). Live in about 1 minute.
- If only ONE change is waiting, a plain `YES` / `نعم` is enough.
- Client only: `UNDO K7M2QX` puts the old text back (refused if that text was edited again later). `NO K7M2QX` cancels. No answer for 24 hours cancels.
- Design, layout, images, colours, new sections: refused. Contact Ahmed.

## Add / remove a number
Easiest: Cloudflare dashboard -> Storage & Databases -> D1 -> `tanta-content-bot` -> Console. Paste one line:
```
INSERT INTO people (name, phone, role, lang, created_at) VALUES ('Mona', '201012345678', 'cabinet', 'ar', unixepoch());
UPDATE people SET active = 0 WHERE phone = '201012345678';            -- remove
SELECT name, role, active FROM people;                               -- list
```
The client: same INSERT with role 'client' (only one active client allowed).

Or with the script, run from `services/content-bot` (needs `wrangler` logged in to the Syncology Cloudflare account):
```
node scripts/people.mjs list
node scripts/people.mjs add 201012345678 "Mona" cabinet ar      # country code, no + and no leading 0
node scripts/people.mjs remove 201012345678                     # cabinet only
node scripts/people.mjs set-client 201000000001 "Name" ar       # replaces the one client
```
Also add the number to the WhatsApp test recipient list while testing with Meta's test number.

## Undo something by hand
- Normal: client sends `UNDO <id>`.
- Manual: `git revert <commit>` on the live branch. The commit hash is in the audit log, and in the git history ("Text change <id>").

## Where the logs are
- Audit log (D1 table `audit`, append-only): `node scripts/people.mjs audit 50` or `node scripts/people.mjs audit 50 K7M2QX`.
  Fields: time, actor (name), event (`msg_in`, `proposed`, `approved_live`, `approve_denied`, `undone`, `expired`, `ignored_unknown_sender`, `refused_not_text`, `refused_by_checks`, `error`...), change id, details, commit hash.
- Strangers appear as `unknown:<8 hex>` (salted hash), never as a number.
- Live behaviour: `npx wrangler tail tanta-content-bot`.
- Git history of the live branch: commits by "Tanta Content Bot" with `Requested-by`, `Approved-by`, `Change-id`.

## Switch it off
- Set `BOT_MODE = "off"` in `wrangler.toml` and deploy: the bot logs but sends and changes nothing.
- Or revoke the GitHub token / delete the Meta webhook subscription.

## Change what counts as "text"
Edit `src/config.js` (patterns) and run `npm test`. Everything not listed there cannot be changed by the bot.

## Secrets
`WHATSAPP_TOKEN`, `META_APP_SECRET`, `WEBHOOK_VERIFY_TOKEN`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` live only in Cloudflare (`wrangler secret put NAME`). Rotate by putting a new value.
