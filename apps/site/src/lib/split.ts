// Word-level text splitting for motion. Never split into letters: Arabic letters
// change shape depending on their neighbours, so per-letter spans break words.
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'done') return [...el.querySelectorAll<HTMLElement>('[data-word]')];
  const words: HTMLElement[] = [];
  for (const node of [...el.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const frag = document.createDocumentFragment();
    for (const part of (node.textContent ?? '').split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const span = document.createElement('span');
      span.dataset.word = '';
      span.style.display = 'inline-block';
      span.textContent = part;
      words.push(span);
      frag.append(span);
    }
    node.replaceWith(frag);
  }
  el.dataset.split = 'done';
  return words;
}
