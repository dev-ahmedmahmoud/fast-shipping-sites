# Handover: the text-request app

## Day to day
- Open the app (home-screen icon), type the change, tap **إرسال الطلب**.
- Progress: الوكيل يعدّل (agent editing) → فحص ونشر (checking & publishing) → تحديث الموقع (site updating) → **تم** (done). Then refresh the site.
- **إيقاف (Stop):** while the agent works. Nothing changes.
- **تراجع (Undo):** on a finished request, by the requester or the client. Refused if that text changed again later.
- **لم يُنفَّذ (not done):** a refusal or failure; the reason is shown. Example: a design request.

## People (admin page)
1. Open `<app URL>/admin` and enter the admin key.
2. **إضافة شخص (Add person)**: name + role. "عضو بالحملة" = team member, "المرشح" = the client (only one).
3. **رابط دخول (Login link)**: share it with that person. It works once, on one phone, for 7 days. Make a new one for a new phone.
4. **حظر (Block)**: logs them out everywhere at once.

## Install on a phone
- iPhone: Safari → Share → **Add to Home Screen** → open from the icon → **تفعيل الإشعارات** (enable alerts).
- Android: Chrome → menu → **Install app** → **تفعيل الإشعارات**.

## When something looks wrong
- Admin page → **سجل العمليات** (activity log). `agent_started` holds the link to the agent run on claude.ai.
- Agent never answers: after 30 minutes the request shows "not done". Check the routine's run history at claude.ai/code/routines.
- Undo by hand: `git revert <commit>` on the live branch. The hash is in the log.

## Switch off
Set `BOT_MODE = "off"` in `wrangler.toml` and deploy, or pause the routine at claude.ai/code/routines.

## Change what counts as "text"
Edit `src/config.js`, then run `npm test`.
