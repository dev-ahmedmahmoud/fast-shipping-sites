// The election content pack: clients whose client.json says `"kind": "elections"` keep
// their structured data in clients/<slug>/elections.json (candidates, ballot groups,
// program files, video clips, supporters and complaints settings). Pages stay Markdown
// files like any client's (URL, title, menu place, and the prose: a candidate's bio, a
// program file's text); their `template` says which election view renders them.
// This module turns the JSON into ready-to-render shapes: images resolved for
// astro:assets, links resolved per locale, ballot numbers formatted.
import type { ImageMetadata } from 'astro';
import client from '@client/client.json';
import { byId, resolveHref, type Action, type Entry } from '@engine/content';
import { formatNumber, formatYear, type Locale } from '@engine/i18n';
import { media } from '@engine/media';

// Only election clients ship the file; others get an empty object and never call in here.
const files = import.meta.glob<Record<string, any>>('@client/elections.json', { eager: true, import: 'default' });
const raw: Record<string, any> = Object.values(files)[0] ?? {};

export const isElections = (client as { kind?: string }).kind === 'elections';

export interface VideoData {
  /** Remote or site-relative MP4; requested only when the visitor presses play. */
  src: string;
  poster: ImageMetadata;
  /** What the video is, for the play button's accessible name ("كلمة أ.د أشرف محرم"). */
  label: string;
  /** Visible caption on the poster, when the source showed one. */
  caption?: string;
  /**
   * A video that isn't ready yet: the poster shows with this badge ("قريبًا") instead of a play
   * button, and nothing plays. Set "placeholder" (true or the badge text) and leave "src" out in
   * elections.json; adding "src" later makes it a normal video.
   */
  soon?: string;
}

export interface CandidateCard {
  slug: string;
  name: string;
  seat: string;
  group: string;
  groupLabel: string;
  /** Ballot number, formatted in the client's numerals ("٢"). */
  number: string;
  numberValue: number;
  href: string;
  /** Card photo (portrait). */
  card: ImageMetadata;
  /** Profile photo (portrait, larger). */
  photo: ImageMetadata;
  photoAlt: string;
}

export interface FileCard {
  slug: string;
  title: string;
  tagline: string;
  /** Inline SVG markup for the file's icon (stroke uses currentColor). */
  icon: string;
  href: string;
  /** The board members who lead the file (elections.json files[].leads: candidate slugs). */
  leads: FileLead[];
}

export interface FileLead { slug: string; name: string; seat: string; href: string; photo: ImageMetadata }

export interface CountdownData {
  /** ISO moment with offset, e.g. 2026-11-20T20:00:00+02:00. */
  at: string;
  timezone: string;
  title: string;
  labels: { d: string; h: string; m: string; s: string };
  /** Shown instead of the numbers on election day itself, then after it. */
  today: string;
  after: string;
  dateText: string;
}

export interface BallotGroup {
  label: string;
  rows: { number: string; name: string; seat: string }[];
}

export interface Clip {
  video: VideoData;
  title: string;
  /** The speaker, on a program file's page; omitted on the speaker's own page. */
  name?: string;
  profile?: { label: string; href: string };
}

const loc = (): Locale => 'ar';
const needEntry = (id: string): Entry => {
  const e = byId(id, loc());
  if (!e) throw new Error(`elections: no page with id "${id}" (clients/<slug>/content)`);
  return e;
};
const link = (href: string) => resolveHref(href, loc())?.href ?? '#';

export const election = raw.election ?? {};
export const list = raw.list ?? {};
export const ui: Record<string, string> = raw.ui ?? {};
export const vote = raw.vote ?? {};
export const home = raw.home ?? {};
export const teamPage = raw.teamPage ?? {};
export const filesPage = raw.filesPage ?? {};
export const supporters = raw.support ?? {};
/** The list's vision (template "vision"): chapters of cards, a flow, a grid, branches and rules, then a board. */
export const vision = raw.vision ?? null;
export const complaints = raw.complaints ?? {};

export function video(v: any): VideoData | null {
  if (!v) return null;
  if (!v.src && v.placeholder && v.poster) {
    return { src: '', poster: media(v.poster), label: v.label ?? '', caption: v.caption, soon: typeof v.placeholder === 'string' ? v.placeholder : (ui.soon ?? 'قريبًا') };
  }
  if (!v.src) return null;
  return { src: v.src, poster: media(v.poster), label: v.label ?? '', caption: v.caption };
}

