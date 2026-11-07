import { CONTENT } from '../content.js';
import { measure } from './net.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = (n) => String(n).padStart(2, '0');

/* ---------- Visitor machine info (all read from the browser) ---------- */
function parseOS() {
  const ua = navigator.userAgent;
  let m;
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows/.test(ua)) return 'Windows';
  if ((m = ua.match(/Android ([\d.]+)/))) return 'Android ' + m[1];
  if (/iPhone|iPad|iPod/.test(ua)) { m = ua.match(/OS (\d+)/); return 'iOS' + (m ? ' ' + m[1] : ''); }
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return navigator.platform || 'Unknown';
}

function parseBrowser() {
  const ua = navigator.userAgent;
  const rules = [
    [/Edg\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/Firefox\/(\d+)/, 'Firefox'],
    [/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'], [/Version\/(\d+).*Safari/, 'Safari']
  ];
  for (const [re, name] of rules) {
    const m = ua.match(re);
    if (m) return name + ' ' + m[1];
  }
  return 'Unknown browser';
}

let gpuCache = null;
function getGPU() {
  if (gpuCache) return gpuCache;
  gpuCache = 'unknown';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      if (r) gpuCache = String(r);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch { /* keep unknown */ }
  return gpuCache;
}

function machineInfo() {
  const dpr = window.devicePixelRatio || 1;
  let tz = 'unknown';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch { /* ignore */ }
  const conn = navigator.connection;
  return [
    'OS: ' + parseOS(),
    'Browser: ' + parseBrowser(),
    'CPU: ' + (navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' cores' : 'unknown'),
    'RAM: ' + (navigator.deviceMemory ? '~' + navigator.deviceMemory + ' GB' : 'hidden by browser'),
    'GPU: ' + getGPU(),
    'Screen: ' + screen.width + 'x' + screen.height + ' @' + dpr + 'x',
    'Lang: ' + (navigator.language || 'unknown'),
    'Zone: ' + tz,
    'Net: ' + (conn?.effectiveType || 'unknown')
  ];
}

/* ---------- Virtual filesystem ---------- */
const HOME = '/home/guest';
const DIRS = {
  '/': { dirs: ['home', 'root'], files: [] },
  '/home': { dirs: ['guest'], files: [] },
  [HOME]: { dirs: [], files: ['about.txt', 'stack.txt', 'contact.txt', 'services.txt', 'experience.txt', '.secret'] },
  '/root': { dirs: [], files: ['flag.txt'] }
};

function readFile(name) {
  switch (name) {
    case 'about.txt': return CONTENT.whoami.lines;
    case 'stack.txt': return [CONTENT.stack.items.join(', ')];
    case 'contact.txt': return ['Email:  ' + CONTENT.email, 'GitHub: ' + CONTENT.github];
    case 'services.txt': return CONTENT.services.items.map((s) => '- ' + s.title + ': ' + s.text);
    case 'experience.txt': return CONTENT.experience.items.map((e) => '- ' + e.name + ' [' + e.status + ']: ' + e.text);
    case '.secret': return CONTENT.terminal.secret;
    case 'flag.txt': return CONTENT.terminal.flag;
    default: return [];
  }
}

function cowsay(text) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 28 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  lines.push(cur);
  const w = Math.max(...lines.map((l) => l.length));
  return [
    ' ' + '_'.repeat(w + 2),
    ...lines.map((l) => '| ' + l.padEnd(w) + ' |'),
    ' ' + '-'.repeat(w + 2),
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||'
  ];
}

