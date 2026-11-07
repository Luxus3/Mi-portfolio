import './style.css';
import { CONTENT } from './content.js';
import { initTerminal } from './ui/terminal.js';
import { initSound } from './ui/sound.js';
import { initCursor } from './ui/cursor.js';
import { initHud } from './ui/hud.js';
import { runBoot } from './ui/boot.js';

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function show2D() {
  root.classList.remove('m3d');
  root.classList.add('m2d', 'scrollable', 'ready');
  const l = $('loader');
  if (l) l.hidden = true;
}

function initCopy() {
  const btn = $('btn-copy');
  let t = 0;
  btn.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(CONTENT.email);
      ok = true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CONTENT.email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    btn.textContent = ok ? 'COPIED' : 'PRESS CTRL+C';
    btn.classList.toggle('done', ok);
    clearTimeout(t);
    t = setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('done'); }, 1800);
  });
}

async function start3D() {
  const canvas = $('gl');
  const fillEl = $('loader-fill');
  const pctEl = $('loader-pct');
  const setProgress = (p) => {
    if (p > 1) p /= 100;
    p = Math.max(0, Math.min(1, p));
    fillEl.style.width = (p * 100).toFixed(0) + '%';
    pctEl.textContent = (p * 100).toFixed(0) + '%';
  };

  const { createWorld } = await import('./scene/world.js');
  const world = await createWorld({ canvas, isMobile, onLoadProgress: setProgress });
  setProgress(1);

  const hud = initHud();
  let alertSeen = false;
  world.onSection = (name) => { root.dataset.section = name; };
  world.onAlert = (text) => { alertSeen = true; hud.alertFx(text); };

  $('spacer').style.height = isMobile ? '600vh' : '700vh';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Scroll -> scene
  let ticking = false;
  const apply = () => {
    ticking = false;
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    world.setScroll(p);
    const name = hud.update(p);
    root.style.setProperty('--hero-o', String(Math.max(0, 1 - p / 0.1)));
    root.classList.toggle('contact-on', name === 'contact' && p > 0.9);
    root.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  }, { passive: true });

  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { world.resize(); apply(); }, 150);
  });

  let running = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { world.pause(); running = false; }
    else { world.start(); running = true; }
  });

  // Hand-off: loader -> boot -> door -> scroll
  world.start();
  const loader = $('loader');
  const boot = runBoot();
  loader.classList.add('off');
  setTimeout(() => { loader.hidden = true; }, 450);
  await boot;

  root.classList.add('ready');
  apply();
  const opening = world.openDoor();
  await opening;
  root.classList.add('scrollable');
  apply();

  // Random alerts
  const scheduleAlert = () => {
    setTimeout(() => {
      if (!document.hidden && running) {
        alertSeen = false;
        world.triggerAlert();
        setTimeout(() => { if (!alertSeen) hud.alertFx('temperature warning'); }, 150);
      }
      scheduleAlert();
    }, 12000 + Math.random() * 13000);
  };
  scheduleAlert();
}

initTerminal();
initSound();
initCursor();
initCopy();

if (reduced) {
  show2D();
} else if (!hasWebGL()) {
  show2D();
} else {
  start3D().catch((err) => {
    console.warn('3D world unavailable, showing 2D version.', err);
    show2D();
  });
}
