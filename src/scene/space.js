import * as THREE from 'three';
import { glowTexture } from './effects.js';

// Everything lives in a group that follows the camera (no parallax, "infinite" distance).
// Opaque bodies (Earth, Moon) render first and write depth so stars never show through them;
// the hall draws over them because it is always nearer in depth.
const STAR_R = 570; // beyond Earth (400 + 110) so stars never draw over it; camera far is 600
const EARTH_DIST = 400;
const EARTH_R = 110;
const MOON_DIST = 170;
const MOON_R = 28;
const SUN_DIST = 320;
const SUN_ELEV = 0.5; // rad, keeps the Sun above the Moon
const ORBIT_PERIOD = 90; // seconds per full sky revolution (Sun azimuth)

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

const NOISE = /* glsl */ `
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < OCT; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
`;

const BODY_VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const OUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

const EARTH_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform float uTime;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
${NOISE}
void main() {
  vec3 p = normalize(vObj);
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);

  float h = fbm(p * 2.4 + 5.0);
  float land = smoothstep(0.5, 0.54, h);
  float lat = abs(p.y);
  float ice = smoothstep(0.8, 0.9, lat + (h - 0.5) * 0.25);

  vec3 ocean = mix(vec3(0.005, 0.03, 0.14), vec3(0.02, 0.16, 0.42), smoothstep(0.2, 0.5, h));
  float dry = smoothstep(0.3, 0.65, noise(p * 5.0 + 2.0)) * (1.0 - smoothstep(0.0, 0.7, lat));
  vec3 landc = mix(vec3(0.06, 0.2, 0.07), vec3(0.4, 0.32, 0.16), dry);
  landc = mix(landc, vec3(0.3, 0.27, 0.23), smoothstep(0.54, 0.75, h) * 0.6);
  vec3 alb = mix(ocean, landc, land);
  alb = mix(alb, vec3(0.85, 0.9, 1.0), ice);

  float cs = uTime * 0.05;
  vec3 pc = vec3(p.x * cos(cs) + p.z * sin(cs), p.y, -p.x * sin(cs) + p.z * cos(cs));
  float cl = smoothstep(0.52, 0.78, fbm(pc * 3.2 + 11.0));

  float ndl = dot(N, uSun);
  float day = smoothstep(-0.08, 0.22, ndl);
  float diff = max(ndl, 0.0);
  vec3 col = alb * (0.02 + 0.8 * diff);
  vec3 R = reflect(-uSun, N);
  col += vec3(0.6, 0.8, 1.0) * pow(max(dot(R, V), 0.0), 60.0) * (1.0 - land) * (1.0 - cl) * (1.0 - ice) * day * 0.5;
  col = mix(col, vec3(0.9) * (0.03 + 0.8 * diff), cl * 0.85);

  float city = smoothstep(0.68, 0.8, noise(p * 22.0 + 4.0) * 0.6 + noise(p * 9.0) * 0.4) * smoothstep(0.45, 0.55, fbm(p * 3.0 + 9.0));
  col += vec3(1.0, 0.62, 0.18) * city * land * (1.0 - ice) * (1.0 - day) * (1.0 - cl * 0.8) * 1.2;

  float twil = smoothstep(0.0, 0.12, ndl) * (1.0 - smoothstep(0.12, 0.4, ndl));
  col += vec3(0.6, 0.25, 0.1) * twil * 0.1;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.25, 0.55, 1.0) * fres * 0.5 * (0.15 + day);

  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform float uGain;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 N = normalize(vN);
  float d = clamp(dot(N, normalize(vV)), 0.0, 1.0);
  // shell is 1.1x the planet: the planet limb sits at d = 0.416
  float i = pow(smoothstep(0.0, 0.416, d), 1.6) * (1.0 - smoothstep(0.416, 0.8, d));
  float lightF = 0.2 + 0.8 * smoothstep(-0.35, 0.45, dot(N, uSun));
  vec3 c = mix(vec3(0.12, 0.4, 1.0), vec3(0.5, 0.85, 1.0), i * 0.5) * i * lightF * uGain;
  gl_FragColor = vec4(c, 1.0);
  ${OUT}
}
`;

const MOON_FRAG = /* glsl */ `
uniform vec3 uSun;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
${NOISE}
float craters(vec3 p, float sc) {
  vec3 q = p * sc;
  vec3 i = floor(q);
  vec3 f = fract(q);
  float v = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 c = i + g;
        if (hash(c) < 0.45) continue;
        vec3 o = vec3(hash(c + 7.1), hash(c + 13.7), hash(c + 3.3));
        float r = 0.18 + 0.3 * hash(c + 21.0);
        float d = length(g + o - f) / r;
        v += smoothstep(0.8, 1.0, d) * (1.0 - smoothstep(1.0, 1.35, d)) * 0.22 - (1.0 - smoothstep(0.55, 1.0, d)) * 0.25;
      }
    }
  }
  return v;
}
void main() {
  vec3 p = normalize(vObj);
  vec3 N = normalize(vN);
  float maria = smoothstep(0.45, 0.55, fbm(p * 1.6 + 3.0));
  float base = mix(0.4, 0.68, maria);
  float c = craters(p, 6.0);
  #ifndef MOBILE
  c += craters(p, 14.0) * 0.7;
  #endif
  float alb = clamp(base * (1.0 + c) + (noise(p * 40.0) - 0.5) * 0.06, 0.05, 1.0);
  float diff = max(dot(N, uSun), 0.0);
  vec3 col = vec3(alb) * vec3(1.0, 0.98, 0.95) * (0.9 * diff) + vec3(0.008, 0.012, 0.022);
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}
`;

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uScale;
varying vec3 vC;
varying float vA;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  float tw = 0.7 + 0.3 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 50.0);
  gl_PointSize = aSize * uScale * (0.85 + 0.15 * tw);
  vC = aColor;
  vA = tw;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vC;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 1.2);
  gl_FragColor = vec4(vC * a * vA * 1.5, 1.0);
}
`;

function discTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.7, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function lightSprite(map, hex, gain, size, order) {
  const mat = new THREE.SpriteMaterial({
    map,
    color: new THREE.Color(hex).multiplyScalar(gain),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  s.renderOrder = order;
  s.frustumCulled = false;
  return s;
}

export function buildSpace(scene, { isMobile = false } = {}) {
  const sky = new THREE.Group();
  scene.add(sky);

  const sunDir = new THREE.Vector3();
  const shared = {
    uSun: { value: sunDir },
    uTime: { value: 0 }
  };
  const OCT = isMobile ? 3 : 5;
  const defines = isMobile ? { OCT, MOBILE: 1 } : { OCT };
  const body = (frag, extra = {}) =>
    new THREE.ShaderMaterial({
      vertexShader: BODY_VERT,
      fragmentShader: frag,
      uniforms: { uSun: shared.uSun, uTime: shared.uTime, ...extra },
      defines
    });

  // --- stars ---
  const starN = isMobile ? 1000 : 2600;
  const pos = new Float32Array(starN * 3);
  const size = new Float32Array(starN);
  const seed = new Float32Array(starN);
  const color = new Float32Array(starN * 3);
  const cool = new THREE.Color(0.7, 0.82, 1.0);
  const warm = new THREE.Color(1.0, 0.9, 0.75);
  const tint = new THREE.Color();
  for (let i = 0; i < starN; i++) {
    const z = Math.random() * 2 - 1;
    const ph = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    pos.set([r * Math.cos(ph) * STAR_R, z * STAR_R, r * Math.sin(ph) * STAR_R], i * 3);
    const big = Math.pow(Math.random(), 6);
    size[i] = 2.8 + big * 6;
    seed[i] = Math.random();
    const br = 0.85 + 0.15 * Math.random();
    tint.copy(cool).lerp(warm, Math.random()).multiplyScalar(br);
    color.set([tint.r, tint.g, tint.b], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const starMat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      uTime: shared.uTime,
      uScale: { value: Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2) }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -9;
  sky.add(stars);

  // --- Earth (to the right and below the hall) ---
  const earthPos = new THREE.Vector3(0.5, 0.42, -0.76).normalize().multiplyScalar(EARTH_DIST);
  const earthTilt = new THREE.Group();
  earthTilt.position.copy(earthPos);
  earthTilt.rotation.z = 0.41;
  sky.add(earthTilt);
  const earthSeg = isMobile ? [32, 24] : [64, 48];
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, ...earthSeg), body(EARTH_FRAG));
  earth.renderOrder = -10;
  earth.frustumCulled = false;
  earthTilt.add(earth);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.1, earthSeg[0] / 2, earthSeg[1] / 2),
    new THREE.ShaderMaterial({
      vertexShader: BODY_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: { uSun: shared.uSun, uGain: { value: isMobile ? 1.1 : 2.0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  atmo.renderOrder = -8;
  atmo.frustumCulled = false;
  earthTilt.add(atmo);

  // --- Moon (left, ahead) ---
  const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, isMobile ? 24 : 40, isMobile ? 16 : 28), body(MOON_FRAG));
  moon.position.set(-0.42, 0.5, -0.76).normalize().multiplyScalar(MOON_DIST);
  moon.rotation.y = 2.1;
  moon.renderOrder = -10;
  moon.frustumCulled = false;
  sky.add(moon);

  // --- Sun: disc + corona + halo, plus cheap lens-flare ghosts ---
  const disc = discTexture();
  const glow = glowTexture();
  const sun = new THREE.Group();
  sun.add(
    lightSprite(glow, 0x7fb8ff, 0.28, 520, -7),
    lightSprite(glow, 0xffe2b0, 0.65, 170, -6),
    lightSprite(disc, 0xfff4e0, isMobile ? 1 : 3, 30, -5)
  );
  sky.add(sun);
  const flareSpec = [
    [0.45, 0x5ee0ff, 0.1, 34],
    [0.8, 0xffb000, 0.07, 20],
    [1.25, 0x2f8cff, 0.1, 60]
  ];
  const flares = flareSpec.map(([m, hex, op, sz]) => {
    const s = lightSprite(glow, hex, 1, sz, -4);
    s.material.opacity = 0;
    sky.add(s);
    return { s, m, op };
  });

  const fwd = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let sunLight = 0;

  return {
    // 0..1: how much sunlight the windows catch (peaks with the Sun straight ahead)
    get sunLight() {
      return sunLight;
    },
    update(t, dt, camera, progress = 0) {
      sky.position.copy(camera.position);
      shared.uTime.value = t;

      // the station orbits: the Sun sweeps the sky (sunrise ahead, night behind)
      const a = 1.1 + (t * Math.PI * 2) / ORBIT_PERIOD + progress * 0.8;
      const ce = Math.cos(SUN_ELEV);
      sunDir.set(-Math.cos(a) * ce, Math.sin(SUN_ELEV), -Math.sin(a) * ce);
      sun.position.copy(sunDir).multiplyScalar(SUN_DIST);
      sunLight = smooth(0.3, 0.85, -sunDir.z);

      stars.rotation.y = t * 0.02 + progress * 0.35;
      earth.rotation.y = t * 0.08;

      camera.getWorldDirection(fwd);
      const vis = smooth(0.35, 0.75, sunDir.dot(fwd));
      for (const f of flares) {
        tmp.copy(sunDir).lerp(fwd, f.m).normalize().multiplyScalar(SUN_DIST);
        f.s.position.copy(tmp);
        f.s.material.opacity = f.op * vis;
        f.s.visible = vis > 0.01;
      }
    },
    dispose() {
      scene.remove(sky);
      sky.traverse((o) => {
        o.geometry?.dispose();
        for (const m of [].concat(o.material || [])) m.dispose();
      });
      disc.dispose();
    }
  };
}
