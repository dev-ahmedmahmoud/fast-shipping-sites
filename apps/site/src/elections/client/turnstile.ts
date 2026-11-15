// Cloudflare Turnstile (the bot check the source site uses), only in live mode with a
// site key in client.json "api.turnstileSiteKey". Without a key everything here is a no-op
// and forms send an empty `ts`. The widget is invisible for most visitors; a quick
// submit waits briefly for its token.
type Widget = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id: string) => void };
declare global { interface Window { turnstile?: Widget; elTsReady?: () => void } }

let loading: Promise<void> | null = null;
function load(): Promise<void> {
  if (!loading) {
    loading = new Promise((ok) => {
      window.elTsReady = ok;
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=elTsReady';
      s.async = true;
      s.defer = true;
      document.head.append(s);
    });
  }
  return loading;
}

export function turnstile(siteKey: string) {
  let token = '';
  let id: string | null = null;
  return {
    mount(box: HTMLElement) {
      token = '';
      id = null;
      if (!siteKey) return;
      load().then(() => {
        if (!window.turnstile || !box.isConnected) return;
        id = window.turnstile.render(box, {
          sitekey: siteKey, language: 'ar', theme: 'light', appearance: 'interaction-only',
          callback: (t: string) => { token = t; box.classList.remove('is-asking'); },
          'expired-callback': () => { token = ''; },
          'before-interactive-callback': () => box.classList.add('is-asking'),
        });
      });
    },
    /** The current token, waiting up to ~6 s for the invisible check to finish. */
    token(form: HTMLElement): Promise<string> {
      if (!siteKey) return Promise.resolve('');
      return new Promise((ok) => {
        let left = 40;
        (function look() {
          if (token || !form.isConnected || left-- < 1) { ok(token); return; }
          setTimeout(look, 150);
        })();
      });
    },
    reset() {
      token = '';
      try { if (window.turnstile && id !== null) window.turnstile.reset(id); } catch { /* widget gone */ }
    },
    forget() { token = ''; id = null; },
  };
}
