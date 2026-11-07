import { CONTENT } from '../content.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Typed console boot. Resolves when finished or skipped (Enter / click / tap).
export function runBoot() {
  const el = document.getElementById('boot');
  const out = document.getElementById('boot-out');
  el.hidden = false;
  el.classList.remove('off');
  out.textContent = '';
  let skipped = false;
  let finish;
  const done = new Promise((r) => { finish = r; });

  const skip = () => { skipped = true; };
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } };
  el.addEventListener('click', skip);
  window.addEventListener('keydown', onKey);

  const bar = (n) => '[' + '#'.repeat(n) + '.'.repeat(20 - n) + '] ' + String(n * 5).padStart(3) + '%';

  (async () => {
    const lines = CONTENT.boot;
    let text = '';
    for (let i = 0; i < lines.length && !skipped; i++) {
      const line = lines[i];
      // Progress bar right before the last line.
      if (i === lines.length - 1) {
        for (let n = 0; n <= 20 && !skipped; n++) {
          out.textContent = text + bar(n);
          await wait(35);
        }
        text += bar(20) + '\n';
      }
      const typed = i === 0;
      for (let c = 1; c <= line.length && !skipped; c++) {
        out.textContent = text + line.slice(0, c) + '_';
        await wait(typed ? 45 : 8);
      }
      text += line + '\n';
      out.textContent = text;
      if (!skipped) await wait(i === 0 ? 350 : 160);
    }
    if (skipped) out.textContent = lines.join('\n');
    await wait(skipped ? 120 : 500);
    el.removeEventListener('click', skip);
    window.removeEventListener('keydown', onKey);
    el.classList.add('off');
    await wait(500);
    el.hidden = true;
    finish();
  })();

  return done;
}
