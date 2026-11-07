import { LAYOUT as L } from './palette.js';

const DURATION = 8;
const REBOOT_FROM = 4;
const ONLINE_FROM = 6.5;
const WAVE_LEN = Math.abs(L.zEnd) + 2;

// [fase, start (s), texto]
const TIMELINES = {
  blackout: [
    ['blackout', 0, 'POWER LOST'],
    ['ups', 2, 'UPS ON BATTERY'],
    ['reboot', REBOOT_FROM, 'GENERATOR ONLINE'],
    ['online', ONLINE_FROM, 'ALL SYSTEMS NOMINAL']
  ],
  panic: [
    ['panic', 0, 'KERNEL PANIC — not syncing'],
    ['reboot', REBOOT_FROM, 'SYSTEM REBOOT'],
    ['online', ONLINE_FROM, 'ALL SYSTEMS NOMINAL']
  ]
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hash = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

// Drives a timed outage/panic by mutating the cheap global factors of hall, racks and screens.
export function createChaos({ hall, racks, screens, emit }) {
  let cur = null;
  const api = {
    shake: 0, // 0..1, read by the camera
    get running() {
      return !!cur;
    },
    run(kind, t) {
      if (cur) return cur.promise;
      const phases = TIMELINES[kind] || TIMELINES.blackout;
      cur = { phases, i: 0, t0: t, fase: '' };
      cur.promise = new Promise((r) => (cur.resolve = r));
      return cur.promise;
    },
    update(t) {
      if (!cur) return;
      const el = t - cur.t0;
      while (cur.i < cur.phases.length && el >= cur.phases[cur.i][1]) enter(cur.phases[cur.i++]);
      if (el >= DURATION) return finish();
      apply(cur.fase, el, t);
    }
  };

  const hc = hall.chaos;
  const rc = racks.chaos;

  function enter([fase, , text]) {
    cur.fase = fase;
    emit(fase, text);
    if (fase === 'ups') {
      screens.setMode('off');
      screens.setMode('nosignal', ['whoami', 'stack', 'contact']);
    } else if (fase === 'reboot') screens.setMode('booting');
    else if (fase === 'online') screens.setMode('normal');
    else if (fase === 'panic') screens.setMode('panic');
  }

  function lights(power, emerg) {
    hc.power = power;
    hc.emerg = emerg;
    rc.bars = power;
  }

  function apply(fase, el, t) {
    if (fase === 'blackout') {
      lights(0, el > 0.25 ? 1 : 0);
      rc.power = 0;
      // screens die with a flicker
      screens.setMode(el < 0.45 && Math.floor(el * 22) % 2 === 0 ? 'normal' : 'off');
    } else if (fase === 'ups') {
      const r = hash(Math.floor(t * 14));
      lights(r > 0.55 ? 0.1 + 0.3 * r : 0, 0.35);
    } else if (fase === 'reboot') {
      const u = clamp01((el - REBOOT_FROM) / (ONLINE_FROM - REBOOT_FROM));
      lights(u * (0.75 + 0.25 * hash(Math.floor(t * 20))), (1 - u) * 0.3);
      rc.panic = false;
      rc.wave = true;
      rc.front = -u * WAVE_LEN;
      api.shake = 0;
    } else if (fase === 'online') {
      const k = clamp01((el - ONLINE_FROM) / (DURATION - ONLINE_FROM));
      const pulse = (1 - k) * (1 - k);
      lights(1 + 1.2 * pulse, 0);
      rc.wave = false;
      rc.power = 1;
      rc.boost = 1.5 * pulse;
    } else if (fase === 'panic') {
      const r = hash(Math.floor(t * 12));
      lights(r > 0.2 ? 1 : 0.3, 0);
      rc.panic = true;
      api.shake = 0.7 + 0.3 * hash(Math.floor(t * 30));
    }
  }

  function finish() {
    lights(1, 0);
    rc.power = 1;
    rc.bars = 1;
    rc.panic = false;
    rc.wave = false;
    rc.boost = 0;
    api.shake = 0;
    screens.setMode('normal');
    const { resolve } = cur;
    cur = null;
    resolve();
  }

  return api;
}
