// What counts as "text". Everything not listed here is design/config and can NOT be changed by the bot.
// This is the single place Ahmed reviews. Patterns: "*" matches exactly one path segment.

/** Only these files, only these string values. Paths are relative to CLIENT_DIR. */
export const EDITABLE = {
  'elections.json': {
    type: 'json',
    rules: [
      '/election/title', '/election/dateText',
      '/election/countdown/title', '/election/countdown/labels/*', '/election/countdown/today', '/election/countdown/after',
      '/election/location/name', '/election/location/street', '/election/location/locality', '/election/location/region',
      '/list/name', '/list/slogan',
      '/groups/*/label',
      '/candidates/*/name', '/candidates/*/seat', '/candidates/*/photoAlt', '/candidates/*/kicker/label',
      '/candidates/*/galleryLabel', '/candidates/*/filesTitle', '/candidates/*/restTitle', '/candidates/*/description',
      '/candidates/*/ventures/title', '/candidates/*/ventures/lead', '/candidates/*/ventures/listLabel',
      '/candidates/*/ventures/stats/*/label',
      '/candidates/*/ventures/items/*/name', '/candidates/*/ventures/items/*/sector', '/candidates/*/ventures/items/*/text',
      '/candidates/*/ventures/items/*/highlights/*',
      '/files/*/title', '/files/*/tagline', '/files/*/kicker/label', '/files/*/clipsTitle', '/files/*/othersTitle',
      '/vote/title', '/vote/text', '/vote/shareText', '/vote/share/label', '/vote/support/label', '/vote/download/label',
      '/ui/*',
      '/home/hero/title', '/home/hero/slogan', '/home/hero/sub', '/home/hero/actions/*/label', '/home/hero/imageAlt',
      '/home/filesTitle', '/home/leader/kicker', '/home/leader/more', '/home/leader/text',
      '/home/team/title', '/home/team/lead', '/home/team/all',
      '/home/interviews/title', '/home/interviews/lead',
      '/home/cta/title', '/home/cta/text', '/home/cta/action/label',
      '/teamPage/title', '/teamPage/lead', '/filesPage/title', '/filesPage/lead', '/filesPage/hint',
      '/support/title', '/support/words/*',
      '/complaints/title', '/complaints/lead', '/complaints/legend', '/complaints/submit', '/complaints/sending',
      '/complaints/failed', '/complaints/success', '/complaints/demoNote',
      '/complaints/fields/*/label', '/complaints/fields/*/placeholder', '/complaints/fields/*/required',
      '/complaints/fields/*/digits', '/complaints/fields/*/invalid', '/complaints/fields/*/tooBig',
      '/complaints/fields/*/badType', '/complaints/fields/*/button', '/complaints/fields/*/help',
      '/chrome/headerCta', '/chrome/nav/*/label', '/chrome/copyright',
    ].map((p) => ({ pattern: p, kind: 'text' })),
  },
  // Only text-like values of client.json. Domains, api, samples, logo, colours etc. stay out.
  'client.json': {
    type: 'json',
    rules: [
      { pattern: '/name/ar', kind: 'text' }, { pattern: '/shortName/ar', kind: 'text' }, { pattern: '/motto/ar', kind: 'text' },
      { pattern: '/contact/address', kind: 'text' }, { pattern: '/contact/hours', kind: 'text' },
      { pattern: '/contact/phones/*', kind: 'phone' }, { pattern: '/contact/whatsapp/*', kind: 'phone' },
      { pattern: '/contact/emails/*', kind: 'email' }, { pattern: '/contact/mapUrl', kind: 'url' },
      { pattern: '/social/*/label', kind: 'text' }, { pattern: '/social/*/href', kind: 'url' },
      { pattern: '/copyright/ar', kind: 'text' }, { pattern: '/footerCredit/text/ar', kind: 'text' },
    ],
  },
};

/** Markdown pages: content/**.md. Front-matter keys and HTML text nodes of the body. */
export const MD_FRONT_MATTER_KEYS = ['title', 'description', 'titleTag', 'navLabel'];
export const MD_GLOB_PREFIX = 'content/';

/** Friendly page names + routes for messages and preview links (best effort; Ahmed can adjust). */
export const JSON_SECTIONS = {
  election: { ar: 'موعد ومكان الانتخابات', en: 'Election date and place', route: '/' },
  list: { ar: 'اسم القائمة وشعارها', en: 'List name and slogan', route: '/' },
  groups: { ar: 'مجموعات المرشحين', en: 'Candidate groups', route: '/team/' },
  candidates: { ar: 'مرشح', en: 'Candidate', route: '/team/' },
  files: { ar: 'الملفات', en: 'Files', route: '/files/' },
  vote: { ar: 'انتخب القائمة', en: 'Vote block', route: '/' },
  ui: { ar: 'نصوص الواجهة', en: 'Interface words', route: '/' },
  home: { ar: 'الصفحة الرئيسية', en: 'Home page', route: '/' },
  teamPage: { ar: 'صفحة المرشحين', en: 'Team page', route: '/team/' },
  filesPage: { ar: 'صفحة الملفات', en: 'Files page', route: '/files/' },
  support: { ar: 'صفحة فريق الدعم', en: 'Support team page', route: '/support/' },
  complaints: { ar: 'صفحة الشكاوى', en: 'Complaints page', route: '/complaints/' },
  chrome: { ar: 'القائمة العلوية والفوتر', en: 'Menu and footer', route: '/' },
};

// Limits
export const LIMITS = {
  maxEditsPerChange: 8,
  maxTextLength: 1500,          // hard cap for any value
  growthFactor: 3,              // new value may be at most max(200, old*3) characters
  pendingHours: 24,
  msgPerHour: 30,
  claudeCallsPerDay: 60,
  pendingPerPerson: 5,
  convoMinutes: 30,
  maxIncomingChars: 1500,
};

export function pathAllowed(clientDir, path) {
  if (typeof path !== 'string' || path.includes('..') || path.includes('\\') || path.startsWith('/')) return false;
  if (!path.startsWith(clientDir + '/')) return false;
  const rel = path.slice(clientDir.length + 1);
  if (rel === 'elections.json' || rel === 'client.json') return true;
  return rel.startsWith(MD_GLOB_PREFIX) && rel.endsWith('.md');
}
