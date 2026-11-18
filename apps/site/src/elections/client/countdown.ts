// Election countdown ([data-el-countdown]): days, hours, minutes and seconds to the
// moment in data-at, in the client's numerals. On election day itself (by the calendar of
// the election's time zone, wherever the visitor is) the title becomes data-today and the
// box gets .is-msg; after that day, data-after. Never negative numbers.
export function initCountdowns(numerals: string) {
  const fmt = new Intl.NumberFormat(`ar-EG-u-nu-${numerals}`);
  document.querySelectorAll<HTMLElement>('[data-el-countdown]').forEach((box) => {
    const at = Date.parse(box.dataset.at || '');
    if (Number.isNaN(at)) return;
    const zone = box.dataset.zone || 'Africa/Cairo';
    const cells: Record<string, HTMLElement> = {};
    box.querySelectorAll<HTMLElement>('[data-k]').forEach((b) => { cells[b.dataset.k!] = b; });
    const title = box.querySelector<HTMLElement>('[data-el-countdown-title]');
    const day = (d: Date) => {
      try { return d.toLocaleDateString('en-CA', { timeZone: zone }); } catch { return d.toISOString().slice(0, 10); }
    };
    let timer = 0;
    const tick = () => {
      const left = at - Date.now();
      if (left <= 0) {
        const today = day(new Date(at)) === day(new Date());
        if (title) title.textContent = (today ? box.dataset.today : box.dataset.after) || '';
        box.classList.add('is-msg');
        box.classList.toggle('is-today', today);
        box.classList.toggle('is-after', !today);
        return;
      }
      const s = Math.floor(left / 1000);
      const v: Record<string, number> = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
      // Write a cell only when its number changes, so designs that animate a change (a flip,
      // a roll) move just the seconds each tick, and the minutes only when they turn over.
      for (const k of Object.keys(v)) {
        const text = fmt.format(v[k]);
        if (cells[k] && cells[k].textContent !== text) cells[k].textContent = text;
      }
      box.dataset.tick = String(s);
    };
    tick();
    timer = window.setInterval(tick, 1000);
    box.addEventListener('el:stop', () => clearInterval(timer));
  });
}
