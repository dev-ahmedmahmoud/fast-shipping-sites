# tanta-content-bot

A small Arabic web app (Cloudflare Worker + D1). The client's team sends TEXT change requests for `clients/tantasportsclubelections`. Each request starts a Claude Code routine (the site agent). The app checks the agent's branch (text only) and puts it live. Stop and Undo are included.

- `public/`: the app and `admin.html` (people, invite links, log)
- `src/relay.js`: the request flow and the gate. `src/config.js`: what counts as text.
- `docs/PLAN.md` plan and cost · `docs/ROUTINE.md` the agent's prompt and setup · `docs/HANDOVER.md` how to run it
- `npm test`: offline tests, no secrets

Status: code and tests done. No Cloudflare resource or routine has been created yet.
