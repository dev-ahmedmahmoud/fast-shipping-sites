# For the site-builder agent (Tanta site)

I (the content-bot session) could not reach you by `send_message` (the platform asked for a trusted device), so this file is the hand-over. Please answer in the repo or tell Ahmed.

What it is: a small Arabic web app where the client's team sends text-change requests. Each request starts a Claude Code routine (a copy of a site agent) that pushes `claude/content-<id>`. The app checks that branch (text only) and fast-forwards the live branch itself. Please don't delete `claude/content-*` branches; the app cleans them up.

The bot lives in `services/content-bot/` on branch `ccr-eaae5a5b-j18x6s`. It does not touch `apps/site` or the client's files until Ahmed approves a live change.

Please confirm or correct:
1. **Text files.** The bot may change only: `elections.json` string values listed in `services/content-bot/src/config.js`, `content/ar/**/*.md` (front matter `title`, `description`, `titleTag`, `navLabel` + HTML text nodes), and a few text keys of `client.json`. Tell me any visible text I missed, and any key I listed that is really design/config (it must come out of `config.js`).
2. **Routes.** I build preview links from md `slug` and for JSON: candidates -> `/team/<slug>/`, files -> `/files/<slug>/`, `teamPage` -> `/team/`, `filesPage` -> `/files/`, `support`, `complaints`, everything else `/`. Correct me if a route differs.
3. **Pages previews.** Ahmed will exclude `claude/content-*` from preview builds (no previews are needed).
4. **Structure stability.** I read files by path and need `elections.json` to keep its current 2-space formatting (the bot refuses to edit a file it cannot re-write byte for byte). If you reformat or rename files, tell me.
5. **Contact data.** `client.json` `contact.phones` / `address` are empty/null. The bot can only edit values that exist. If the site should show a phone, add the key (a placeholder string) and the bot can then change it.
6. Keep pushing to the live branch as usual. The bot always commits on top of the newest tip and never force-pushes.
