# Handover: the text-edit chat app

## Day to day
- Open the app (home-screen icon). Type what to change. A card shows old -> new, with a Preview button.
- **Only the client** has **نشر (Publish)**. Live in about 1 minute. He can also type `نعم` when only one change is waiting.
- Client only: **تراجع (Undo)** puts the old text back. It is refused if that text was edited again later.
- **رفض / إلغاء (Reject / Cancel)**: the client, or the person who asked. No answer for 24 h = dropped.
- Design, layout, images, colours, new sections: refused. Contact Ahmed.

## Add, remove or re-link a person (admin page)
1. Open `<app URL>/admin` and enter the admin key.
2. **إضافة شخص (Add person)**: name + role. Role is "عضو بالحملة" (cabinet) or "المرشح (صاحب الموافقة)" (the client; only one).
3. **رابط دخول (Login link)**: copy or share it to that person, for example by WhatsApp. It works once, on one phone, for 7 days.
4. New phone or lost link? Make a new link.
5. **حظر (Block)**: logs them out of every device at once.

## Install on a phone
- iPhone: open the link in **Safari** -> Share -> **Add to Home Screen** -> open from the icon -> tap **تفعيل الإشعارات** (enable alerts).
- Android: open the link in **Chrome** -> menu -> **Install app** / Add to Home screen -> tap **تفعيل الإشعارات**.

## Undo by hand
- Normal: the Undo button.
- Manual: `git revert <commit>` on the live branch. The hash is in the audit log and in git ("Text change <id>").

## Logs
- Admin page -> **سجل العمليات** (last 100). Events include `msg_in`, `proposed`, `approved_live`, `approve_denied`, `undone`, `expired`, `refused_not_text`, `refused_by_checks`, `joined`, `person_blocked` and `error`.
- Full table: Cloudflare -> D1 -> `tanta-content-bot` -> Console -> `SELECT * FROM audit ORDER BY id DESC LIMIT 200;`
- Live: `npx wrangler tail tanta-content-bot`.

## Switch off
Set `BOT_MODE = "off"` in `wrangler.toml` and deploy, or block everyone on the admin page.

## Change what counts as "text"
Edit `src/config.js`, then run `npm test`.

## Secrets
`ANTHROPIC_API_KEY`, `GITHUB_TOKEN` and `ADMIN_KEY` are set in Cloudflare (Workers -> tanta-content-bot -> Settings -> Variables and Secrets). `VAPID_PRIVATE_JWK` is made by `scripts/setup.sh`. To rotate, set a new value. A new VAPID key means everyone taps "enable alerts" again.