const groupLabel = (id: string) => (raw.groups ?? []).find((g: any) => g.id === id)?.label ?? '';

export const candidates: CandidateCard[] = (raw.candidates ?? []).map((c: any) => ({
  slug: c.slug,
  name: c.name,
  seat: c.seat,
  group: c.group,
  groupLabel: groupLabel(c.group),
  number: formatNumber(c.number, loc()),
  numberValue: c.number,
  href: isElections ? needEntry(`candidate-${c.slug}`).href : '#',
  card: media(c.card),
  photo: media(c.photo ?? c.card),
  photoAlt: c.photoAlt ?? c.name,
}));

export function candidate(slug: string): CandidateCard {
  const c = candidates.find((x) => x.slug === slug);
  if (!c) throw new Error(`elections: unknown candidate "${slug}"`);
  return c;
}

/** The raw JSON record for a candidate (word video, interview, gallery, section titles). */
export function candidateRaw(slug: string): any {
  return (raw.candidates ?? []).find((x: any) => x.slug === slug);
}

/** Candidates grouped in ballot order (the order elections.json lists the groups). */
export function candidateGroups(except?: string): { id: string; label: string; candidates: CandidateCard[] }[] {
  return (raw.groups ?? []).map((g: any) => ({
    id: g.id,
    label: g.label,
    candidates: candidates.filter((c) => c.group === g.id && c.slug !== except),
  })).filter((g: any) => g.candidates.length > 0);
}

export const programFiles: FileCard[] = (raw.files ?? []).map((f: any) => ({
  slug: f.slug,
  title: f.title,
  tagline: f.tagline,
  icon: f.icon ?? '',
  href: isElections ? needEntry(`file-${f.slug}`).href : '#',
  leads: (f.leads ?? []).map((slug: string) => {
    const c = candidate(slug);
    return { slug, name: c.name, seat: c.seat, href: c.href, photo: c.card };
  }),
}));

export function fileRaw(slug: string): any {
  return (raw.files ?? []).find((x: any) => x.slug === slug);
}

export const countdown: CountdownData = {
  at: election.at,
  timezone: election.timezone ?? 'Africa/Cairo',
  title: election.countdown?.title ?? '',
  labels: election.countdown?.labels ?? { d: '', h: '', m: '', s: '' },
  today: election.countdown?.today ?? '',
  after: election.countdown?.after ?? '',
  dateText: election.dateText ?? '',
};

export const ballotGroups: BallotGroup[] = candidateGroups().map((g) => ({
  label: g.label,
  rows: g.candidates.map((c) => ({ number: c.number, name: c.name, seat: c.seat })),
}));

const allClips: any[] = raw.clips ?? [];

/** A program file's clips, each with its speaker and a link to the speaker's profile. */
export function clipsForFile(slug: string): Clip[] {
  return allClips.filter((c) => c.file === slug).map((c) => {
    const who = candidate(c.candidate);
    return {
      video: { src: c.src, poster: media(c.poster), label: `${who.name} — ${c.title}` },
      title: c.title,
      name: who.name,
      profile: { label: ui.profileShort ?? '', href: who.href },
    };
  });
}

/** A candidate's clips, grouped by program file in the files' order. */
export function clipsForCandidate(slug: string): { title: string; href: string; clips: Clip[] }[] {
  const who = candidate(slug);
  return programFiles.map((f) => ({
    title: `${ui.filePrefix ?? ''} ${f.title}`.trim(),
    href: f.href,
    clips: allClips.filter((c) => c.file === f.slug && c.candidate === slug).map((c) => ({
      video: { src: c.src, poster: media(c.poster), label: `${who.name} — ${c.title}` },
      title: c.title,
    })),
  })).filter((g) => g.clips.length > 0);
}

export function action(a: { label: string; href: string } | undefined | null): Action | null {
  if (!a || !a.label || !a.href) return null;
  if (a.href.startsWith('#')) return { label: a.label, href: a.href, external: false };
  const target = resolveHref(a.href, loc());
  return target ? { label: a.label, ...target } : null;
}

