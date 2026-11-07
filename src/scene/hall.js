import * as THREE from 'three';
import { COLORS, LAYOUT as L } from './palette.js';
import { glowMat, spillMat } from './effects.js';

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
}

// black / blue hazard stripes
function stripes(g, x, y, w, h, step) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = '#05080e';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#1757b8';
  for (let i = -h; i < w + h; i += step * 2) {
    g.beginPath();
    g.moveTo(x + i, y + h);
    g.lineTo(x + i + step, y + h);
    g.lineTo(x + i + step + h, y);
    g.lineTo(x + i + h, y);
    g.closePath();
    g.fill();
  }
  g.restore();
}

const hazardTex = (rx, ry) => canvasTex(128, 128, (g) => stripes(g, 0, 0, 128, 128, 32), rx, ry);

const floorTex = (rx, ry) =>
  canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#05080e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#142033';
    g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
    g.fillStyle = '#0a121d';
    for (let x = 32; x < w; x += 48) for (let y = 32; y < h; y += 48) g.fillRect(x, y, 14, 14);
    g.fillStyle = 'rgba(94,224,255,0.04)';
    g.fillRect(0, 0, w, 6);
  }, rx, ry);

const wallTex = (rx, ry) =>
  canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#070b12';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#111b2a';
    g.fillRect(w - 3, 0, 3, h);
    g.fillRect(0, h - 3, w, 3);
    g.fillStyle = '#1a2a40';
    for (const [x, y] of [[10, 10], [w - 14, 10], [10, h - 14], [w - 14, h - 14]]) g.fillRect(x, y, 4, 4);
  }, rx, ry);

function doorTex(flip) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#090e17';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#03060b';
    for (let y = 64; y < h - 40; y += 56) g.fillRect(0, y, w, 4);
    stripes(g, 0, 0, w, 26, 13);
    stripes(g, 0, h - 26, w, 26, 13);
    stripes(g, flip ? 0 : w - 22, 0, 22, h, 11);
    g.fillStyle = '#1a2a40';
    for (let y = 40; y < h - 40; y += 56) for (const x of [24, w - 50]) g.fillRect(x, y, 6, 6);
  });
}

