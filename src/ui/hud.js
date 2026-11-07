import { CONTENT } from '../content.js';

const SECTIONS = [
  { name: 'hero', end: 0.14, label: 'DOOR 00 — ENTRANCE' },
  { name: 'whoami', end: 0.34, label: 'RACK 01/05 — WHOAMI' },
  { name: 'experience', end: 0.52, label: 'RACK 02/05 — EXPERIENCE' },
  { name: 'stack', end: 0.70, label: 'RACK 03/05 — STACK' },
  { name: 'services', end: 0.87, label: 'RACK 04/05 — SERVICES' },
  { name: 'contact', end: 1.01, label: 'RACK 05/05 — CONTACT' }
];

export function sectionAt(p) {
  return SECTIONS.find((s) => p < s.end) || SECTIONS[SECTIONS.length - 1];
}

export function initHud() {
  const hud = document.getElementById('hud');
  const text = document.getElementById('hud-text');
  const fill = document.getElementById('hud-fill');
  const flash = document.getElementById('flash');
  const tk = document.getElementById('tk-text');
  let current = '';
  let alertTimer = 0;

  function update(p) {
    const s = sectionAt(p);
    fill.style.width = (p * 100).toFixed(1) + '%';
    if (s.name !== current) {
      current = s.name;
      text.textContent = s.label;
    }
    return s.name;
  }

  function setLog(msg, isAlert) {
    const t = new Date().toTimeString().slice(0, 8);
    tk.textContent = `${t}  ${msg}`;
    tk.classList.toggle('alert', !!isAlert);
  }

  function alertFx(msg) {
    hud.classList.remove('alert');
    flash.classList.remove('on');
    void hud.offsetWidth;
    hud.classList.add('alert');
    flash.classList.add('on');
    setLog('ALERT: ' + (msg || 'unknown event'), true);
    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => {
      hud.classList.remove('alert');
      tk.classList.remove('alert');
    }, 3000);
  }

  // Rotating fake logs.
  let i = Math.floor(Math.random() * CONTENT.logs.length);
  setLog(CONTENT.logs[i]);
  setInterval(() => {
    if (document.hidden || tk.classList.contains('alert')) return;
    i = (i + 1) % CONTENT.logs.length;
    setLog(CONTENT.logs[i]);
  }, 2600);

  return { update, alertFx };
}
