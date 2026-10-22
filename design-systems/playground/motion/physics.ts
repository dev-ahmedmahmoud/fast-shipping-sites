// Toy physics for the Playground hero. The toys are circles under gravity: they
// bounce, roll, knock into each other, can be dragged and flicked, hop when tapped
// or brushed by the mouse, and slide with a phone's tilt.
//
// Every toy keeps its CSS resting place (no layout changes, so no layout shift);
// physics only moves it with a transform from there. The loop sleeps when the pile
// is still, stops when the hero is off screen, and wakes on any interaction.

interface Body {
  el: HTMLElement;
  x: number; y: number;     // center, px, inside the play area
  x0: number; y0: number;   // CSS resting center (layout position, ignores transforms)
  px: number; py: number;   // position at the previous frame, for sleep detection
  vx: number; vy: number;
  r: number; mass: number;
  a: number; va: number;    // angle (deg) and spin (deg/s)
  held: boolean;
  nudgedAt: number;
}

const GRAVITY = 2600;       // px/s²
const FLOOR_BOUNCE = 0.5;
const WALL_BOUNCE = 0.6;
const TOY_BOUNCE = 0.45;
const STEP = 1 / 120;       // fixed physics step, s
const MAX_SPEED = 2800;     // px/s, for flicks
const MAX_AWAKE = 14;       // s without interaction before the loop gives up

