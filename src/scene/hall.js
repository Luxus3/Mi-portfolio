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

function stripes(g, x, y, w, h, step) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = '#0a0a0a';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#b01810';
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
    g.fillStyle = '#070707';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d1d1d';
    g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
    g.fillStyle = '#0d0d0d';
    for (let x = 32; x < w; x += 48) for (let y = 32; y < h; y += 48) g.fillRect(x, y, 14, 14);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.fillRect(0, 0, w, 6);
  }, rx, ry);

const wallTex = (rx, ry) =>
  canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#0b0b0b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#161616';
    g.fillRect(w - 3, 0, 3, h);
    g.fillRect(0, h - 3, w, 3);
    g.fillStyle = '#1f1f1f';
    for (const [x, y] of [[10, 10], [w - 14, 10], [10, h - 14], [w - 14, h - 14]]) g.fillRect(x, y, 4, 4);
  }, rx, ry);

function doorTex(flip) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0e0e0e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#050505';
    for (let y = 64; y < h - 40; y += 56) g.fillRect(0, y, w, 4);
    stripes(g, 0, 0, w, 26, 13);
    stripes(g, 0, h - 26, w, 26, 13);
    stripes(g, flip ? 0 : w - 22, 0, 22, h, 11);
    g.fillStyle = '#222';
    for (let y = 40; y < h - 40; y += 56) for (const x of [24, w - 50]) g.fillRect(x, y, 6, 6);
  });
}

export function buildHall(scene, { isMobile }) {
  const K = isMobile ? 0.1 : 1; // no bloom on mobile: tone red glow down
  const S = isMobile ? 0.55 : 1;
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

  // shell
  add(
    flat(new THREE.PlaneGeometry(hw * 2, len)),
    new THREE.MeshBasicMaterial({ map: floorTex(hw, len / 2), transparent: true, opacity: 0.88, depthWrite: false }),
    0, 0, cz, 1
  );
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex(len / 2, H / 2) });
  add(new THREE.PlaneGeometry(len, H).rotateY(Math.PI / 2), wallMat, -hw, H / 2, cz);
  add(new THREE.PlaneGeometry(len, H).rotateY(-Math.PI / 2), wallMat, hw, H / 2, cz);
  add(new THREE.PlaneGeometry(hw * 2, H), new THREE.MeshBasicMaterial({ map: wallTex(3, H / 2) }), 0, H / 2, L.zEnd);
  add(new THREE.PlaneGeometry(hw * 2, H).rotateY(Math.PI), wallMat, 0, H / 2, L.zFront);
  add(new THREE.PlaneGeometry(hw * 2, len).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x070707 }), 0, H, cz);

  // hazard stripes: floor lanes and wall base
  for (const s of [-1, 1]) {
    add(flat(new THREE.PlaneGeometry(0.3, len)), new THREE.MeshBasicMaterial({ map: hazardTex(1, len / 0.3) }), s * 1.6, 0.02, cz);
    add(
      new THREE.PlaneGeometry(len, 0.3).rotateY(s * -Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: hazardTex(len / 0.3, 1) }),
      s * (hw - 0.01), 0.15, cz
    );
  }

  // cable trays
  const trayMat = new THREE.MeshBasicMaterial({ color: 0x0c0c0c });
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.6, 0.08, len), trayMat, s * 2.2, 3.0, cz);

  // pulsing red tubes + floor reflections
  const tubeN = isMobile ? 7 : 14;
  const tubeStep = isMobile ? 10 : 5;
  const tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(4.4, 0.07, 0.1), glowMat(0xffffff, 1), tubeN);
  const refl = new THREE.InstancedMesh(
    flat(new THREE.PlaneGeometry(4.4, 1.1)),
    spillMat(0xffffff, 1),
    tubeN
  );
  refl.renderOrder = 2;
  const dummy = new THREE.Object3D();
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
  const red = new THREE.Color(COLORS.red);
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
  const cableCols = [0x2a2a2a, 0x401010, 0x151515, 0x4a3000];
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

  // double industrial door
  const panelGeo = new THREE.BoxGeometry(3, H, 0.3);
  const left = add(panelGeo, new THREE.MeshBasicMaterial({ map: doorTex(false) }), -1.5, H / 2, L.doorZ);
  const right = add(panelGeo, new THREE.MeshBasicMaterial({ map: doorTex(true) }), 1.5, H / 2, L.doorZ);
  const seam = add(new THREE.BoxGeometry(0.05, H - 0.4, 0.05), glowMat(COLORS.red, 3.5 * K), 0, H / 2, L.doorZ + 0.17);

  // emergency lamps in the entry room
  const lampMat = glowMat(COLORS.red, 3.5 * K);
  const spill = spillMat(COLORS.red, 0.4 * S);
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
    update(t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      lampMat.color.set(COLORS.red).multiplyScalar((1.5 + 3 * pulse) * K);
      spill.opacity = (0.15 + 0.4 * pulse) * S;
      for (let i = 0; i < tubeN; i++) {
        const w = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.6);
        tubes.setColorAt(i, tmp.copy(red).multiplyScalar((2.5 + 2.5 * w) * K));
        refl.setColorAt(i, tmp.copy(red).multiplyScalar(0.15 + 0.35 * w));
      }
      tubes.instanceColor.needsUpdate = true;
      refl.instanceColor.needsUpdate = true;
    }
  };
}