export function initTerminal({ getWorld } = {}) {
  const root = document.getElementById('term');
  const out = document.getElementById('term-out');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-in');
  const label = form.querySelector('label');
  const titleName = root.querySelector('.term-title span');
  const openBtn = document.getElementById('btn-term');
  const closeBtn = document.getElementById('term-close');
  const history = [];
  let hIdx = 0;
  let lastFocus = null;
  let greeted = false;
  let cwd = HOME;
  let isRoot = false;
  let busy = false;
  let aborted = false;
  let stopLive = null;

  const print = (text, cls) => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
    return d;
  };
  const printAll = (lines) => lines.forEach((l) => print(l));
  const where = () => (cwd === HOME ? '~' : cwd);
  const prompt = () => (isRoot ? 'root' : 'guest') + '@lucio.local:' + where() + (isRoot ? '#' : '$');
  const updatePrompt = () => { label.textContent = prompt(); };

  function absPath(p) {
    let s = p || '~';
    if (s === '~' || s.startsWith('~/')) s = HOME + s.slice(1);
    else if (!s.startsWith('/')) s = cwd + '/' + s;
    const parts = [];
    for (const seg of s.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop(); else parts.push(seg);
    }
    return '/' + parts.join('/');
  }
  const isLocked = (abs) => (abs === '/root' || abs.startsWith('/root/')) && !isRoot;
  const splitPath = (abs) => {
    const i = abs.lastIndexOf('/');
    return [abs.slice(0, i) || '/', abs.slice(i + 1)];
  };
  const listDir = (abs, all) => [
    ...DIRS[abs].dirs.map((d) => d + '/'),
    ...DIRS[abs].files.filter((f) => all || !f.startsWith('.'))
  ];

  function runLive(setup, ms) {
    return new Promise((resolve) => {
      let done = false;
      let teardown = () => {};
      const stop = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        stopLive = null;
        teardown();
        resolve();
      };
      const timer = setTimeout(stop, ms);
      stopLive = stop;
      teardown = setup();
    });
  }

  /* ---------- Commands ---------- */
  function neofetch() {
    const left = CONTENT.terminal.neofetch;
    const right = ['YOUR MACHINE', '-------------', ...machineInfo()];
    const cols = Math.floor((out.clientWidth - 24) / 8.2);
    if (cols >= 76) {
      const w = 36;
      const rw = cols - w - 2;
      const n = Math.max(left.length, right.length);
      for (let i = 0; i < n; i++) {
        const r = right[i] || '';
        print((left[i] || '').padEnd(w) + '  ' + (r.length > rw ? r.slice(0, rw - 1) + '…' : r));
      }
    } else {
      printAll(left);
      print('');
      printAll(right);
    }
    print('');
    print('You are now rack-42 on my space station.');
  }

  async function ping(args) {
    const host = args.find((a) => !a.startsWith('-'));
    if (!host) { print('usage: ping lucio.local', 'err'); return; }
    if (host.toLowerCase() !== 'lucio.local') { print('ping: ' + host + ': Name or service not known', 'err'); return; }
    print('PING lucio.local (' + location.host + ') real HEAD requests:');
    const times = [];
    for (let i = 1; i <= 4 && !aborted; i++) {
      const ms = await measure(3000);
      if (ms == null) print('request timeout for seq=' + i, 'err');
      else { times.push(ms); print('reply from lucio.local: seq=' + i + ' time=' + ms.toFixed(1) + ' ms'); }
      if (i < 4 && !aborted) await sleep(500);
    }
    print('--- lucio.local ping statistics ---');
    print('4 sent, ' + times.length + ' received, ' + Math.round((1 - times.length / 4) * 100) + '% loss');
    if (times.length) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      print('min/avg/max = ' + Math.min(...times).toFixed(1) + '/' + avg.toFixed(1) + '/' + Math.max(...times).toFixed(1) + ' ms');
    }
  }

  function top() {
    const el = print('');
    const names = ['nginx', 'dockerd', 'sshd', 'postgres', 'containerd', 'node', 'python3', 'cron', 'fail2ban', 'prometheus'];
    const procs = names.map((name, i) => ({ name, pid: 120 + i * 53 + Math.floor(Math.random() * 30), cpu: Math.random() * 12, mem: 1 + Math.random() * 9 }));
    let cpu = 25;
    let mem = 40;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = () => { frames++; raf = requestAnimationFrame(loop); };
    const bar = (v) => '[' + '|'.repeat(Math.round(v / 5)).padEnd(20, ' ') + '] ' + Math.round(v) + '%';
    const tick = () => {
      const now = performance.now();
      const fps = Math.round((frames * 1000) / Math.max(1, now - last));
      frames = 0;
      last = now;
      cpu = clamp(cpu + (Math.random() - 0.5) * 30, 5, 95);
      mem = clamp(mem + (Math.random() - 0.5) * 6, 20, 80);
      procs.forEach((p) => { p.cpu = clamp(p.cpu + (Math.random() - 0.5) * 14, 0, 60); });
      const d = new Date();
      const heap = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'n/a';
      const rows = [...procs].sort((a, b) => b.cpu - a.cpu).slice(0, 7)
        .map((p) => String(p.pid).padStart(5) + '  ' + p.name.padEnd(11) + String(p.cpu.toFixed(1)).padStart(5) + String(p.mem.toFixed(1)).padStart(6));
      el.textContent = [
        'top - ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '  up: always',
        'YOUR browser: ' + fps + ' FPS | JS heap: ' + heap,
        'CPU ' + bar(cpu),
        'MEM ' + bar(mem),
        '',
        '  PID  NAME         %CPU  %MEM',
        ...rows,
        '',
        '(press any key to quit)'
      ].join('\n');
      out.scrollTop = out.scrollHeight;
    };
    return runLive(() => {
      loop();
      tick();
      const id = setInterval(tick, 700);
      return () => { cancelAnimationFrame(raf); clearInterval(id); print('top: stopped'); };
    }, 6000);
  }

  function docker(args) {
    if (args[0] !== 'ps') { print('usage: docker ps', 'err'); return; }
    printAll([
      'CONTAINER  IMAGE            STATUS      NAMES',
      'a1b2c3d4   nginx:alpine     Up 3 days   nginx',
      'e5f6a7b8   postgres:16      Up 3 days   postgres',
      'c9d0e1f2   ci-runner:latest Up 2 days   ci-runner',
      '3a4b5c6d   monitor:latest   Up 3 days   monitor',
      '7e8f9a0b   fortune:latest   Up 1 hour   coffee-api',
      '(decorative. but I can build the real thing.)'
    ]);
  }

  function matrix() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      print('matrix: disabled because you prefer reduced motion. Respect.');
      return Promise.resolve();
    }
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:70;pointer-events:none;';
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const size = 16;
    const drops = Array.from({ length: Math.ceil(cv.width / size) }, () => Math.random() * -30);
    const chars = 'アイウエオカキクケコ0123456789ABCDEF<>/{}';
    print('Wake up, guest...');
    return runLive(() => {
      ctx.font = size + 'px monospace';
      const id = setInterval(() => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#39ff14';
        drops.forEach((y, i) => {
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size);
          drops[i] = y * size > cv.height && Math.random() > 0.96 ? 0 : y + 1;
        });
      }, 50);
      return () => { clearInterval(id); cv.remove(); };
    }, 4000);
  }

  async function rmRoot() {
    const lines = ['/bin/bash', '/etc/passwd', '/var/log', '/usr/lib/libc.so.6', '/boot/vmlinuz', '/home', '/dev/null', '/lib/systemd'];
    for (const l of lines) {
      print('rm: removing ' + l, 'err');
      await sleep(110 + Math.random() * 120);
    }
    print('Kernel panic - not syncing: Attempted to kill init!', 'err');
    await sleep(600);
    print('Just kidding. Everything is fine. Rebooting...');
  }

  async function orbit() {
    printAll([
      'ORBITAL STATUS',
      '--------------',
      'Altitude:  408 km',
      'Speed:     7.66 km/s',
      'Moon:      visible',
      'Sun:       yes',
      'Latency to Earth: 3ms (real ping below)',
      ''
    ]);
    await ping(['lucio.local']);
  }

  const sudoersMsg = () => print('guest is not in the sudoers file. This incident will be reported.', 'err');

  function rm(args) {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const target = args.filter((a) => !a.startsWith('-'));
    if (/r/.test(flags) && /f/.test(flags) && (target[0] === '/' || target[0] === '/*')) return rmRoot();
    if (!target.length) print('rm: missing operand', 'err');
    else print('rm: cannot remove \'' + target[0] + '\': Permission denied', 'err');
    return undefined;
  }

  function cd(args) {
    const abs = absPath(args[0]);
    if (!DIRS[abs]) {
      const [parent, name] = splitPath(abs);
      print('cd: ' + args[0] + ': ' + (DIRS[parent]?.files.includes(name) ? 'Not a directory' : 'No such file or directory'), 'err');
    } else if (isLocked(abs)) {
      print('cd: ' + args[0] + ': Permission denied', 'err');
    } else {
      cwd = abs;
      updatePrompt();
    }
  }

  function ls(args) {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const all = flags.includes('a');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (!targets.length) targets.push(cwd);
    targets.forEach((t) => {
      const abs = absPath(t);
      if (targets.length > 1) print(t + ':');
      if (DIRS[abs]) {
        if (isLocked(abs)) { print('ls: cannot open directory \'' + t + '\': Permission denied', 'err'); return; }
        print((all ? ['.', '..'] : []).concat(listDir(abs, all)).join('  ') || '(empty)');
      } else {
        const [parent, name] = splitPath(abs);
        if (DIRS[parent]?.files.includes(name) && !isLocked(abs)) print(name);
        else print('ls: cannot access \'' + t + '\': No such file or directory', 'err');
      }
    });
  }

  function cat(args) {
    if (!args.length) { print('cat: missing file. Try: cat about.txt', 'err'); return; }
    args.forEach((a) => {
      const abs = absPath(a);
      if (DIRS[abs]) { print('cat: ' + a + ': Is a directory', 'err'); return; }
      const [parent, name] = splitPath(abs);
      if (!DIRS[parent]?.files.includes(name)) print('cat: ' + a + ': No such file or directory', 'err');
      else if (isLocked(abs)) print('cat: ' + a + ': Permission denied', 'err');
      else printAll(readFile(name));
    });
  }

  const commands = {
    help: () => printAll(CONTENT.terminal.help),
    whoami: () => printAll(CONTENT.whoami.lines),
    stack: () => print(CONTENT.stack.items.join('  ')),
    contact: () => {
      print('Email:  ' + CONTENT.email);
      print('GitHub: ' + CONTENT.github);
    },
    pwd: () => print(cwd),
    ls,
    cd,
    cat,
    neofetch,
    ping,
    top,
    htop: top,
    docker,
    orbit,
    rm: (args) => (isRoot ? rm(args) : print('rm: cannot remove: Permission denied. Try sudo. (Or don\'t.)', 'err')),
    matrix,
    fortune: () => {
      const f = CONTENT.terminal.fortunes;
      print(f[Math.floor(Math.random() * f.length)]);
    },
    cowsay: (args) => (args.length ? printAll(cowsay(args.join(' '))) : print('cowsay: the cow needs something to say.', 'err')),
    sudo: (args) => {
      const a = args.map((x) => x.toLowerCase());
      const sub = a.join(' ');
      if (!a.length) {
        if (isRoot) print('You are already root.'); else sudoersMsg();
      } else if (sub === 'hire me') printAll(CONTENT.terminal.hire);
      else if (a[0] === 'rm') return rm(args.slice(1));
      else if (isRoot) return dispatch(args.join(' '));
      else sudoersMsg();
      return undefined;
    },
    clear: () => { out.textContent = ''; },
    exit: () => close()
  };

  async function dispatch(raw) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return;
    const name = parts[0].toLowerCase();
    if (!Object.hasOwn(commands, name)) {
      print(name + ': command not found. Type "help".', 'err');
      return;
    }
    await commands[name](parts.slice(1));
  }

  async function run(raw) {
    print(prompt() + ' ' + raw, 'cmd');
    if (!raw.trim()) return;
    if (busy) { print('Busy. Press Ctrl+C to stop.', 'err'); return; }
    history.push(raw);
    hIdx = history.length;
    busy = true;
    aborted = false;
    try {
      await dispatch(raw);
    } catch (err) {
      print('error: ' + (err?.message || 'unknown'), 'err');
    } finally {
      busy = false;
    }
  }

  /* ---------- Tab completion ---------- */
  function complete() {
    const v = input.value;
    const last = v.split(/\s+/).pop();
    const isFirst = !/\s/.test(v.trimStart());
    let options;
    let head = '';
    if (isFirst) {
      options = Object.keys(commands);
    } else {
      const i = last.lastIndexOf('/');
      head = i >= 0 ? last.slice(0, i + 1) : '';
      const abs = absPath(head || '.');
      options = DIRS[abs] && !isLocked(abs) ? listDir(abs, true) : [];
      options = options.filter((o) => !o.startsWith('.') || last.slice(head.length).startsWith('.'));
    }
    const base = last.slice(head.length);
    const matches = options.filter((o) => o.startsWith(base));
    if (!matches.length) return;
    let common = matches[0];
    for (const m of matches) while (!m.startsWith(common)) common = common.slice(0, -1);
    if (matches.length > 1) print(matches.join('  '));
    const suffix = matches.length === 1 && !common.endsWith('/') ? ' ' : '';
    input.value = v.slice(0, v.length - last.length) + head + common + suffix;
  }

  /* ---------- Open / close ---------- */
  function open() {
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    root.hidden = false;
    if (!greeted) { print(CONTENT.terminal.welcome); print(CONTENT.terminal.hint); greeted = true; }
    input.focus();
  }
  function close() {
    if (root.hidden) return;
    aborted = true;
    stopLive?.();
    root.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const toggle = () => (root.hidden ? open() : close());

  function setRoot() {
    if (isRoot) return;
    isRoot = true;
    root.classList.add('rootmode');
    if (titleName) titleName.textContent = 'root@lucio.local';
    updatePrompt();
    print('ROOT ACCESS GRANTED. A new file appeared in /root. Try: cat /root/flag.txt', 'err');
  }

  updatePrompt();
  openBtn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  out.addEventListener('pointerdown', () => stopLive?.());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (stopLive) return;
    const v = input.value;
    input.value = '';
    run(v);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === '`') { e.preventDefault(); close(); return; }
    if (stopLive) {
      e.preventDefault();
      stopLive();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      aborted = true;
      if (busy) print('^C');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp') {
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

  return { open, close, setRoot, echo: (text, cls) => print(text, cls) };
}
