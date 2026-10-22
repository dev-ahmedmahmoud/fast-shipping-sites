# LFIS old-site import

Imported 2026-10-22 from https://leadersfis.com (WordPress, Impreza theme), both languages. The converter and compose scripts lived in the session scratchpad; this file records what they did.

## Coverage

All 51 real pages keep their exact old URL in both languages. Every one was checked in Chromium at 390px: page loads, correct `lang`/`dir`, no console errors, no horizontal overflow, and the language switch opens the matching page. All 414 images across the built pages load.

| Old URL | New URL | Page id | Content file |
| --- | --- | --- | --- |
| /archives/1 | skipped | | WordPress sample post ("Hello world!") |
| /sample-page | skipped | | WordPress sample page |
| /en | /en/ | home | `content/en/home.md` |
| /ar | /ar/ | home | `content/ar/home.md` |
| /en/enrol-now-en | /en/enrol-now-en/ | enrol-now | `content/en/enrol-now.md` |
| /ar/enrol-now-ar | /ar/enrol-now-ar/ | enrol-now | `content/ar/enrol-now.md` |
| /en/enrol-now-with-assistance-en | /en/enrol-now-with-assistance-en/ | enrol-now-with-assistance | `content/en/enrol-now-with-assistance.md` |
| /ar/enrol-now-with-assistance-ar | /ar/enrol-now-with-assistance-ar/ | enrol-now-with-assistance | `content/ar/enrol-now-with-assistance.md` |
| /en/about-us-en | /en/about-us-en/ | about | `content/en/about.md` |
| /ar/about-us-ar | /ar/about-us-ar/ | about | `content/ar/about.md` |
| /ar/admission-ar | /ar/admission-ar/ | admission | `content/ar/admission.md` |
| /en/admission-en | /en/admission-en/ | admission | `content/en/admission.md` |
| /en/facilities-en | /en/facilities-en/ | facilities | `content/en/facilities.md` |
| /ar/facilities-ar | /ar/facilities-ar/ | facilities | `content/ar/facilities.md` |
| /en/academics-en | /en/academics-en/ | academics | `content/en/academics.md` |
| /ar/academics-ar | /ar/academics-ar/ | academics | `content/ar/academics.md` |
| /en/career-en | /en/career-en/ | career | `content/en/career.md` |
| /ar/career-ar | /ar/career-ar/ | career | `content/ar/career.md` |
| /en/news-en | /en/news-en/ | news | `content/en/news.md` |
| /ar/news-ar | /ar/news-ar/ | news | `content/ar/news.md` |
| /en/events-en | /en/events-en/ | events | `content/en/events.md` |
| /ar/events-ar | /ar/events-ar/ | events | `content/ar/events.md` |
| /en/contact-us-en | /en/contact-us-en/ | contact | `content/en/contact.md` |
| /ar/contact-us-ar | /ar/contact-us-ar/ | contact | `content/ar/contact.md` |
| / | /ar/ (301 redirect) | | Arabic first |
| /en/weekly-plans/pk | /en/weekly-plans/pk/ | weekly-plans-pk | `content/en/weekly-plans/pk.md` |
| /en/weekly-plans | /en/weekly-plans/ | weekly-plans | `content/en/weekly-plans.md` |
| /en/weekly-plans/k-g-01 | /en/weekly-plans/k-g-01/ | weekly-plans-k-g-01 | `content/en/weekly-plans/k-g-01.md` |
| /en/weekly-plans/k-g-02 | /en/weekly-plans/k-g-02/ | weekly-plans-k-g-02 | `content/en/weekly-plans/k-g-02.md` |
| /en/weekly-plans/g-01 | /en/weekly-plans/g-01/ | weekly-plans-g-01 | `content/en/weekly-plans/g-01.md` |
| /en/weekly-plans/g-02 | /en/weekly-plans/g-02/ | weekly-plans-g-02 | `content/en/weekly-plans/g-02.md` |
| /en/weekly-plans/g-03 | /en/weekly-plans/g-03/ | weekly-plans-g-03 | `content/en/weekly-plans/g-03.md` |
| /en/weekly-plans/g-04 | /en/weekly-plans/g-04/ | weekly-plans-g-04 | `content/en/weekly-plans/g-04.md` |
| /en/weekly-plans/g-05 | /en/weekly-plans/g-05/ | weekly-plans-g-05 | `content/en/weekly-plans/g-05.md` |
| /ar/weekly-plans | /ar/weekly-plans/ | weekly-plans | `content/ar/weekly-plans.md` |
| /ar/weekly-plans/p-k | /ar/weekly-plans/p-k/ | weekly-plans-pk | `content/ar/weekly-plans/pk.md` |
| /ar/weekly-plans/k-g-01 | /ar/weekly-plans/k-g-01/ | weekly-plans-k-g-01 | `content/ar/weekly-plans/k-g-01.md` |
| /ar/weekly-plans/k-g-02 | /ar/weekly-plans/k-g-02/ | weekly-plans-k-g-02 | `content/ar/weekly-plans/k-g-02.md` |
| /ar/weekly-plans/g-01 | /ar/weekly-plans/g-01/ | weekly-plans-g-01 | `content/ar/weekly-plans/g-01.md` |
| /ar/weekly-plans/g-02 | /ar/weekly-plans/g-02/ | weekly-plans-g-02 | `content/ar/weekly-plans/g-02.md` |
| /ar/weekly-plans/g-03 | /ar/weekly-plans/g-03/ | weekly-plans-g-03 | `content/ar/weekly-plans/g-03.md` |
| /ar/weekly-plans/g-04 | /ar/weekly-plans/g-04/ | weekly-plans-g-04 | `content/ar/weekly-plans/g-04.md` |
| /ar/weekly-plans/g-05 | /ar/weekly-plans/g-05/ | weekly-plans-g-05 | `content/ar/weekly-plans/g-05.md` |
| /en/student | /en/student/ | student | `content/en/student.md` |
| /ar/student | /ar/student/ | student | `content/ar/student.md` |
| /en/schedules | /en/schedules/ | schedules | `content/en/schedules.md` |
| /ar/schedules | /ar/schedules/ | schedules | `content/ar/schedules.md` |
| /test | skipped | | empty test page |
| /en/admission | /en/admission/ | new-registration | `content/en/new-registration.md` |
| /help | skipped | | unlinked "HELP" page (building photo kept in media) |
| /ar/admission | /ar/admission/ | new-registration | `content/ar/new-registration.md` |
| /en/oldcomer | /en/oldcomer/ | update-registration | `content/en/update-registration.md` |
| /ar/oldcomer | /ar/oldcomer/ | update-registration | `content/ar/update-registration.md` |
| /en/weekly-plans/g-06 | /en/weekly-plans/g-06/ | weekly-plans-g-06 | `content/en/weekly-plans/g-06.md` |
| /ar/weekly-plans/g-06 | /ar/weekly-plans/g-06/ | weekly-plans-g-06 | `content/ar/weekly-plans/g-06.md` |
| /archives/category/uncategorized | skipped | | WordPress category archive |
| /archives/author/admin | skipped | | WordPress author archive |

