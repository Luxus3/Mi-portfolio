import './style.css';
import { CONTENT } from './content.js';
import { initTerminal } from './ui/terminal.js';
import { initSound } from './ui/sound.js';
import { initCursor } from './ui/cursor.js';
import { initHud } from './ui/hud.js';
import { runBoot } from './ui/boot.js';
import { measure } from './ui/net.js';

let worldRef = null;
let hudRef = null;
let rooted = false;
const term = initTerminal({ getWorld: () => worldRef });

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

  worldRef = world;
  const hud = initHud();
  hudRef = hud;
  let alertSeen = false;
  world.onSection = (name) => { root.dataset.section = name; };
  world.onAlert = (text) => { alertSeen = true; hud.alertFx(text); };
  world.onPing = (text) => hud.log(text);
  world.onChaos = (fase, text) => {
    root.classList.toggle('blackout', fase === 'blackout');
    if (text) {
      hud.alertFx(text);
      term.echo(text, 'err');
    }
  };

  // Chaos: one run at a time. Wrap so the button, terminal and Konami share the lock.
  const chaosBtn = $('btn-chaos');
  const rawChaos = typeof world.chaos === 'function' ? world.chaos.bind(world) : null;
  if (rawChaos) {
    let running = null;
    world.chaos = (kind) => {
      if (running) return running;
      chaosBtn.disabled = true;
      running = Promise.resolve()
        .then(() => rawChaos(kind))
        .catch((err) => console.warn('chaos failed', err))
        .finally(() => {
          running = null;
          chaosBtn.disabled = false;
          root.classList.remove('blackout');
        });
      return running;
    };
    chaosBtn.hidden = false;
    chaosBtn.addEventListener('click', () => world.chaos('blackout'));
  }

  // Click / tap on the 3D scene -> ping the racks.
  let downX = 0;
  let downY = 0;
  let downT = 0;
  let downOk = false;
  let lastPing = 0;
  const sceneTargets = [canvas, $('spacer'), root, document.body, $('main')];
  window.addEventListener('pointerdown', (e) => {
    downOk = e.isPrimary && (e.button === 0 || e.pointerType !== 'mouse') && sceneTargets.includes(e.target);
    downX = e.clientX; downY = e.clientY; downT = performance.now();
  }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    if (!downOk) return;
    downOk = false;
    if (!root.classList.contains('ready')) return;
    const now = performance.now();
    if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 8 || now - downT >= 300) return;
    if (now - lastPing < 250) return;
    lastPing = now;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    world.ping?.(nx, ny);
  }, { passive: true });

  // Real latency chip.
  const pingLoop = async () => {
    if (!document.hidden) {
      const ms = await measure();
      if (ms != null) hud.setPing(ms);
    }
    setTimeout(pingLoop, 12000);
  };

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

  pingLoop();
  if (typeof world.ping === 'function') setTimeout(() => hud.log('TIP: click the racks', 6000), 3000);
}

function enableRoot() {
  if (rooted) return;
  rooted = true;
  root.classList.add('root');
  if (hudRef) {
    hudRef.alertFx('ROOT ACCESS GRANTED');
    hudRef.notice('ROOT ACCESS GRANTED', 5000);
  }
  term.setRoot();
  worldRef?.chaos?.('panic');
}

// Konami code on keyboard.
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let kPos = 0;
window.addEventListener('keydown', (e) => {
  if (e.repeat || !e.key) return;
  const k = e.key.toLowerCase();
  kPos = k === KONAMI[kPos] ? kPos + 1 : (k === KONAMI[0] ? 1 : 0);
  if (kPos === KONAMI.length) { kPos = 0; enableRoot(); }
});

// Mobile: tap the logo 5 times.
let taps = 0;
let lastTap = 0;
document.querySelector('.brand')?.addEventListener('click', () => {
  const now = Date.now();
  taps = now - lastTap < 1200 ? taps + 1 : 1;
  lastTap = now;
  if (taps >= 5) { taps = 0; enableRoot(); }
});


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
