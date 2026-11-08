// Drawing-sheet vocabulary for title blocks, captions and labels. These words
// are part of the look, not the client's content, so the layout carries them.
import type { PageContext } from '@engine/context';

const WORDS = {
  en: {
    sheet: 'Sheet', scale: 'Scale', date: 'Date', drawn: 'Drawn by', drawing: 'Drawing',
    fig: 'Fig.', rev: 'Rev.', view: 'View', detail: 'Detail', project: 'Project',
    approved: 'Approved', website: 'Website', of: 'of',
  },
  ar: {
    sheet: 'لوحة', scale: 'مقياس', date: 'التاريخ', drawn: 'الرسم', drawing: 'المخطط',
    fig: 'شكل', rev: 'مراجعة', view: 'منظر', detail: 'تفصيل', project: 'مشروع',
    approved: 'معتمد', website: 'الموقع الإلكتروني', of: 'من',
  },
} as const;

export type SheetWords = (typeof WORDS)['en'];

export function words(ctx: PageContext): SheetWords {
  return (WORDS as Record<string, SheetWords>)[ctx.locale] ?? WORDS.en;
}

/** View and detail letters, in the page's own script. */
export function letters(ctx: PageContext): readonly string[] {
  return ctx.locale === 'ar' ? ['أ', 'ب', 'ج', 'د'] : ['A', 'B', 'C', 'D'];
}

/** Two-digit figure in the client's numerals: 07, ٠٧. */
export function no(ctx: PageContext, n: number): string {
  return n < 10 ? ctx.fmt.number(0) + ctx.fmt.number(n) : ctx.fmt.number(n);
}

/** "1:1" in the client's numerals. */
export function scale(ctx: PageContext): string {
  return `${ctx.fmt.number(1)}:${ctx.fmt.number(1)}`;
}
