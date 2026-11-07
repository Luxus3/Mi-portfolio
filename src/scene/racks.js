import * as THREE from 'three';
import { COLORS, CSS, FONT, LAYOUT as L } from './palette.js';
import { glowMat, spillMat } from './effects.js';

const UNITS = 10;
const GAIN = 1.3;
const REASONS = ['fan failure', 'overheating', 'disk degraded', 'psu fault', 'link down'];
const SCREEN_W = 2.84;
const SCREEN_H = 2.0;

// Rotation so a plane faces the aisle from the given wall side.
const faceAisle = (side) => -side * (Math.PI / 2);

function makeAlertPanel() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return {
    tex,
    paint(title, sub, ok) {
      const col = ok ? CSS.green : CSS.red;
      g.fillStyle = ok ? '#021a05' : '#2a0402';
      g.fillRect(0, 0, 256, 160);
      g.strokeStyle = col;
      g.lineWidth = 8;
      g.strokeRect(4, 4, 248, 152);
      g.fillStyle = col;
      g.textAlign = 'center';
      g.font = `800 ${ok ? 38 : 56}px ${FONT}`;
      g.fillText(title, 128, ok ? 82 : 88);
      g.font = `700 22px ${FONT}`;
      g.fillText(sub, 128, 124);
      tex.needsUpdate = true;
    }
  };
}

