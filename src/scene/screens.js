import * as THREE from 'three';
import { CONTENT } from '../content.js';
import { CSS, FONT, LAYOUT } from './palette.js';

export const SCREEN_W = 1024;
export const SCREEN_H = 720;
const W = SCREEN_W;
const H = SCREEN_H;
const PAD = 40;

const font = (size, weight = '500') => `${weight} ${size}px ${FONT}`;

function wrap(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function fit(ctx, text, maxW, size, weight) {
  ctx.font = font(size, weight);
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = font(size, weight);
  }
}

function frame(ctx, tag) {
  ctx.fillStyle = '#04070d';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = CSS.accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = font(32, '800');
  const tw = ctx.measureText(tag).width;
  ctx.fillStyle = CSS.accent;
  ctx.fillRect(PAD, 24, tw + 36, 50);
  ctx.fillStyle = '#050505';
  ctx.fillText(tag, PAD + 18, 61);
  ctx.font = font(22);
  ctx.fillStyle = CSS.dim;
  ctx.textAlign = 'right';
  ctx.fillText('guest@lucio.local', W - PAD, 58);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(47,140,255,0.5)';
  ctx.fillRect(PAD, 92, W - PAD * 2, 2);
}

function scanlines(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
}

function drawWhoami(ctx) {
  const c = CONTENT.whoami;
  frame(ctx, c.tag);
  ctx.font = font(30);
  ctx.fillStyle = CSS.amber;
  ctx.fillText('$ whoami', PAD, 152);
  let y = 214;
  ctx.font = font(34);
  ctx.fillStyle = CSS.green;
  for (const line of c.lines) {
    for (const part of wrap(ctx, line, W - PAD * 2)) {
      ctx.fillText(part, PAD, y);
      y += 46;
    }
    y += 16;
  }
}

function drawExperience(ctx) {
  const c = CONTENT.experience;
  frame(ctx, c.tag);
  let y = 170;
  c.items.forEach((it, i) => {
    ctx.font = font(30, '700');
    ctx.fillStyle = CSS.dim;
    ctx.textAlign = 'left';
    ctx.fillText(`[${String(i + 1).padStart(2, '0')}]`, PAD, y);
    ctx.font = font(52, '800');
    ctx.fillStyle = CSS.amber;
    ctx.fillText(it.name, PAD + 110, y + 4);
    const col = it.status === 'NOW' ? CSS.green : CSS.amber;
    ctx.font = font(26, '700');
    const sw = ctx.measureText(it.status).width + 32;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.strokeRect(W - PAD - sw, y - 36, sw, 46);
    ctx.fillStyle = col;
    ctx.fillText(it.status, W - PAD - sw + 16, y - 3);
    ctx.font = font(32);
    ctx.fillStyle = CSS.text;
    y += 56;
    for (const part of wrap(ctx, it.text, W - PAD * 2 - 110)) {
      ctx.fillText(part, PAD + 110, y);
      y += 44;
    }
    y += 70;
  });
}

function drawStack(ctx, t) {
  const c = CONTENT.stack;
  frame(ctx, c.tag);
  const colW = 296;
  const gap = 20;
  c.items.forEach((name, i) => {
    const x = PAD + (i % 3) * (colW + gap);
    const y = 116 + Math.floor(i / 3) * 58;
    ctx.fillStyle = '#101010';
    ctx.fillRect(x, y, colW, 46);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, colW, 46);
    const on = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7);
    ctx.globalAlpha = on;
    ctx.fillStyle = i % 5 === 3 ? CSS.amber : CSS.green;
    ctx.beginPath();
    ctx.arc(x + 24, y + 23, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    fit(ctx, name, colW - 56, 25, '600');
    ctx.fillStyle = CSS.text;
    ctx.fillText(name, x + 44, y + 32);
  });
  // decorative htop-style bars
  const labels = ['CPU1', 'CPU2', 'CPU3', 'CPU4', 'MEM ', 'SWP '];
  const barX = PAD + 100;
  const barW = W - PAD * 2 - 100 - 90;
  labels.forEach((lb, k) => {
    const y = 420 + k * 44;
    const v = k === 5 ? 0.08 + 0.04 * Math.sin(t) : 0.5 + 0.42 * Math.sin(t * (0.6 + k * 0.23) + k * 2.1);
    ctx.font = font(24, '700');
    ctx.fillStyle = CSS.amber;
    ctx.fillText(lb, PAD, y + 22);
    ctx.fillStyle = '#121212';
    ctx.fillRect(barX, y, barW, 28);
    ctx.fillStyle = v > 0.85 ? CSS.cyan : v > 0.65 ? CSS.amber : CSS.green;
    const n = Math.floor((barW * v) / 10);
    for (let b = 0; b < n; b++) ctx.fillRect(barX + b * 10, y + 2, 7, 24);
    ctx.fillStyle = CSS.text;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(v * 100)}%`, W - PAD, y + 22);
    ctx.textAlign = 'left';
  });
}

function drawServices(ctx) {
  const c = CONTENT.services;
  frame(ctx, c.tag);
  let y = 160;
  c.items.forEach((it, i) => {
    ctx.font = font(60, '800');
    ctx.fillStyle = CSS.accent;
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD, y + 22);
    ctx.font = font(33, '700');
    ctx.fillStyle = CSS.amber;
    const lines = wrap(ctx, it.title, W - PAD * 2 - 110);
    let ty = y;
    for (const part of lines) {
      ctx.fillText(part, PAD + 110, ty);
      ty += 42;
    }
    ctx.font = font(29);
    ctx.fillStyle = CSS.green;
    ctx.fillText(it.text, PAD + 110, ty + 4);
    y += 188;
  });
}

function drawContact(ctx, t) {
  frame(ctx, CONTENT.contact.tag);
  ctx.textAlign = 'center';
  ctx.font = font(120, '800');
  ctx.fillStyle = CSS.accent;
  ctx.fillText('CONTACT', W / 2, 300);
  ctx.font = font(44, '600');
  const prompt = '$ ssh guest@lucio.local';
  const pw = ctx.measureText(prompt).width;
  const x0 = (W - pw - 30) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = CSS.green;
  ctx.fillText(prompt, x0, 460);
  if (Math.floor(t * 2) % 2 === 0) ctx.fillRect(x0 + pw + 12, 424, 22, 46);
}

function makeScreen(draw, aniso, z = null) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  const s = {
    tex,
    z,
    last: -1,
    paint(t = 0) {
      ctx.save();
      draw(ctx, t);
      ctx.restore();
      scanlines(ctx);
      tex.needsUpdate = true;
      s.last = t;
    }
  };
  s.paint();
  return s;
}

export function createScreens(aniso = 4) {
  const zOf = (name) => LAYOUT.sections.find((s) => s.name === name).z;
  const screens = {
    whoami: makeScreen(drawWhoami, aniso),
    experience: makeScreen(drawExperience, aniso),
    stack: makeScreen(drawStack, aniso, zOf('stack')),
    services: makeScreen(drawServices, aniso),
    contact: makeScreen(drawContact, aniso, -70)
  };
  const all = Object.values(screens);
  return {
    textures: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, v.tex])),
    repaintAll: () => all.forEach((s) => s.paint(s.last > 0 ? s.last : 0)),
    // Animated screens repaint at ~8fps and only when the camera is near.
    animate(t, camZ) {
      for (const s of all) {
        if (s.z !== null && Math.abs(camZ - s.z) < 30 && t - s.last > 0.12) s.paint(t);
      }
    }
  };
}
