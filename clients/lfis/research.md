# LFIS: research notes

Leaders' Foundation International School (LFIS), مدارس تأسيس القادة العالمية, Makkah, Saudi Arabia.
Collected 2026-10-20. Every item below is unconfirmed until the intake (Part B) is answered.

## Current site

- `https://leadersfis.com/en`, WordPress (`/wp-content/uploads/…`), bilingual with `/en/…-en` slugs.
- Known pages: `/en/about-us-en`, `/en/academics-en`, `/en/admission-en`, `/en/news-en`, `/en/contact-us-en`, `/en/student`, `/en/weekly-plans/k-g-02`, weekly-plan PDFs under `/wp-content/uploads/`.
- Could not be fetched from the build environment (network policy blocks the host). Content import is pending.

## Facts found (with conflicts)

| Topic | Finding | Source |
| --- | --- | --- |
| Founded | 2021 | Facebook page, About page |
| Motto | "Think to bring about a difference." (General Superintendent's message) | About page snippet |
| Location | New admission location: Ar Rashidiyyah, Makkah 24273 | Contact page snippet |
| Hours | 8:00am–2:00pm and 4:30pm–9:30pm (two shifts?) | Academics page snippet |
| Grades | Pre-K–Grade 9 (leaders.edu.sa) vs KG–Grade 4 (mdares.ai) vs elementary + secondary (ksaschools) vs KG, primary, middle (Instagram) | conflicting |
| Curriculum | American | mdares.ai |
| Accreditation | ksaschools claims not MoE-accredited; unverified | ksaschools |
| Fees | from 15,300 SAR (mdares.ai) vs from 19,750 SAR (ksaschools); interest-free instalments mentioned on old News page | conflicting |
| Name | "مدرسة" and "مدارس" both used | conflicting |
| Emails | Separate front desk, HR, admissions, accounts addresses | Contact page snippet |
| Social | Instagram @leadersfis, X @lfischool, Snapchat leadersfis, Facebook leadersfis | search |
| Possible newer site | leaders.edu.sa ("تأسيس القادة العالمية", Pre-K to Grade 9, Al-Rashidiyyah / Al-Sharaie) | search; unconfirmed same school |

## Syncology context

- LFIS runs EduSync (Odoo 18) at `https://lfis.syncology.tech`. That subdomain is the live, paid system and must not host the marketing site.
- Free preview names (per Infra Agent, 2026-10-20): `lfis-a`, `lfis-b`; suggested production fallback `lfis-web.syncology.tech`.

## Privacy flags

- The old `/en/student` page lists students by class. Recommend removing it from the public site.
- Weekly plans are public PDFs. Recommend moving them into EduSync.

## Sources

- https://leadersfis.com/en/about-us-en
- https://leadersfis.com/en/contact-us-en
- https://leadersfis.com/en/admission-en
- https://leadersfis.com/en/academics-en
- https://leadersfis.com/en/news-en
- https://www.leaders.edu.sa/ar/links
- https://mdares.ai/sa-en/schools/leaders-foundation-international-school
- https://ksaschools.com/leaders-foundation-international-school
- https://www.instagram.com/leadersfis/
- https://www.facebook.com/leadersfis/
- https://twitter.com/lfischool