export function buildHall(scene, { isMobile }) {
  const K = isMobile ? 0.14 : 1; // no bloom on mobile: tone the blue glow down
  const S = isMobile ? 0.5 : 1;
  const hw = L.halfW;
  const H = L.height;
  const len = L.zFront - L.zEnd;
  const cz = (L.zFront + L.zEnd) / 2;
  const root = new THREE.Group();
  scene.add(root);
  const add = (geo, mat, x, y, z, order = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.renderOrder = order;
    root.add(m);
    return m;
  };
  const flat = (geo) => geo.rotateX(-Math.PI / 2);

  // floor + ceiling
  add(
    flat(new THREE.PlaneGeometry(hw * 2, len)),
    new THREE.MeshBasicMaterial({ map: floorTex(hw, len / 2), transparent: true, opacity: 0.88, depthWrite: false }),
    0, 0, cz, 1
  );

  // airlock chamber (solid walls and ceiling only up to the door) + rear wall
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex(3, H / 2) });
  const chamberLen = L.zFront - L.doorZ;
  const chamberZ = (L.zFront + L.doorZ) / 2;
  add(new THREE.PlaneGeometry(hw * 2, chamberLen).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x05080e }), 0, H, chamberZ);
  add(new THREE.PlaneGeometry(chamberLen, H).rotateY(Math.PI / 2), wallMat, -hw, H / 2, chamberZ);
  add(new THREE.PlaneGeometry(chamberLen, H).rotateY(-Math.PI / 2), wallMat, hw, H / 2, chamberZ);
  add(new THREE.PlaneGeometry(hw * 2, H).rotateY(Math.PI), wallMat, 0, H / 2, L.zFront);

  // open-to-space section: windows from the door to the end
  const wz0 = L.doorZ - 0.15;
  const wlen = wz0 - L.zEnd;
  const wcz = (wz0 + L.zEnd) / 2;
  const glass = new THREE.MeshBasicMaterial({
    color: COLORS.accent,
    transparent: true,
    opacity: 0.04,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false
  });
  const railMat = glowMat(COLORS.accent, 1.8 * K, { fog: false });
  const railGeo = new THREE.BoxGeometry(0.05, 0.05, wlen);
  for (const s of [-1, 1]) {
    add(new THREE.PlaneGeometry(wlen, H).rotateY(-s * Math.PI / 2), glass, s * hw, H / 2, wcz, 4);
    for (const y of [0.4, H - 0.05]) add(railGeo, railMat, s * (hw - 0.03), y, wcz);
    // sill + floor-level hazard strip
    add(
      new THREE.PlaneGeometry(wlen, 0.3).rotateY(-s * Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: hazardTex(wlen / 0.3, 1) }),
      s * (hw - 0.01), 0.15, wcz
    );
    add(flat(new THREE.PlaneGeometry(0.3, len)), new THREE.MeshBasicMaterial({ map: hazardTex(1, len / 0.3) }), s * 1.6, 0.02, cz);
  }

  // glass ceiling: the sky is visible overhead too
  add(new THREE.PlaneGeometry(hw * 2, wlen).rotateX(Math.PI / 2), glass, 0, H, wcz, 4);

  // end window (behind the contact monitor)
  add(new THREE.PlaneGeometry(hw * 2, H), glass, 0, H / 2, L.zEnd + 0.02, 4);
  for (const y of [0.05, H - 0.05]) add(new THREE.BoxGeometry(hw * 2, 0.06, 0.06), railMat, 0, y, L.zEnd + 0.04);

  // structural ribs: window mullions every ~3u and ceiling ribs
  const dummy = new THREE.Object3D();
  const ribN = Math.floor(wlen / 3);
  const mullions = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, H, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0b1421 }),
    (ribN + 1) * 2
  );
  const ceilRibs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(hw * 2, 0.14, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0b1421 }),
    ribN + 1
  );
  let mi = 0;
  for (let i = 0; i <= ribN; i++) {
    const z = wz0 - i * (wlen / ribN);
    for (const s of [-1, 1]) {
      dummy.position.set(s * (hw - 0.04), H / 2, z);
      dummy.updateMatrix();
      mullions.setMatrixAt(mi++, dummy.matrix);
    }
    dummy.position.set(0, H - 0.07, z);
    dummy.updateMatrix();
    ceilRibs.setMatrixAt(i, dummy.matrix);
  }
  root.add(mullions, ceilRibs);

  // cable trays
  const trayMat = new THREE.MeshBasicMaterial({ color: 0x080d16 });
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.6, 0.08, len), trayMat, s * 2.2, 3.0, cz);

  // pulsing blue tubes + floor reflections
  const tubeN = isMobile ? 7 : 14;
  const tubeStep = isMobile ? 10 : 5;
  const tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(4.4, 0.07, 0.1), glowMat(0xffffff, 1), tubeN);
  const refl = new THREE.InstancedMesh(
    flat(new THREE.PlaneGeometry(4.4, 1.1)),
    spillMat(0xffffff, 1),
    tubeN
  );
  refl.renderOrder = 2;
  for (let i = 0; i < tubeN; i++) {
    dummy.position.set(0, 3.12, -5 - i * tubeStep);
    dummy.updateMatrix();
    tubes.setMatrixAt(i, dummy.matrix);
    dummy.position.set(0, 0.03, -5 - i * tubeStep);
    dummy.updateMatrix();
    refl.setMatrixAt(i, dummy.matrix);
    tubes.setColorAt(i, new THREE.Color());
    refl.setColorAt(i, new THREE.Color());
  }
  root.add(tubes, refl);
  const accent = new THREE.Color(COLORS.accent);
  const cyan = new THREE.Color(COLORS.cyan);
  const tmp = new THREE.Color();

  // hanging cables
  const cableN = isMobile ? 16 : 46;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.7, 0, 0),
    new THREE.Vector3(-1.6, -0.55, 0),
    new THREE.Vector3(0, -0.95, 0),
    new THREE.Vector3(1.6, -0.55, 0),
    new THREE.Vector3(2.7, 0, 0)
  ]);
  const cables = new THREE.InstancedMesh(
    new THREE.TubeGeometry(curve, 24, 0.025, 5, false),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    cableN
  );
  const cableCols = [0x1a2230, 0x0f2a55, 0x10151c, 0x1b3a5a];
  for (let i = 0; i < cableN; i++) {
    let z;
    do z = -5 - Math.random() * 67;
    while (L.sections.some((s) => Math.abs(z - s.z) < 3.5));
    dummy.position.set((Math.random() - 0.5) * 0.4, 3.1, z);
    dummy.scale.set(0.9 + Math.random() * 0.15, 0.5 + Math.random() * 0.5, 1);
    dummy.updateMatrix();
    cables.setMatrixAt(i, dummy.matrix);
    cables.setColorAt(i, new THREE.Color(cableCols[(Math.random() * cableCols.length) | 0]));
  }
  root.add(cables);

  // airlock door
  const panelGeo = new THREE.BoxGeometry(3, H, 0.3);
  const left = add(panelGeo, new THREE.MeshBasicMaterial({ map: doorTex(false) }), -1.5, H / 2, L.doorZ);
  const right = add(panelGeo, new THREE.MeshBasicMaterial({ map: doorTex(true) }), 1.5, H / 2, L.doorZ);
  const seam = add(new THREE.BoxGeometry(0.05, H - 0.4, 0.05), glowMat(COLORS.accent, 3.5 * K), 0, H / 2, L.doorZ + 0.17);

  // airlock lamps in the entry chamber
  const lampMat = glowMat(COLORS.accent, 3.5 * K);
  const spill = spillMat(COLORS.accent, 0.4 * S);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.6, 0.15, 0.3), lampMat, s * 2.2, 3.05, -1.5);
    add(new THREE.PlaneGeometry(3.4, 3.4), spill, s * 2.2, 2.7, -1.5, 3);
  }

  return {
    setDoor(k) {
      left.position.x = -1.5 - 3.05 * k;
      right.position.x = 1.5 + 3.05 * k;
      seam.visible = k < 0.02;
    },
    // sun: 0..1, how much sunlight the windows catch
    update(t, sun = 0) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      lampMat.color.set(COLORS.accent).multiplyScalar((1.5 + 3 * pulse) * K);
      spill.opacity = (0.15 + 0.4 * pulse) * S;
      glass.opacity = (0.035 + 0.1 * sun) * S;
      railMat.color.set(COLORS.accent).lerp(cyan, sun * 0.6).multiplyScalar((1.8 + 2.2 * sun) * K);
      for (let i = 0; i < tubeN; i++) {
        const w = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.6);
        tubes.setColorAt(i, tmp.copy(accent).multiplyScalar((2.5 + 2.5 * w) * K));
        refl.setColorAt(i, tmp.copy(accent).multiplyScalar(0.15 + 0.35 * w));
      }
      tubes.instanceColor.needsUpdate = true;
      refl.instanceColor.needsUpdate = true;
    }
  };
}
