# Election site API (live mode)

The site is static. Two features need a server: the supporters' team (`/support/`) and the complaints form (`/complaints/`), plus counting visits that arrive through a supporter's personal link (`?r=xxxxxxxx`, on any page).

`client.json` chooses how the browser talks to it:

```json
"api": { "mode": "demo", "base": "/api/", "turnstileSiteKey": "" }
```

- `demo` (previews, the default): nothing leaves the browser. Accounts, codes and visit counts are kept in `localStorage` (one store per sample), the WhatsApp code is shown on screen marked «معاينة», and the complaints form says «معاينة: لا يتم إرسال أي بيانات». Pages show a preview notice.
- `live`: the browser calls the routes below under `base` (resolved against the site; `/api/` means `https://<domain>/api/`). With `turnstileSiteKey` set, forms carry a Cloudflare Turnstile token (as the source site does); without it they send `ts: ""`.

The complaints route is built: `apps/site/server/elections-worker.js`, which a live build copies to the output as `_worker.js` (Cloudflare Pages advanced mode) with a `_routes.json` that sends only `/api/*` to it. It sends each complaint to the team through the WhatsApp Cloud API as an approved template message (settings and template names at the top of that file; tests in `apps/site/server/test/`). Until its settings exist it answers every call with «الإرسال غير متاح الآن», and the site keeps `api.mode: demo` with the WhatsApp hand-off below. The supporters' routes are not built (the support page is a WhatsApp share kit now).

WhatsApp templates to create (WhatsApp Manager → Message templates; category Utility, language Arabic `ar`), six body variables in this order: kind, membership, name, the member's wa.me link, topic, details:
- `tanta_complaint` (no header)
- `tanta_complaint_photo` (header: Image)

Body for both:
```
وصلت {{1}} جديدة من موقع القائمة.
رقم العضوية: {{2}}
الاسم: {{3}}
للرد على العضو: {{4}}
الموضوع: {{5}}
التفاصيل: {{6}}
برجاء المتابعة.
```

## Conventions

- Same origin; the session is an `HttpOnly`, `Secure`, `SameSite=Lax` cookie set by `verify` and `login`, cleared by `logout`.
- JSON in (`Content-Type: application/json`), JSON out, HTTP 200 for every answer the visitor should read (validation errors included). The browser treats network failures and non-JSON answers as `errNetwork`.
- Every answer is a **Result**:

```ts
{
  ok: boolean;
  code?: string;    // on failure: a key of support.words in elections.json (list below)
  field?: string;   // the form field the error belongs to (membership, name, mobile, password, code)
  message?: string; // optional: when absent, the browser shows the words text for `code`
  token?: string;   // register / forgot: identifies the pending code
  gap?: number;     // seconds before another code may be requested
  me?: Me;          // verify / login / me
}

type Me = {
  name: string;
  link: string;   // the supporter's personal link: https://<domain>/?r=<8 chars a-z0-9>
  count: number;  // visits that came through the link
  goal: number;   // the target shown on the dashboard (5 in the preview; the source sets it on its server)
};
```

- `mobile` arrives in E.164 (`+201012345678`) built from the country picker (`cc`, the dialing code without `+`) and the number. `membership` arrives as 6 ASCII digits (Arabic-Indic digits are converted in the browser).
- `ts` is the Turnstile token. Verify it server-side with the secret (`https://challenges.cloudflare.com/turnstile/v0/siteverify`); on failure answer `{ ok: false, code: "spam" }`.

## Supporters

| Route | Body | Success | Failures (`code` / `field`) |
| --- | --- | --- | --- |
| `POST supporter/register` | `membership`, `name`, `mobile`, `cc`, `password` (8 to 72), `ts` | `{ ok, token, gap }`; sends a 6-digit code on WhatsApp, valid 5 minutes | `badMembership`/membership, `badName`/name, `badMobile`/mobile, `badPassword`/password, `takenMobile`/mobile, `takenMember`/membership, `noWhatsapp`/mobile, `wait`, `sendFailed`, `busy`, `tooMany`, `spam` |
| `POST supporter/verify` | `token`, `code`, `password` (only after `forgot`: the new password), `ts` | `{ ok, me }` and the session cookie; the account is created (or its password changed) | `badCode`/code, `codeDead`/code, `badPassword`/password, `noAccount`, `tooMany`, `spam` |
| `POST supporter/resend` | `token` | `{ ok, gap }`; sends the same pending code again | `tooSoon` (with `gap`), `codeDead`, `tooMany` |
| `POST supporter/login` | `mobile`, `cc`, `password`, `ts` | `{ ok, me }` and the session cookie | `badLogin`/password, `noAccount`/mobile, `lockedLogin`, `spam` |
| `POST supporter/forgot` | `mobile`, `cc`, `ts` | `{ ok, token, gap }`; sends a code on WhatsApp | `badMobile`/mobile, `noAccount`/mobile, `noWhatsapp`/mobile, `wait`, `tooMany`, `spam` |
| `GET supporter/me` | none | `{ ok, me }` when the cookie is valid | `{ ok: false }` (the join form is shown) |
| `POST supporter/logout` | `{}` | `{ ok }`; clears the cookie | none |
| `POST supporter/hit` | `c` (the 8-character link code) | `{ ok }` | always `{ ok }`; ignore unknown codes |

Rules the source's messages describe, and the browser expects: one account per mobile and per membership number; a code request at most once a minute (`tooSoon`); `wait` while an unexpired code exists for a new registration; lock-outs (`tooMany` for an hour, `lockedLogin` for 15 minutes). For `hit`, the browser sends a visit once per tab session; the server should dedupe again (for example per IP and day) and skip the link owner's own visits (the demo counts every visit, so a preview can show the counter moving).

Error codes and their messages (from `elections.json` → `support.words`): `badMembership`, `badName`, `badMobile`, `badPassword`, `spam`, `takenMobile`, `takenMember`, `noWhatsapp`, `sendFailed`, `busy`, `wait`, `tooSoon`, `tooMany`, `badCode`, `codeDead`, `badLogin`, `lockedLogin`, `noAccount`, `errNetwork` (browser only).

## Complaints

Until this route is live, `complaints.whatsapp` in `elections.json` (`number`, texts) hands the form to WhatsApp instead: after the browser's checks it opens `https://wa.me/<number>?text=<the complaint>` and the member presses Send there (a photo is attached in the chat). It is ignored once `api.mode` is `live`.

`POST complaints`, `multipart/form-data`:

| Field | Value |
| --- | --- |
| `membership` | 6 ASCII digits (required) |
| `full_name` | optional, up to 120 characters |
| `phone` | WhatsApp number, digits with an optional leading `+` (required; Egyptian `01[0125]xxxxxxxx` or international) |
| `kind` | `شكوى` or `مقترح` (required) |
| `topic` | one of `الأنشطة الرياضية`, `الخدمات والمرافق`, `الأنشطة الاجتماعية`, `الشؤون المالية والإدارية`, `أخرى` (required) |
| `details` | up to 2000 characters (required) |
| `photo` | optional JPEG or PNG, up to 10 MB (present only when chosen) |
| `ts` | Turnstile token |

Answer `{ ok: true, message? }`; the browser shows `message`, or `complaints.success` from `elections.json` when there is none (that text is a placeholder: the source shows its server's own text). On a problem with one field answer `{ ok: false, field: "<name>", message }` and the message appears under that field; otherwise `{ ok: false, message }` shows above the button (`complaints.failed` when there is no message).

The browser checks the same rules first, with the source's messages (`complaints.fields` in `elections.json`); the server must check them again.
