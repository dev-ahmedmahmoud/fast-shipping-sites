// Sharing to WhatsApp from an iPhone or iPad. The site's share links are WhatsApp's web links
// with no number (https://wa.me/?text=…), which on Android open the "send to" list. On iOS the
// same link opens WhatsApp but not the list, so nobody can be picked (reported 27 Nov). There,
// a press on any such link opens WhatsApp's own address instead, whatsapp://send?text=…, which
// does show the list. Links to a set number (wa.me/<number>, the complaints form) are left
// alone: they open that chat on every phone. Delegated, so links made or changed later (the
// share kit's chosen message, the supporters' own link) are covered too.

const ios = (): boolean =>
  /iP(hone|ad|od)/.test(navigator.userAgent)
  // iPadOS asks for the desktop site and calls itself a Mac; a Mac has no touch screen.
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 0);

/** The text of a WhatsApp share link with no number, or null for any other link. */
function shareText(href: string): string | null {
  let u: URL;
  try { u = new URL(href); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  const path = u.pathname.replace(/\/+$/, '');
  const noNumber = (host === 'wa.me' && path === '') || (host === 'api.whatsapp.com' && path === '/send' && !u.searchParams.get('phone'));
  return noNumber ? (u.searchParams.get('text') ?? '') : null;
}

export function initWhatsAppShare(): void {
  if (!ios()) return;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const text = shareText(a.href);
    if (text === null) return;
    e.preventDefault();
    location.href = `whatsapp://send?text=${encodeURIComponent(text)}`;
  });
}
