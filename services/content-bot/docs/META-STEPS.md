# Meta (WhatsApp Cloud API): what Ahmed clicks

Use the free test number first. Go live only after testing.

## A. Create the app (about 10 minutes)
1. Open https://developers.facebook.com/apps -> **Create app** -> use case **Other** -> type **Business** -> pick Ahmed's Business portfolio.
2. In the app dashboard: **Add product -> WhatsApp -> Set up**.
3. Left menu **WhatsApp -> API Setup**. You see a free **test number**, its **Phone number ID**, and a 24-hour temporary token.
4. "To" box -> **Manage phone number list** -> add the client and cabinet numbers (each gets a code on WhatsApp). The test number can only message these.
5. **App settings -> Basic -> App secret -> Show**. This is `META_APP_SECRET`.

## B. Permanent token (the 24-hour one is only for a first try)
1. https://business.facebook.com/settings -> **Users -> System users -> Add** (name: `content-bot`, role Admin).
2. **Add assets**: the app (Full control) and the WhatsApp account (Full control).
3. **Generate token** -> choose the app -> permissions `whatsapp_business_messaging` and `whatsapp_business_management` -> expiry **Never**. This is `WHATSAPP_TOKEN`.

## C. Webhook (after the Worker exists)
1. **WhatsApp -> Configuration -> Webhook -> Edit**.
2. Callback URL: `https://<worker-url>/webhook`. Verify token: the value of `WEBHOOK_VERIFY_TOKEN` (random string, set on Cloudflare first).
3. **Verify and save**. Then under *Webhook fields* subscribe to **messages**.

Put the three secrets into Cloudflare yourself or give them to the person who runs `scripts/setup.sh whatsapp`. Never paste them in chat or git.

## D. Approval template (needed when the client has not written for 24 hours)
**WhatsApp Manager -> Message templates -> Create template**
- Category: **Utility**. Name: `change_approval_request`. Language: **Arabic**.
- Body:
  `طلب تعديل نص على الموقع من {{1}}. رقم التعديل: {{2}}. التغيير: {{3}}. المعاينة: {{4}}. للموافقة أرسل: نعم {{2}} وللإلغاء أرسل: لا {{2}}. ينتهي الطلب بعد 24 ساعة.`
- Samples: {{1}} منى، {{2}} K7M2QX، {{3}} الشعار: القديم ← الجديد، {{4}} https://content-k7m2qx.site-tantasportsclubelections.pages.dev/
- Optional English version (same name, language English): `{{1}} asks to change text on the website. Change ID: {{2}}. Change: {{3}}. Preview: {{4}}. Reply YES {{2}} to publish or NO {{2}} to cancel. It expires in 24 hours.`
- Approval usually takes minutes to a day. Meta may re-classify it as Marketing; if so, edit the wording to be purely about a pending task.

## E. Going live with the real number
1. **Business settings -> Security center -> Start verification** (documents; can take days).
2. **WhatsApp Manager -> Phone numbers -> Add phone number**. The number must NOT be active on the normal WhatsApp app (or delete that account first). Choose a display name (Meta reviews it).
3. Add a payment method (needed for templates outside the free window).
4. Put the new Phone number ID in `wrangler.toml` (`PHONE_NUMBER_ID`) and deploy. The same token works if the number is in the same WhatsApp account.
