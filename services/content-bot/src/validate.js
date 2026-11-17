// Code-level checks on every proposed text. The AI cannot talk its way around these.
import { LIMITS } from './config.js';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩', FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function toAsciiDigits(s) {
  return s.replace(/[٠-٩]/g, (c) => String(AR_DIGITS.indexOf(c))).replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
}
export function normalize(s) {
  return toAsciiDigits(String(s)).normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')       // tashkeel, tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase();
}
export function tokens(s) {
  return normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
const bag = (arr) => arr.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());

/** Words that exist in `newText` but not in `oldText` (multiset difference). */
export function addedTokens(oldText, newText) {
  const have = bag(tokens(oldText));
  const added = [];
  for (const t of tokens(newText)) {
    if ((have.get(t) || 0) > 0) have.set(t, have.get(t) - 1);
    else added.push(t);
  }
  return added;
}

/** Every word the bot adds must come from what the requester wrote. */
export function wordsComeFromRequest(oldText, newText, requestTexts) {
  const corpus = new Set(requestTexts.flatMap(tokens));
  const corpusArr = [...corpus];
  const missing = [];
  for (const t of addedTokens(oldText, newText)) {
    if (corpus.has(t)) continue;
    if (/^\d+$/.test(t)) { missing.push(t); continue; }                       // numbers must match exactly
    const near = t.length >= 4 && corpusArr.some((m) => m.length >= 4 && (m.includes(t) || t.includes(m)));
    if (!near) missing.push(t);
  }
  return missing;
}

const BAD_CHARS = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B\\u2028\\u2029\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]');
const FORBIDDEN = [/[<>]/, /javascript\s*:/i, /\bdata\s*:\s*text/i, /\bon[a-z]+\s*=/i, /\{\{|\}\}|\{%|%\}|\$\{/, /<!--|-->/, /`/];
const KINDS = {
  phone: /^\+?[0-9][0-9 \-()]{5,19}$/,
  email: /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/,
  url: /^https:\/\/[^\s<>"'`]+$/,
};
const placeholders = (s) => (s.match(/%[ds]|\{\d+\}/g) || []).sort().join(',');

/**
 * Returns { ok:true, value } or { ok:false, code }.
 * codes: type, empty, same, too_long, bad_chars, markup, placeholder, kind, not_from_request
 */
export function checkNewText(seg, newText, requestTexts) {
  if (typeof newText !== 'string') return { ok: false, code: 'type' };
  let v = newText.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (seg.kind === 'phone') v = toAsciiDigits(v);
  if (!v) return { ok: false, code: 'empty' };
  if (v === seg.text) return { ok: false, code: 'same' };
  const max = Math.min(LIMITS.maxTextLength, Math.max(200, seg.text.length * LIMITS.growthFactor));
  if (v.length > max) return { ok: false, code: 'too_long' };
  if (BAD_CHARS.test(v)) return { ok: false, code: 'bad_chars' };
  if (FORBIDDEN.some((re) => re.test(v))) return { ok: false, code: 'markup' };
  if (placeholders(v) !== placeholders(seg.text)) return { ok: false, code: 'placeholder' };
  if (seg.kind !== 'text' && !KINDS[seg.kind].test(v)) return { ok: false, code: 'kind' };
  if (wordsComeFromRequest(seg.text, v, requestTexts).length) return { ok: false, code: 'not_from_request' };
  return { ok: true, value: v };
}