## What changed from the old site, and why

| Change | Reason |
| --- | --- |
| "مدارس تأسيس القادة" became "مدرسة تأسيس القادة" in 15 places (Arabic text) | Owner: the singular name, as on the logo, everywhere |
| `info@eadersfis.com` corrected to `info@leadersfis.com` (enrol-now pages) | Obvious typo |
| A stray ". " before Arabic tab titles removed (e.g. ". رسالة المشرف العام") | Leftover from the old theme's tab markup, not wording |
| Old tabs and accordions became sections with headings; old image sliders became image grids | The new site has no tab widget; content order is unchanged |
| New registration / Update registration: the WordPress forms (IDs, passports, uploads) replaced by an "Apply - تقدم" button to EduSync (`/admission`); the surrounding text, payment notes, IBAN image and download documents kept | Owner: applications go through EduSync |
| Enrol-now buttons that pointed to `lfis.scolasys.com` now point to EduSync (Enrol Now → admission form, Follow Up → EduSync login) | ScolaSys replaced by EduSync |
| Contact page: the Admission, HR and School Counselor forms are shown with the same fields, but sending is off, with a note to use WhatsApp or email | The EduSync lead endpoint does not exist yet |
| News: links to rowad-alkhaleej.edu.sa (another school's site) removed, text kept: "virtual classrooms", "virtual tours", "register and upload documents and files online", "installments", "school" and the Arabic equivalents | Owner |
| News item "School Discipline" (2022-02-17) had no Arabic version; title translated ("الانضباط المدرسي"), marked `translated: true` | Only English existed |
| YouTube embeds use youtube-nocookie.com and load lazily | Privacy; no autoplay |
| WhoWeAre.mp4 re-encoded (14.7 MB → 4.4 MB, silent as before, same visual quality) | Page weight |
| Menu: "My Account", "E-Mail", "Login" and "Logout" dropped; Portal (Classera), Ealpha and EduSync login kept as menu links; "Career" added, linking to the EduSync job list | Owner |
| Footer credit "LFIS by Eng. Moataz.El-Gabbas" replaced with "by Syncology" | Owner |
| Career page: the old page was empty; it now carries the career text from the old contact page and a button to the EduSync job list | Owner wants a careers page |
| Social links: Facebook, Instagram, WhatsApp, Snapchat (as in the old footer). X/Twitter only appeared on the unlinked HELP page, so it is not shown | As on the old site |

Text is otherwise as it was, including the old site's wording, spelling and Western digits inside Arabic body text. Only numbers the engine generates (years, dates) use Arabic-Indic digits.

## Media

- 42 images in `clients/lfis/media/` (logos, building and classroom photos, bus photos, IBAN image, Classera certificate, news posters, the stock photos used on About/Academics/Admission/Facilities, the ScolaSys and eAlpha logos on Academics) and 64 student photos in `clients/lfis/media/students/`. All are served resized as WebP.
- `clients/lfis/public/media/WhoWeAre.mp4` (Academics ▸ Assessment and the home page), `clients/lfis/public/docs/` (Commitment_01–03.pdf, RAMADAN-CLASSES-TIME-TABLE-2022.pdf).
- Not imported: the PDF file icon (replaced by the download lists) and `How-to-register-01-En.mp4` from the enrol-now pages (a walkthrough of the retired ScolaSys registration).

## Weekly plans

674 PDFs linked from the weekly-plan pages, 289.9 MB in total, so they were not copied into the repository. The pages link to them at `https://leadersfis.com/wp-content/uploads/…`. Ten of them already return 404 on the old site. **These links break when leadersfis.com points to the new site**: move the files to storage (for example Cloudflare R2 or a files.leadersfis.com subdomain) and update `weeklyPlans.host` before switching DNS.

## Open items

See `todo` in `client.json`. In short: weekly-plan PDF hosting, the contact-form endpoint, which motto the header and footer use, an SVG logo, and the three design systems LFIS will see.
