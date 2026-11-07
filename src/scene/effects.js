import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

// Unlit material with HDR-ish color so the bloom pass picks it up.
export function glowMat(hex, gain = 3, extra = {}) {
  const m = new THREE.MeshBasicMaterial({ toneMapped: false, ...extra });
  m.color.set(hex).multiplyScalar(gain);
  return m;
}

// Additive soft light sprite material (fake light spill).
export function spillMat(hex, opacity = 0.3) {
  return new THREE.MeshBasicMaterial({
    map: glowTexture(),
    color: hex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
}

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.45, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(w, h) {
      const pr = renderer.getPixelRatio();
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      bloom.setSize((w * pr) / 2, (h * pr) / 2); // reduced-resolution bloom
    },
    dispose: () => composer.dispose()
  };
}
