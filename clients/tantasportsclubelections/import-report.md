# TantaSportsClubElections: import from ashrafmoharamlist.com

Imported 2026-11-15 from https://ashrafmoharamlist.com (WordPress; Prof. Ashraf Moharam's list in the Egyptian Shooting Club 2026 elections). As agreed, it is copied **as is** to serve as the template for the client's own list: names, text and media are the source's until the owner replaces them. Nothing is renamed to "Tanta".

The site is Arabic only (`locales: ["ar"]`): no language switch, no `/ar/` prefix, the same URLs as the source. Engine-formatted numbers (countdown, ballot numbers, candidate numbers, supporter counts) use Arabic-Indic digits; text copied from the source keeps the digits it was written with (for example «انتخابات نادي الصيد المصري 2026»). Dates are Gregorian.

Preview: `https://websites-preview.syncology.tech/tantasportsclubelections/` (one sample: `baseline`).

## Pages

All 20 pages keep their URL. Structured data (candidates, groups, program files, clips, ballot, countdown, supporters' and complaints' texts) is in `elections.json`; each page's own body (a candidate's bio, a program file's text) is in its content file.

| Source URL | Content file | Template |
| --- | --- | --- |
| / | `content/ar/home.md` | `home` |
| /team/ | `team.md` | `candidates` |
| /team/ashraf-moharam/ | `team/ashraf-moharam.md` | `candidate` |
| /team/adel-selim/ | `team/adel-selim.md` | `candidate` |
| /team/hesham-el-shenawy/ | `team/hesham-el-shenawy.md` | `candidate` |
| /team/ahmed-wagih/ | `team/ahmed-wagih.md` | `candidate` |
| /team/eman-el-assy/ | `team/eman-el-assy.md` | `candidate` |
| /team/karim-abdelrahman/ | `team/karim-abdelrahman.md` | `candidate` |
| /team/mohamed-fahmy/ | `team/mohamed-fahmy.md` | `candidate` |
| /team/mahmoud-aoun/ | `team/mahmoud-aoun.md` | `candidate` |
| /team/wael-mehran/ | `team/wael-mehran.md` | `candidate` |
| /team/ali-gebaly/ | `team/ali-gebaly.md` | `candidate` |
| /team/nada-hafez/ | `team/nada-hafez.md` | `candidate` |
| /files/ | `files.md` | `files` |
| /files/sports/ | `files/sports.md` | `file` |
| /files/finance/ | `files/finance.md` | `file` |
| /files/services/ | `files/services.md` | `file` |
| /files/culture/ | `files/culture.md` | `file` |
| /support/ | `support.md` | `support` |
| /complaints/ | `complaints.md` | `complaints` |

Menu (as the source): تعرّف على القائمة, الملفات الأربعة, كن من فريق دعم القائمة, شكاوى ومقترحات; header button «سجّل شكوى أو مقترح»; footer with the list's name, slogan, links and Facebook/Instagram.

## Features

| Source feature | Here |
| --- | --- |
| Countdown to 20 Nov 2026, 8 pm Cairo; a message on the day and after | `Countdown` + engine script; days counted in Africa/Cairo wherever the visitor is |
| Candidates by group (هيئة المكتب، أعضاء مجلس الإدارة فوق السن وتحت السن) with ballot numbers | `CandidateGrid` from `elections.json` → `groups`, `candidates` |
| Candidate page: word video, bio, full interview with topic chapters, photos, clips by program file, the rest of the list | `CandidateHero`, `MediaFrame`, `Panel`, `InterviewPlayer`, `PhotoRow`, `ClipGrid`, `CandidateGrid` |
| Four program files, each with its clips by candidate | `ProgramFiles`, `ClipGrid` (`clips` in `elections.json`) |
| Videos load only when pressed; one plays at a time | engine (`data-el-video`) |
| "Vote for the full list" card: WhatsApp share and PNG download | `BallotCard`; the PNG is drawn in the browser (`ashraf-moharam-list.png`) |
| Supporters' team: join with membership number and WhatsApp code, log in, reset password, personal link, visit counter toward a goal | engine widget, demo or live (`API.md`) |
| Visits through a supporter's link (`?r=`) counted, code removed from the address | engine, on every page |
| Complaints and suggestions form with the source's checks and messages (6-digit membership, phone, type, topic, details, JPG/PNG photo up to 10 MB) | engine widget, demo or live (`API.md`) |
| Cloudflare Turnstile on the forms | live mode with `api.turnstileSiteKey` |
| Social share images per page | `og:image` from each candidate's share image and `share.jpg` |

## Media

- 81 images downloaded into `media/` (candidate cards, three photos each, video posters, interview posters, share images, crest, logo, team photo); `public/favicon.png`.
- 46 videos (interviews, candidates' words, program-file clips) still stream from `media.ashrafmoharamlist.com`, the source's own server. They load only when a visitor presses play.

## Differences from the source

- The source's footer credit (GRWPTH) is replaced by «بواسطة سينكولوجي».
- The source's visitor analytics (`wp-json/grwpth/v1/visit`, UTM and click-id tracking) is not copied.
- Supporters and complaints run in **demo** mode in the preview: nothing is sent; the WhatsApp code is shown on screen and labelled «معاينة».

## Checks (Chromium, preview build under `/tantasportsclubelections/baseline/`)

All 20 pages load with `lang="ar"`, `dir="rtl"` and one `h1`, with no horizontal overflow at 390px and no console errors. The countdown ticks in Arabic-Indic digits; the card downloads as a PNG; a video appears only when pressed and an interview topic starts the player; supporters (demo): join → code → dashboard with a personal link on the site being viewed → a visit through it is counted and removed from the address → log out → wrong password refused, right one accepted; complaints: the empty form shows the source's five messages, a 5-digit membership is refused, Arabic-Indic digits are accepted, and the demo send succeeds with its preview note. LFIS and Genesis build file-for-file identical to before (apart from path-derived style ids).

## To do

- Content: the owner replaces the list, candidates, texts, photos and videos with the Tanta Sports Club list's (all in `elections.json`, `content/ar/` and `media/`).
- Videos: move them to our storage (or the client's) instead of the source's server.
- Backend for live mode (`API.md`): Cloudflare Pages Functions + D1 + R2, a WhatsApp sender for codes, a Turnstile site key and secret.
- Supporters' goal: 5 is a placeholder (the source keeps it on its server).
- Complaints success message: ours is a placeholder (the source shows its server's text).
- Production domain: to decide (`domains.production` still holds the source's).
- Analytics: choose one if wanted (for example Cloudflare Web Analytics).