export function buildRacks(scene, { isMobile, screens }) {
  const root = new THREE.Group();
  scene.add(root);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  // --- fill racks (instanced) ---
  const pitch = isMobile ? 1.9 : 0.95;
  const racks = [];
  for (const s of [-1, 1]) {
    for (let z = L.rackStartZ; z >= L.rackEndZ; z -= pitch) {
      if (L.sections.some((sec) => sec.side === s && Math.abs(z - sec.z) < 2.15)) continue;
      racks.push({ s, z });
    }
  }
  const nRacks = racks.length;
  const ledOffsets = isMobile ? [-0.32] : [-0.32, -0.24, 0.3];
  const perRack = UNITS * ledOffsets.length;
  const nLeds = nRacks * perRack;

  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2.2, 0.9), new THREE.MeshBasicMaterial(), nRacks);
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.15, 0.8), new THREE.MeshBasicMaterial(), nRacks * UNITS);
  const ledGeo = new THREE.BoxGeometry(0.02, 0.045, 0.05);
  const leds = new THREE.InstancedMesh(ledGeo, glowMat(0xffffff, 1), nLeds);
  const mirror = new THREE.InstancedMesh(
    ledGeo,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    }),
    nLeds
  );
  mirror.renderOrder = 2;

  const base = new Float32Array(nLeds * 3);
  const on = new Uint8Array(nLeds);
  const green = new THREE.Color(COLORS.green);
  const amber = new THREE.Color(COLORS.amber);
  const red = new THREE.Color(COLORS.red);

  racks.forEach((r, ri) => {
    dummy.position.set(r.s * 2.5, 1.1, r.z);
    dummy.updateMatrix();
    body.setMatrixAt(ri, dummy.matrix);
    const v = 0.004 + Math.random() * 0.008;
    body.setColorAt(ri, col.setRGB(v, v, v * 1.1));
    for (let u = 0; u < UNITS; u++) {
      const y = 0.3 + u * 0.19;
      dummy.position.set(r.s * 1.98, y, r.z);
      dummy.updateMatrix();
      const bi = ri * UNITS + u;
      bars.setMatrixAt(bi, dummy.matrix);
      const bv = 0.012 + Math.random() * 0.012;
      bars.setColorAt(bi, col.setRGB(bv, bv, bv));
      ledOffsets.forEach((dz, k) => {
        const i = ri * perRack + u * ledOffsets.length + k;
        dummy.position.set(r.s * 1.955, y, r.z + dz);
        dummy.updateMatrix();
        leds.setMatrixAt(i, dummy.matrix);
        dummy.position.y = -y;
        dummy.updateMatrix();
        mirror.setMatrixAt(i, dummy.matrix);
        const roll = Math.random();
        col.copy(roll < 0.55 ? green : roll < 0.85 ? amber : red).multiplyScalar(GAIN);
        base.set([col.r, col.g, col.b], i * 3);
        on[i] = Math.random() < 0.8 ? 1 : 0;
        leds.setColorAt(i, col);
      });
    }
  });
  const ledAttr = leds.instanceColor;
  mirror.instanceColor = ledAttr;
  root.add(body, bars, leds, mirror);

  function writeLed(i, f) {
    const a = ledAttr.array;
    a[i * 3] = base[i * 3] * f;
    a[i * 3 + 1] = base[i * 3 + 1] * f;
    a[i * 3 + 2] = base[i * 3 + 2] * f;
  }
  for (let i = 0; i < nLeds; i++) writeLed(i, on[i] ? 1 : 0.06);
  ledAttr.needsUpdate = true;

  // --- section racks with big screens ---
  const redBar = glowMat(COLORS.red, isMobile ? 1.05 : 3.5);
  const barGeo = new THREE.BoxGeometry(0.06, 0.06, 3.3);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x090909 });
  const bodyGeo = new THREE.BoxGeometry(1.2, 2.9, 3.4);
  const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  for (const sec of L.sections) {
    const m = new THREE.Mesh(bodyGeo, bodyMat);
    m.position.set(sec.side * 2.4, 1.45, sec.z);
    root.add(m);
    for (const y of [0.15, 2.8]) {
      const b = new THREE.Mesh(barGeo, redBar);
      b.position.set(sec.side * 1.78, y, sec.z);
      root.add(b);
    }
    const scr = new THREE.Mesh(screenGeo, glowMat(0xffffff, 1.5, { map: screens.textures[sec.name] }));
    scr.position.set(sec.side * 1.79, 1.5, sec.z);
    scr.rotation.y = faceAisle(sec.side);
    root.add(scr);
  }

  // --- contact monitor at the end of the hall ---
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.1, 0.5), bodyMat);
  monitor.position.set(0, 1.65, L.zEnd + 0.25);
  root.add(monitor);
  const cScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.95),
    glowMat(0xffffff, 1.5, { map: screens.textures.contact })
  );
  cScreen.position.set(0, 1.65, L.zEnd + 0.51);
  root.add(cScreen);
  for (const y of [0.12, 3.18]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.06, 0.06), redBar);
    b.position.set(0, y, L.zEnd + 0.52);
    root.add(b);
  }

  // --- alert system ---
  const panel = makeAlertPanel();
  const panelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.5),
    glowMat(0xffffff, 1.5, { map: panel.tex })
  );
  const glowMatAlert = spillMat(COLORS.red, 0);
  const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMatAlert);
  glowMesh.renderOrder = 3;
  panelMesh.visible = glowMesh.visible = false;
  root.add(panelMesh, glowMesh);

  let alert = null;
  const setAlertLeds = (color, f) => {
    const a = ledAttr.array;
    const from = alert.ri * perRack;
    for (let i = from; i < from + perRack; i++) {
      a[i * 3] = color.r * GAIN * f;
      a[i * 3 + 1] = color.g * GAIN * f;
      a[i * 3 + 2] = color.b * GAIN * f;
    }
  };

  function triggerAlert(emit) {
    if (alert || !nRacks) return;
    const ri = (Math.random() * nRacks) | 0;
    const r = racks[ri];
    const name = `rack-${String(ri + 1).padStart(2, '0')}`;
    const reason = REASONS[(Math.random() * REASONS.length) | 0];
    alert = { ri, name, state: 'alert', t0: performance.now() / 1000, emit };
    panel.paint('ALERT', reason.toUpperCase(), false);
    panelMesh.position.set(r.s * 1.94, 1.5, r.z);
    glowMesh.position.set(r.s * 1.9, 1.5, r.z);
    panelMesh.rotation.y = glowMesh.rotation.y = faceAisle(r.s);
    panelMesh.visible = glowMesh.visible = true;
    emit(`ALERT ${name}: ${reason}`);
  }

  // --- chaos state (mutated by chaos.js) + ping waves ---
  // power: LED multiplier; bars: red bar multiplier; wave/front: reboot sweep (racks with z >= front are lit);
  // panic: every LED solid red; boost: extra additive brightness.
  const chaos = { power: 1, bars: 1, panic: false, wave: false, front: 0, boost: 0 };
  const barBase = isMobile ? 1.05 : 3.5;
  let lastBars = 1;
  let wasFull = false;
  const PING_SPEED = 40;
  const PING_LIFE = 1.5;
  const PING_WIDTH = 3;
  const PING_GAIN = isMobile ? 2 : 3.5;
  const cyan = new THREE.Color(0x7df9ff);
  const waves = [0, 1, 2].map(() => ({ active: false, t0: 0, side: 1, z0: 0 }));
  const pr = red.r * GAIN;
  const pg = red.g * GAIN;
  const pb = red.b * GAIN;

  function ping(side, camZ, t, emit) {
    if (!nRacks) return;
    let w = waves.find((v) => !v.active);
    if (!w) w = waves.reduce((a, b) => (a.t0 <= b.t0 ? a : b));
    w.active = true;
    w.t0 = t;
    w.side = side;
    w.z0 = camZ;
    // rack on that side nearest to where the front will be mid-flight
    const zt = camZ - PING_SPEED * PING_LIFE * 0.5;
    let best = 0;
    let bd = Infinity;
    for (let ri = 0; ri < nRacks; ri++) {
      if (racks[ri].s !== side) continue;
      const d = Math.abs(racks[ri].z - zt);
      if (d < bd) {
        bd = d;
        best = ri;
      }
    }
    const ms = (0.2 + Math.random() * 0.7).toFixed(1);
    emit(`ping rack-${String(best + 1).padStart(2, '0')}: ${ms}ms`);
  }

  function fullPass(t) {
    const a = ledAttr.array;
    for (let ri = 0; ri < nRacks; ri++) {
      const r = racks[ri];
      let f = chaos.power;
      if (chaos.wave) {
        const d = r.z - chaos.front;
        f = d < 0 ? 0 : d < 1.5 ? 1 + 2 * (1 - d / 1.5) : 1;
      }
      f += chaos.boost;
      let k = 0;
      for (let w = 0; w < 3; w++) {
        const v = waves[w];
        if (!v.active || v.side !== r.s) continue;
        const x = (v.z0 - r.z - (t - v.t0) * PING_SPEED) / PING_WIDTH;
        if (x > -3 && x < 3) k = Math.max(k, Math.exp(-x * x));
      }
      const from = ri * perRack;
      for (let i = from; i < from + perRack; i++) {
        const j = i * 3;
        if (chaos.panic) {
          a[j] = pr;
          a[j + 1] = pg;
          a[j + 2] = pb;
        } else {
          const v = (on[i] ? 1 : 0.06) * f * (1 - k);
          a[j] = base[j] * v + cyan.r * k * PING_GAIN;
          a[j + 1] = base[j + 1] * v + cyan.g * k * PING_GAIN;
          a[j + 2] = base[j + 2] * v + cyan.b * k * PING_GAIN;
        }
      }
    }
  }

  function update(t) {
    let nWaves = 0;
    for (const w of waves) {
      if (w.active && t - w.t0 > PING_LIFE) w.active = false;
      if (w.active) nWaves++;
    }
    const full =
      nWaves > 0 || wasFull || chaos.panic || chaos.wave || chaos.power !== 1 || chaos.boost !== 0;
    const flips = isMobile ? 12 : 40;
    for (let k = 0; k < flips && nLeds; k++) {
      const i = (Math.random() * nLeds) | 0;
      on[i] ^= 1;
      if (!full) writeLed(i, on[i] ? 1 : 0.06);
    }
    if (full) {
      fullPass(t);
      // one extra pass after going idle restores the normal look
      wasFull = nWaves > 0 || chaos.panic || chaos.wave || chaos.power !== 1 || chaos.boost !== 0;
    }
    if (chaos.bars !== lastBars) {
      lastBars = chaos.bars;
      redBar.color.set(COLORS.red).multiplyScalar(barBase * chaos.bars);
    }
    if (alert) {
      const el = t - alert.t0;
      if (alert.state === 'alert') {
        const p = 0.5 + 0.5 * Math.sin(t * 10);
        setAlertLeds(red, 0.3 + p);
        glowMatAlert.opacity = (0.2 + 0.4 * p) * (isMobile ? 0.55 : 1);
        if (el > 4) {
          alert.state = 'ok';
          alert.t0 = t;
          panel.paint('RECOVERED', alert.name, true);
          alert.emit(`${alert.name} recovered`);
        }
      } else {
        setAlertLeds(green, 1);
        glowMatAlert.color.set(COLORS.green);
        glowMatAlert.opacity = 0.25 * Math.max(0, 1 - el / 2.5);
        if (el > 2.5) {
          const from = alert.ri * perRack;
          for (let i = from; i < from + perRack; i++) writeLed(i, on[i] ? 1 : 0.06);
          glowMatAlert.color.set(COLORS.red);
          panelMesh.visible = glowMesh.visible = false;
          alert = null;
        }
      }
    }
    ledAttr.needsUpdate = true;
  }

  return { update, triggerAlert, ping, chaos };
}
