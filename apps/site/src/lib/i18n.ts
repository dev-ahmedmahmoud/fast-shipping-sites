// Locale rules: Arabic is RTL; numbers and dates follow the client's numeral and calendar settings.
import client from '@client/client.json';

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DIR: Record<Locale, 'rtl' | 'ltr'> = { ar: 'rtl', en: 'ltr' };
export const LANGUAGE_NAME: Record<Locale, string> = { ar: 'العربية', en: 'English' };

const REGION: Record<Locale, string> = { ar: 'ar-SA', en: 'en-GB' };

function intlTag(locale: Locale): string {
  const nu = (client.numerals as Record<string, string>)[locale] ?? 'latn';
  return `${REGION[locale]}-u-nu-${nu}-ca-${client.calendar}`;
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlTag(locale)).format(n);
}

/** Years never take a thousands separator. */
export function formatYear(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlTag(locale), { useGrouping: false }).format(n);
}

export function formatDate(d: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlTag(locale), { dateStyle: 'long', timeZone: 'Asia/Riyadh' }).format(new Date(d));
}

/** Engine UI strings. Client content (page titles, copy) lives in clients/<slug>/content. */
export const UI = {
  ar: {
    skip: 'انتقل إلى المحتوى',
    menu: 'القائمة',
    switchTo: 'English',
    readMore: 'اقرأ المزيد',
    allNews: 'كل الأخبار',
    noNews: 'لا توجد أخبار بعد.',
    pending: 'محتوى بانتظار الاستيراد',
    links: 'روابط',
    contact: 'تواصل معنا',
    follow: 'تابعنا',
    map: 'الموقع على الخريطة',
    rights: 'جميع الحقوق محفوظة',
    newTab: '(يفتح في نافذة جديدة)',
    notFound: 'الصفحة غير موجودة',
    backHome: 'العودة إلى الرئيسية',
  },
  en: {
    skip: 'Skip to content',
    menu: 'Menu',
    switchTo: 'العربية',
    readMore: 'Read more',
    allNews: 'All news',
    noNews: 'No news yet.',
    pending: 'Content waiting to be imported',
    links: 'Links',
    contact: 'Contact',
    follow: 'Follow us',
    map: 'Map',
    rights: 'All rights reserved',
    newTab: '(opens in a new tab)',
    notFound: 'Page not found',
    backHome: 'Back to home',
  },
} satisfies Record<Locale, Record<string, string>>;

export type UiStrings = (typeof UI)['en'];