export function timeLabel(t: number): string {
  const m = Math.floor(t / 60);
  const s = String(t % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export interface Venture {
  slug: string;
  name: string;
  /** The name in Latin letters as the logo writes it, when it has one. */
  nameLatin?: string;
  /** What the company does ("تطوير عقاري"). */
  sector: string;
  text: string;
  /** Short facts shown as tags (projects, branches). */
  highlights: string[];
  /** Full-colour logo on a transparent 3:2 canvas, for light plaques. */
  logo: ImageMetadata | null;
  /** The same logo in white on transparent, for dark backgrounds. */
  logoMono: ImageMetadata | null;
  /** The brand's main colour (any CSS colour), for small accents. */
  color?: string;
  /** The company's own website, when it has one: the card links there. */
  url?: string;
}

export interface VenturesData {
  title: string;
  lead?: string;
  /** Numbers on a board ("١٩٩٨ بداية العمل الحر"), already in the client's numerals. */
  stats: { value: string; label: string }[];
  items: Venture[];
  /** 1…n in the client's numerals, for a "٢ / ٥" counter. */
  numbers: string[];
  labels: { list: string; prev: string; next: string; pause: string; play: string; pick: string; visit: string };
}

/** A candidate's companies or affiliations (elections.json → candidates[].ventures), or null. */
export function ventures(slug: string): VenturesData | null {
  const v = candidateRaw(slug)?.ventures;
  if (!v?.items?.length) return null;
  const items: Venture[] = v.items.map((it: any) => ({
    slug: it.slug,
    name: it.name,
    nameLatin: it.nameLatin || undefined,
    sector: it.sector ?? '',
    text: it.text ?? '',
    highlights: it.highlights ?? [],
    logo: it.logo ? media(it.logo) : null,
    logoMono: it.logoMono ? media(it.logoMono) : null,
    color: it.color || undefined,
    url: it.url || undefined,
  }));
  return {
    title: v.title,
    lead: v.lead,
    stats: (v.stats ?? []).map((s: any) => ({
      value: s.year ? formatYear(s.value, loc()) : formatNumber(s.value, loc()),
      label: s.label,
    })),
    items,
    numbers: items.map((_, i) => formatNumber(i + 1, loc())),
    labels: {
      list: v.listLabel ?? v.title,
      prev: ui.prev ?? '', next: ui.next ?? '', pause: ui.pause ?? '', play: ui.resume ?? '', pick: ui.pick ?? '',
      visit: ui.visit ?? '',
    },
  };
}

export interface ShareKitData {
  /** The page the message links to, absolute (the site's home). */
  url: string;
  host: string;
  steps: string[];
  pick: string;
  /** Ready messages; "{url}" in a text is replaced with the link. */
  messages: { label: string; text: string }[];
  /** What the link's preview card shows in the chat (the linked page's own share data). */
  preview: { image: ImageMetadata | null; title: string; description: string };
  labels: { button: string; copy: string; copyLink: string; copied: string; note: string; preview: string };
  chat: { name: string; status: string; reply: string; input: string };
}

/**
 * The support page as a WhatsApp share kit (elections.json → support.share), or null when the
 * client keeps the supporters' sign-up app. `url` is the absolute link to share.
 */
export function shareKit(url: string, preview: ShareKitData['preview']): ShareKitData | null {
  const s = supporters.share;
  if (!s?.messages?.length) return null;
  return {
    url,
    host: new URL(url).host,
    steps: s.steps ?? [],
    pick: s.pick ?? '',
    messages: s.messages.map((m: any) => ({ label: m.label, text: String(m.text).replaceAll('{url}', url) })),
    preview,
    labels: { button: s.button ?? '', copy: s.copy ?? '', copyLink: s.copyLink ?? '', copied: s.copied ?? '', note: s.note ?? '', preview: s.previewLabel ?? '' },
    chat: { name: s.chat?.name ?? '', status: s.chat?.status ?? '', reply: s.chat?.reply ?? '', input: s.chat?.input ?? '' },
  };
}

export const crest = list.crest ? media(list.crest) : null;
/** The club's building, shown pale behind the page heroes (elections.json list.backdrop). */
export const backdrop = list.backdrop ? media(list.backdrop) : null;
export const cardLogo = list.cardLogo ? media(list.cardLogo) : null;
export const shareImage = (name?: string) => (name ? media(name) : list.shareImage ? media(list.shareImage) : null);
export { link };
