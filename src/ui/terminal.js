import { CONTENT } from '../content.js';

export function initTerminal() {
  const root = document.getElementById('term');
  const out = document.getElementById('term-out');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-in');
  const openBtn = document.getElementById('btn-term');
  const closeBtn = document.getElementById('term-close');
  const history = [];
  let hIdx = 0;
  let lastFocus = null;
  let greeted = false;

  const print = (text, cls) => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  };
  const printAll = (lines) => lines.forEach((l) => print(l));

  const commands = {
    help: () => printAll(CONTENT.terminal.help),
    whoami: () => printAll(CONTENT.whoami.lines),
    stack: () => print(CONTENT.stack.items.join('  ')),
    contact: () => {
      print('Email:  ' + CONTENT.email);
      print('GitHub: ' + CONTENT.github);
    },
    neofetch: () => printAll(CONTENT.terminal.neofetch),
    'sudo hire me': () => printAll(CONTENT.terminal.hire),
    clear: () => { out.textContent = ''; },
    exit: () => close()
  };

  function run(raw) {
    const cmd = raw.trim().replace(/\s+/g, ' ').toLowerCase();
    print('$ ' + raw, 'cmd');
    if (!cmd) return;
    history.push(raw);
    hIdx = history.length;
    if (commands[cmd]) commands[cmd]();
    else print('command not found: ' + cmd + '. Type "help".', 'err');
  }

  function open() {
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    if (!greeted) { print(CONTENT.terminal.welcome); greeted = true; }
    input.focus();
  }
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const toggle = () => (root.hidden ? open() : close());

  openBtn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIdx > 0) input.value = history[--hIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx = Math.min(hIdx + 1, history.length);
      input.value = history[hIdx] || '';
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const t = e.target;
      if (t instanceof HTMLElement && t !== input && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
      e.preventDefault();
      toggle();
    }
  });
  // Escape and backtick must work while typing in the terminal too.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === '`') { e.preventDefault(); close(); }
  });

  return { open, close };
}
