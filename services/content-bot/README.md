# tanta-content-bot

A small Arabic chat web app (Cloudflare Worker + Queue + D1). The client's team asks for TEXT changes to `clients/tantasportsclubelections`. Only the client can publish.

- `public/`: the app (chat) and `admin.html` (people, invite links, logs)
- `src/`: the API, the AI tools and the text-only checks. `src/config.js` lists what counts as text.
- `docs/PLAN.md` plan and cost · `docs/HANDOVER.md` how to run it · `docs/FOR-SITE-BUILDER.md` questions for the site agent
- `npm test`: 21 tests, offline, no secrets

Status: code and tests done. No Cloudflare resource has been created yet.
