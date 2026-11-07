import * as THREE from 'three';
import { COLORS, LAYOUT as L, ZONES } from './palette.js';
import { createComposer } from './effects.js';
import { createScreens } from './screens.js';
import { buildHall } from './hall.js';
import { buildRacks } from './racks.js';
import { buildSpace } from './space.js';

const DOOR_TIME = 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const nextTick = () => new Promise((r) => setTimeout(r, 0));

export async function createWorld({ canvas, isMobile = false, onLoadProgress = () => {} }) {
  const progress = (v) => onLoadProgress(clamp01(v));
  progress(0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setClearColor(COLORS.bg);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.04);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
  camera.position.set(0, L.camY, 0);

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  await nextTick();
  progress(0.1);

  const space = buildSpace(scene, { isMobile });
  await nextTick();
  progress(0.3);

  const hall = buildHall(scene, { isMobile });
  await nextTick();
  progress(0.45);

  const screens = createScreens(aniso);
  await nextTick();
  progress(0.6);

  const racks = buildRacks(scene, { isMobile, screens });
  await nextTick();
  progress(0.78);

  const fx = isMobile ? null : createComposer(renderer, scene, camera);

  const repaint = () => screens.repaintAll();
  if (document.fonts) {
    const font = "500 30px 'JetBrains Mono'";
    const loads = [document.fonts.load(font), document.fonts.load("800 30px 'JetBrains Mono'")].map((p) => p.catch(() => {}));
    await Promise.race([Promise.all(loads).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 3000))]);
    repaint();
    document.fonts.addEventListener?.('loadingdone', repaint);
  }
  progress(0.95);

  // --- state ---
  let target = 0;
  let sp = 0;
  let opened = false;
  let door = null; // { t0, resolve }
  let doorK = 0;
  let walkAmp = 0;
  let phase = 0;
  let zoneIdx = 0;
  let running = false;
  let raf = 0;
  let last = 0;
  const lookAt = new THREE.Vector3();
  const shot = new THREE.Vector3();

  const world = {
    onSection: null,
    onAlert: null,
    setScroll(p) {
      if (opened) target = clamp01(p);
    },
    openDoor() {
      if (door) return door.promise;
      if (doorK >= 1) return Promise.resolve();
      opened = true;
      door = { t0: performance.now() / 1000 };
      door.promise = new Promise((r) => (door.resolve = r));
      world.start();
      return door.promise;
    },
    onPing: null,
    triggerAlert() {
      racks.triggerAlert((txt) => world.onAlert?.(txt));
    },
    // nx, ny in [-1, 1] (ny up); the wave goes down the left or right rack row depending on nx
    ping(nx) {
      racks.ping(nx < 0 ? -1 : 1, camera.position.z, performance.now() / 1000, (txt) => world.onPing?.(txt));
    },
    resize,
    start() {
      if (running) return;
      running = true;
      last = performance.now() / 1000;
      raf = requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      world.pause();
      document.fonts?.removeEventListener?.('loadingdone', repaint);
      space.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        for (const m of [].concat(o.material || [])) {
          m.map?.dispose();
          m.dispose();
        }
      });
      fx?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep ~60deg horizontal fov on narrow screens so side screens stay readable
    camera.fov = Math.min(88, Math.max(58, (2 * Math.atan(Math.tan(Math.PI / 6) / camera.aspect) * 180) / Math.PI));
    camera.updateProjectionMatrix();
    fx?.setSize(w, h);
  }

  function updateCamera(t, dt) {
    const prev = sp;
    sp += (target - sp) * (1 - Math.exp(-4 * dt));
    const dz = Math.abs(sp - prev) * L.camTravel;
    walkAmp += (clamp01(dz / Math.max(dt, 1e-3) / 3) - walkAmp) * (1 - Math.exp(-6 * dt));
    phase += dz * 4.5;

    const intro = ease(clamp01(doorK));
    const z = -L.camIntro * intro - sp * L.camTravel;
    let x = Math.sin(phase) * 0.03 * walkAmp;
    const y = L.camY + Math.sin(phase * 2) * 0.035 * walkAmp + Math.sin(t * 1.1) * 0.01;

    lookAt.set(0, L.camY, z - 10);
    for (const s of L.sections) {
      const k = clamp01(1 - Math.abs(sp - s.c) / 0.1);
      const w = k * k * (3 - 2 * k);
      if (w <= 0) continue;
      x -= s.side * w * (camera.aspect < 1 ? 2 : 1.2);
      shot.set(s.side * 1.79, 1.5, s.z);
      lookAt.lerp(shot, w);
    }
    camera.position.set(x, y, z);
    camera.lookAt(lookAt);
    camera.rotateZ(Math.sin(phase) * 0.004 * walkAmp);
    // very subtle station drift / hull vibration
    camera.rotateZ(Math.sin(t * 0.21) * 0.003);
    camera.position.x += Math.sin(t * 0.37) * 0.012 + Math.sin(t * 31) * 0.0012;
    camera.position.y += Math.sin(t * 0.29 + 1) * 0.01 + Math.sin(t * 27) * 0.0012;

    let idx = 0;
    ZONES.forEach(([, from], i) => {
      if (sp >= from) idx = i;
    });
    if (idx !== zoneIdx) {
      zoneIdx = idx;
      world.onSection?.(ZONES[idx][0]);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    const dt = Math.min(0.05, Math.max(0.001, t - last));
    last = t;

    if (door && doorK < 1) {
      doorK = clamp01((t - door.t0) / DOOR_TIME);
      hall.setDoor(ease(doorK));
      if (doorK >= 1) {
        door.resolve();
        door = null;
      }
    }
    updateCamera(t, dt);
    space.update(t, dt, camera, sp);
    hall.update(t, space.sunLight);
    racks.update(t);
    screens.animate(t, camera.position.z);
    if (fx) fx.render();
    else renderer.render(scene, camera);
  }

  resize();
  progress(1);
  return world;
}