export function startPlayground(root: HTMLElement): void {
  const play = root.querySelector<HTMLElement>('.play') ?? root;
  const ground = root.querySelector<HTMLElement>('[data-ground]');

  let W = 0;
  let floor = 0;
  let bodies: Body[] = [];
  let gx = 0;
  let running = false;
  let visible = true;
  let last = 0;
  let acc = 0;
  let calm = 0;
  let awake = 0;
  let drag: null | { b: Body; id: number; ox: number; oy: number; sx: number; sy: number; t: number; lt: number; moved: boolean } = null;

  const rotOf = (el: HTMLElement) => parseFloat(getComputedStyle(el).getPropertyValue('--rot')) || 0;

  function measure() {
    W = play.clientWidth;
    const H = play.clientHeight;
    floor = H - (ground?.offsetHeight ?? 0) + 12;
    const els = [...play.querySelectorAll<HTMLElement>('[data-toy]')].filter((el) => el.offsetParent !== null);
    bodies = els.map((el) => {
      const size = el.offsetWidth;
      const x0 = el.offsetLeft + size / 2;
      const y0 = el.offsetTop + size / 2;
      const r = size * (parseFloat(el.dataset.r ?? '') || 0.48);
      const old = bodies.find((b) => b.el === el);
      if (old) {
        // Keep where it is, re-anchored to the new resting place and size.
        old.x0 = x0; old.y0 = y0; old.r = r; old.mass = r * r;
        old.x = Math.min(Math.max(old.x, r), W - r);
        old.y = Math.min(old.y, floor - r);
        return old;
      }
      el.style.willChange = 'transform';
      return { el, x: x0, y: y0, x0, y0, px: x0, py: y0, vx: 0, vy: 0, r, mass: r * r, a: rotOf(el), va: 0, held: false, nudgedAt: 0 };
    });
  }

  function render() {
    for (const b of bodies) {
      b.el.style.transform = `translate3d(${(b.x - b.x0).toFixed(1)}px, ${(b.y - b.y0).toFixed(1)}px, 0) rotate(${b.a.toFixed(1)}deg)`;
    }
  }

  function step(dt: number) {
    for (const b of bodies) {
      if (b.held) continue;
      b.vy += GRAVITY * dt;
      b.vx += gx * dt;
      b.vx *= 0.999;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      if (b.y + b.r > floor) {
        b.y = floor - b.r;
        if (b.vy > 0) b.vy = Math.abs(b.vy) < 70 ? 0 : -b.vy * FLOOR_BOUNCE;
        b.vx *= 0.99;
        if (Math.abs(b.vx) < 3) b.vx = 0;
        b.va = (b.vx / b.r) * 57.3; // rolling
      } else {
        b.va *= 0.998;
      }
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * WALL_BOUNCE; }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * WALL_BOUNCE; }
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const bi = bodies[i];
        const bj = bodies[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const min = bi.r + bj.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const wi = bi.held ? 0 : 1 / bi.mass;
        const wj = bj.held ? 0 : 1 / bj.mass;
        const wsum = wi + wj;
        if (!wsum) continue;
        const overlap = min - d;
        bi.x -= (nx * overlap * wi) / wsum;
        bi.y -= (ny * overlap * wi) / wsum;
        bj.x += (nx * overlap * wj) / wsum;
        bj.y += (ny * overlap * wj) / wsum;
        const rvx = bj.vx - bi.vx;
        const rvy = bj.vy - bi.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const imp = (-(1 + TOY_BOUNCE) * vn) / wsum;
          bi.vx -= imp * nx * wi; bi.vy -= imp * ny * wi;
          bj.vx += imp * nx * wj; bj.vy += imp * ny * wj;
          const vt = -rvx * ny + rvy * nx;
          bi.va += vt * 0.25; bj.va -= vt * 0.25;
        }
      }
    }
  }

  function frame(t: number) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    acc += dt;
    awake += dt;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    render();
    let moved = 0;
    for (const b of bodies) {
      moved = Math.max(moved, Math.abs(b.x - b.px) + Math.abs(b.y - b.py));
      b.px = b.x; b.py = b.y;
    }
    calm = !drag && moved < 0.35 ? calm + dt : 0;
    if (calm > 0.7 || (awake > MAX_AWAKE && !drag)) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function wake() {
    awake = 0;
    calm = 0;
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    acc = 0;
    requestAnimationFrame(frame);
  }

  const local = (e: PointerEvent) => {
    const rect = play.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  root.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-toy]');
    const b = el && bodies.find((x) => x.el === el);
    if (!b || !el) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const p = local(e);
    drag = { b, id: e.pointerId, ox: b.x - p.x, oy: b.y - p.y, sx: p.x, sy: p.y, t: e.timeStamp, lt: e.timeStamp, moved: false };
    b.held = true;
    b.vx = 0; b.vy = 0;
    wake();
  });

  root.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (drag && e.pointerId === drag.id) {
      const b = drag.b;
      const dt = Math.max(8, e.timeStamp - drag.lt) / 1000;
      const nx = Math.min(Math.max(p.x + drag.ox, b.r), W - b.r);
      const ny = Math.min(p.y + drag.oy, floor - b.r);
      b.vx = 0.5 * b.vx + 0.5 * ((nx - b.x) / dt);
      b.vy = 0.5 * b.vy + 0.5 * ((ny - b.y) / dt);
      b.x = nx; b.y = ny;
      drag.lt = e.timeStamp;
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
      wake();
      return;
    }
    // A passing mouse makes nearby toys hop out of the way.
    if (e.pointerType !== 'mouse') return;
    for (const b of bodies) {
      if (b.held || e.timeStamp - b.nudgedAt < 600) continue;
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      if (dx * dx + dy * dy > (b.r + 16) ** 2) continue;
      b.nudgedAt = e.timeStamp;
      b.vy = -620 - Math.random() * 200;
      b.vx += Math.sign(dx || 1) * 240;
      wake();
    }
  });

  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const b = drag.b;
    b.held = false;
    if (!drag.moved && e.timeStamp - drag.t < 350) {
      // A tap is a jump.
      b.vy = -1050 - Math.random() * 450;
      b.vx = (Math.random() - 0.5) * 360;
      b.va = (Math.random() - 0.5) * 900;
    } else {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) { b.vx *= MAX_SPEED / speed; b.vy *= MAX_SPEED / speed; }
      b.va = b.vx * 0.6;
    }
    drag = null;
    wake();
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);

  // Tilting a phone tips the playground (browsers that ask permission first are skipped).
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    const next = (Math.max(-40, Math.min(40, e.gamma)) / 40) * 1600;
    if (Math.abs(next - gx) > 120) { gx = next; wake(); }
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else running = false;
  }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else wake(); });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { measure(); render(); wake(); }, 120);
  }).observe(play);

  // Start: the pile is already on the grass (as CSS drew it); each toy springs up
  // in turn and tumbles back down somewhere new.
  measure();
  render();
  bodies.forEach((b, i) => {
    window.setTimeout(() => {
      if (b.held) return;
      b.vy = -1100 - Math.random() * 700;
      b.vx = (Math.random() - 0.5) * 560;
      b.va = (Math.random() - 0.5) * 820;
      wake();
    }, 250 + i * 70);
  });
}
