// Election pages' behaviour, started once per page from Runtime.astro. Each part only
// acts when its markup is on the page. Settings arrive as JSON in #el-config.
import { createApi } from './api';
import { initBallotCards, type BallotData } from './ballot';
import { mountComplaints } from './complaints';
import { initCountdowns } from './countdown';
import { mountSupporters } from './supporters';
import { initVideos } from './video';

interface Config {
  api: { mode: 'demo' | 'live'; base: string; turnstileSiteKey: string; key: string };
  numerals: string;
  home: string;
  ballot: BallotData;
  supporters: { words: Record<string, string>; goal: number };
  complaints: { whatsapp?: { number: string; done: string; title: string; labels: Record<string, string> } | null; fields: Record<string, any>; sending: string; failed: string; success: string; demoNote: string };
}

const config = JSON.parse(document.getElementById('el-config')?.textContent || '{}') as Config;

// Numbers shown to visitors use the client's numerals (Arabic-Indic for "arab").
const nf = new Intl.NumberFormat(`ar-EG-u-nu-${config.numerals || 'arab'}`, { useGrouping: false });

/** "%d", "%s" and "%1$s" placeholders, as the source's strings use them. Numbers (not
 *  strings such as a code to type) come out in the client's numerals. */
function fmt(s: string, ...a: (string | number)[]): string {
  let i = 0;
  return (s || '').replace(/%(\d\$)?[ds]/g, (_m, n) => {
    const v = a[n ? parseInt(n, 10) - 1 : i++];
    return typeof v === 'number' ? nf.format(v) : String(v ?? '');
  });
}

const api = createApi({
  mode: config.api?.mode === 'live' ? 'live' : 'demo',
  base: config.api?.base || '/api/',
  key: config.api?.key || 'el-demo',
  home: new URL(config.home || '/', location.href).href,
  goal: config.supporters?.goal || 5,
  words: config.supporters?.words || {},
  fmt,
});

// A visit through a supporter's personal link (?r=xxxxxxxx): counted once per browser
// session, and the code is taken out of the address bar so it is not passed on.
(function referral() {
  const m = /(?:^|[?&#])r=([a-z0-9]{8})(?:&|$)/.exec(location.search.slice(1)) || /(?:^|[#&])r=([a-z0-9]{8})(?:&|$)/.exec(location.hash.slice(1));
  if (!m) return;
  const code = m[1];
  try {
    const u = new URL(location.href);
    u.searchParams.delete('r');
    u.hash = u.hash.replace(/(^#|&)r=[a-z0-9]{8}/, '').replace(/^#&/, '#');
    history.replaceState(null, '', u.toString());
  } catch { /* old browsers: leave the address as is */ }
  const flag = `el-ref-${code}`;
  try { if (sessionStorage.getItem(flag)) return; sessionStorage.setItem(flag, '1'); } catch { /* blocked storage: count anyway */ }
  api.hit(code);
})();

initCountdowns(config.numerals || 'arab');
initVideos();
if (config.ballot) initBallotCards(config.ballot);

// The bot check only guards the live backend; a demo never loads it.
const siteKey = api.mode === 'live' ? config.api?.turnstileSiteKey || '' : '';

const sup = document.querySelector<HTMLElement>('[data-el-sup]');
if (sup && config.supporters) mountSupporters(sup, api, config.supporters.words, fmt, siteKey);

const form = document.querySelector<HTMLFormElement>('[data-el-complaints]');
if (form && config.complaints) mountComplaints(form, api, config.complaints, siteKey);
