// Press-to-play videos ([data-el-video]): the poster button becomes a <video> only when
// pressed, so nothing is downloaded before. One video plays at a time. Chapter buttons
// ([data-el-seek] inside the same [data-el-interview]) start the player at their moment.
// While a video buffers, its box gets .is-loading (a design can show its own spinner).

function player(box: HTMLElement): HTMLVideoElement {
  const existing = box.querySelector('video');
  if (existing) return existing;
  const btn = box.querySelector<HTMLButtonElement>('.el-video__play');
  const poster = btn?.querySelector('img');
  const v = document.createElement('video');
  v.controls = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.setAttribute('controlsList', 'nodownload');
  v.addEventListener('contextmenu', (e) => e.preventDefault());
  v.setAttribute('aria-label', btn?.getAttribute('aria-label') || '');
  if (poster) v.poster = poster.currentSrc || poster.src;
  v.src = box.dataset.src || '';
  box.replaceChildren(v);
  box.classList.add('is-playing');
  return v;
}

function play(v: HTMLVideoElement) {
  const p = v.play();
  if (p && p.catch) p.catch(() => { /* autoplay refused or interrupted: the controls remain */ });
}

export function initVideos() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const btn = target?.closest?.('.el-video__play');
    if (btn) {
      const box = btn.closest<HTMLElement>('[data-el-video]');
      if (!box) return;
      const v = player(box);
      play(v);
      v.focus();
      return;
    }
    const seek = target?.closest?.<HTMLElement>('[data-el-seek]');
    if (seek) {
      const box = seek.closest('[data-el-interview]')?.querySelector<HTMLElement>('[data-el-video]');
      if (!box) return;
      const at = parseFloat(seek.dataset.elSeek || '0') || 0;
      const v = player(box);
      const go = () => { v.currentTime = at; play(v); };
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
      if (!matchMedia('(min-width: 900px)').matches) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Starting one video pauses the others ("play" does not bubble: capture).
  document.addEventListener('play', (e) => {
    document.querySelectorAll('video').forEach((v) => { if (v !== e.target) v.pause(); });
  }, true);

  const boxOf = (t: EventTarget | null) => (t instanceof HTMLVideoElement ? t.closest<HTMLElement>('[data-el-video]') : null);
  for (const type of ['waiting', 'seeking']) {
    document.addEventListener(type, (e) => boxOf(e.target)?.classList.add('is-loading'), true);
  }
  for (const type of ['playing', 'canplay', 'seeked', 'pause', 'ended', 'error']) {
    document.addEventListener(type, (e) => boxOf(e.target)?.classList.remove('is-loading'), true);
  }

  // Chapter lists sit open beside the player on wide screens; on phones they open on a tap.
  const wide = matchMedia('(min-width: 900px)');
  const open = () => document.querySelectorAll<HTMLDetailsElement>('details[data-el-open-wide]').forEach((d) => { if (wide.matches) d.open = true; });
  open();
  wide.addEventListener?.('change', open);
}
