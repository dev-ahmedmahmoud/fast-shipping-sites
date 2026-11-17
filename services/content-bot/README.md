# tanta-content-bot

WhatsApp bot (Cloudflare Worker + D1) that changes only the TEXT of `clients/tantasportsclubelections`, after the client says YES.

- `docs/PLAN.md` plan and cost, for Ahmed
- `docs/META-STEPS.md` Meta clicks and the approval template
- `docs/HANDOVER.md` how to run it
- `docs/FOR-SITE-BUILDER.md` questions for the site-builder agent
- `src/config.js` the list of editable text (the safety boundary)
- `npm test` runs 23 tests (no network, no secrets)

Status: code and tests done. No Cloudflare or Meta resource has been created yet.
