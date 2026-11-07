(() => {
  'use strict';

  /* ===== CONFIG: change name and links here ===== */
  const CONFIG = {
    NAME: 'LUCIO',
    EMAIL: 'dearolucio@gmail.com',
    GITHUB: 'https://github.com/Luxus3',
    SINCE: '2024-03-01T00:00:00Z',       // uptime counter start
    LOCATION: 'CÓRDOBA, AR'
  };

  /* ===== Helpers ===== */
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = arr => arr[rnd(0, arr.length - 1)];
  const LNAME = CONFIG.NAME.toLowerCase();

  /* Tracks whether an element is on screen (used to pause loops) */
  function watch(el, cb) {
    const s = { on: false };
    new IntersectionObserver(([e]) => { s.on = e.isIntersecting; if (cb) cb(s.on); }).observe(el);
    return s;
  }

  /* ===== Apply config to the page ===== */
  $$('[data-name]').forEach(el => {
    el.textContent = CONFIG.NAME;
    if (el.hasAttribute('data-text')) el.setAttribute('data-text', CONFIG.NAME);
  });
  $$('[data-lname]').forEach(el => { el.textContent = LNAME; });
  document.title = CONFIG.NAME + ' // Computer Engineering student. Servers & infrastructure.';
  $('#year').textContent = new Date().getFullYear();
  $$('[data-link]').forEach(a => { a.href = CONFIG[a.dataset.link.toUpperCase()] || '#'; });
  $('#mailLink').href = 'mailto:' + CONFIG.EMAIL;
  $('#mailLink').textContent = CONFIG.EMAIL;
  $('#prompt').textContent = 'guest@' + LNAME + ':~$';

  /* ===== Uptime counter ===== */
  const since = new Date(CONFIG.SINCE).getTime();
  function uptimeStr() {
    let s = Math.max(0, Math.floor((Date.now() - since) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60);
    return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s % 60)}s`;
  }
  function tickUptime() {
    const t = uptimeStr();
    $$('[data-uptime]').forEach(el => { el.textContent = t; });
  }
  tickUptime();
  setInterval(tickUptime, 1000);

  /* ===== Toast ===== */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ===== 1. Boot sequence ===== */
  const BOOT_LINES = [
    [`${CONFIG.NAME}-BIOS v2.4.1  (c) hand-built`, '', 'hi'],
    ['CPU0: 8 cores @ 3.60GHz', 'OK'],
    ['Memory test: 32768MB', 'OK'],
    ['Checking DMI pool data...', 'OK'],
    ['Detecting drives... sda sdb nvme0', 'OK'],
    ['Detecting NICs... eth0 1000Mbps', 'UP'],
    ['Initializing RAID array', 'OK'],
    ['Fans: 6/6 spinning', 'OK'],
    ['Temperature: 41C', 'OK'],
    ['Loading kernel...', ''],
    ['Mounting root filesystem', 'OK'],
    [`Mounting /dev/${LNAME}`, 'OK'],
    ['Starting systemd...', ''],
    ['Starting services: nginx docker ssh', '✔'],
    ['Firewall rules loaded', 'OK'],
    ['Checking coffee supply', 'WARN'],
    ['Syncing clock...', 'OK'],
    ['Opening session...', ''],
    [`Welcome, visitor. This is ${CONFIG.NAME}'s machine.`, '', 'hi']
  ];

  function runBoot() {
    return new Promise(resolve => {
      const boot = $('#boot'), log = $('#bootLog');
      log.textContent = '';
      root.classList.add('booting');
      let i = 0, timer = 0, done = false;

      const addLine = ([text, status, cls]) => {
        const row = document.createElement('div');
        if (cls) row.className = cls;
        row.append(text);
        if (status) {
          const st = document.createElement('span');
          st.className = status === 'WARN' ? 'warn' : 'ok';
          st.textContent = ' [ ' + status + ' ]';
          row.append(st);
        }
        log.append(row);
        while (log.children.length > 40) log.firstChild.remove();
      };
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        removeEventListener('keydown', finish);
        boot.removeEventListener('pointerdown', finish);
        root.classList.remove('booting');
        root.classList.add('poweron');
        setTimeout(() => root.classList.remove('poweron'), 900);
        resolve();
      };
      // types a shell command char by char, then calls cb
      const typeCmd = (text, cb) => {
        const row = document.createElement('div');
        row.className = 'hi';
        log.append(row);
        let n = 0;
        const t = () => {
          if (done) return;
          if (n <= text.length) { row.textContent = '$ ' + text.slice(0, n++) + '█'; timer = setTimeout(t, 35 + Math.random() * 45); }
          else { row.textContent = '$ ' + text; timer = setTimeout(cb, 300); }
        };
        t();
      };
      // progress bar line that fills up, then finishes the boot
      const loadBar = () => {
        const row = document.createElement('div');
        row.className = 'ok';
        log.append(row);
        let p = 0;
        const t = () => {
          if (done) return;
          p = Math.min(100, p + 3 + Math.random() * 9);
          const f = Math.round(p / 5);
          row.textContent = 'Loading portfolio [' + '#'.repeat(f) + '.'.repeat(20 - f) + '] ' + Math.floor(p) + '%';
          timer = setTimeout(p >= 100 ? finish : t, p >= 100 ? 450 : 60 + Math.random() * 60);
        };
        t();
      };
      const step = () => {
        if (i >= BOOT_LINES.length) { loadBar(); return; }
        addLine(BOOT_LINES[i++]);
        timer = setTimeout(step, 60 + Math.random() * 90);
      };
      addEventListener('keydown', finish);
      boot.addEventListener('pointerdown', finish);
      typeCmd('ssh guest@' + LNAME + '.local', step);
    });
  }

  let ready = root.classList.contains('booting') ? runBoot() : Promise.resolve();
  let bootGen = 0;

  $('#reboot').addEventListener('click', () => {
    scrollTo(0, 0);
    if (RM) return;
    bootGen++;
    ready = runBoot();
  });

  /* ===== Noise overlay (small canvas, low fps) ===== */
  (function initNoise() {
    const cv = $('#noise'), ctx = cv.getContext('2d');
    cv.width = cv.height = 128;
    const img = ctx.createImageData(128, 128);
    function paint() {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    paint();
    if (RM) return;
    setInterval(() => { if (!document.hidden) paint(); }, 110);
  })();

  /* ===== Custom cursor ===== */
  (function initCursor() {
    if (!FINE) return;
    const xh = $('#xhair'), dot = $('#dot'), glow = $('#glow');
    let mx = 0, my = 0, dx = 0, dy = 0, gx = 0, gy = 0, raf = 0;
    const k1 = RM ? 1 : 0.22, k2 = RM ? 1 : 0.08;

    function loop() {
      dx += (mx - dx) * k1; dy += (my - dy) * k1;
      gx += (mx - gx) * k2; gy += (my - gy) * k2;
      xh.style.transform = `translate(${mx}px,${my}px)`;
      dot.style.transform = `translate(${dx}px,${dy}px)`;
      glow.style.transform = `translate(${gx}px,${gy}px)`;
      const moving = Math.abs(mx - dx) + Math.abs(my - dy) + Math.abs(mx - gx) + Math.abs(my - gy) > 0.5;
      raf = moving ? requestAnimationFrame(loop) : 0;
    }
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!root.classList.contains('has-cursor')) { root.classList.add('has-cursor'); dx = gx = mx; dy = gy = my; }
      root.classList.remove('has-out');
      root.classList.toggle('has-hot', !!e.target.closest('a, button, input, label'));
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.add('has-out'));
  })();

  /* ===== Text scramble / decode on headings ===== */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
  function scramble(el) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    el.setAttribute('aria-label', final);
    const id = (el._sid = (el._sid || 0) + 1);
    const n = final.length, t0 = performance.now(), dur = 500 + n * 30;
    el.classList.add('scrambling');
    (function tick(now) {
      if (el._sid !== id) return;
      const p = Math.min(1, (now - t0) / dur), reveal = Math.floor(p * n);
      let out = '';
      for (let i = 0; i < n; i++) out += (i < reveal || final[i] === ' ') ? final[i] : GLYPHS[rnd(0, GLYPHS.length - 1)];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else { el.textContent = final; el.classList.remove('scrambling'); }
    })(t0);
  }
  if (!RM) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting || e.target._gen === bootGen) return;
        e.target._gen = bootGen;
        ready.then(() => scramble(e.target));
      });
    }, { threshold: 0.6 });
    $$('[data-scramble]').forEach(el => io.observe(el));
  }

  /* ===== 2. Hero rack canvas ===== */
  (function initRackCanvas() {
    const cv = $('#rackCanvas'), ctx = cv.getContext('2d');
    const N = 10;
    const units = Array.from({ length: N }, () => ({
      bays: Array.from({ length: 6 }, () => rnd(0, 2)),   // 0 off, 1 green, 2 amber
      status: [1, 1, rnd(0, 1) ? 2 : 1],
      alertUntil: 0
    }));
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, nextAlert = performance.now() + 3500, alertUnit = null;
    const vis = watch(cv, on => { if (on) start(); else stop(); });

    function resize() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.max(1, Math.round(r.width * dpr));
      H = cv.height = Math.max(1, Math.round(r.height * dpr));
      draw(performance.now());
    }
    function update(t) {
      for (let k = 0; k < 4; k++) {
        const u = pick(units);
        if (Math.random() < 0.7) u.bays[rnd(0, 5)] = rnd(0, 2);
        else u.status[rnd(0, 2)] = rnd(0, 2) ? 1 : 2;
      }
      if (alertUnit && t > alertUnit.alertUntil) {
        alertUnit.alertUntil = 0; alertUnit = null; nextAlert = t + rnd(4500, 9000);
      } else if (!alertUnit && t > nextAlert) {
        alertUnit = pick(units); alertUnit.alertUntil = t + 2400;
      }
    }
    const col = s => (s === 1 ? '#39ff14' : s === 2 ? '#ffb000' : '#1a1a1a');

    function draw(t) {
      const s = dpr, pd = 8 * s, gap = 5 * s;
      const uh = (H - pd * 2 - gap * (N - 1)) / N, w = W - pd * 2;
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${Math.max(9 * s, uh * 0.34)}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      units.forEach((u, i) => {
        const y = pd + i * (uh + gap), x = pd, al = u.alertUntil > 0;
        const pulse = (Math.sin(t / 110) + 1) / 2;
        ctx.fillStyle = al ? `rgba(255,42,31,${0.15 + 0.3 * pulse})` : '#0e0e0e';
        ctx.fillRect(x, y, w, uh);
        ctx.lineWidth = s;
        ctx.strokeStyle = al ? '#ff2a1f' : '#333';
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, uh - 1);
        ctx.fillStyle = '#1d1d1d';                       // rack ears
        ctx.fillRect(x + 1, y + 1, 9 * s, uh - 2);
        ctx.fillRect(x + w - 9 * s - 1, y + 1, 9 * s, uh - 2);
        ctx.fillStyle = '#666';                          // screws
        [0.3, 0.7].forEach(f => {
          ctx.fillRect(x + 4 * s, y + uh * f - s, 2 * s, 2 * s);
          ctx.fillRect(x + w - 6 * s, y + uh * f - s, 2 * s, 2 * s);
        });
        ctx.fillStyle = al ? '#ff2a1f' : '#6a6a6a';      // label
        ctx.fillText(al ? 'ALERT' : 'NODE-' + pad(i + 1), x + 16 * s, y + uh / 2);
        const bw = Math.min(14 * s, w * 0.05), bx = x + w * 0.46;   // drive bays
        u.bays.forEach((b, j) => {
          const px = bx + j * (bw + 3 * s);
          ctx.fillStyle = '#050505'; ctx.fillRect(px, y + uh * 0.25, bw, uh * 0.5);
          ctx.fillStyle = col(al ? 0 : b); ctx.fillRect(px + bw - 4 * s, y + uh * 0.3, 2.5 * s, 2.5 * s);
        });
        u.status.forEach((st, j) => {                    // status LEDs
          ctx.fillStyle = al ? (pulse > 0.5 ? '#ff2a1f' : '#400') : col(st);
          ctx.beginPath();
          ctx.arc(x + w - 20 * s - j * 9 * s, y + uh / 2, 2.2 * s, 0, 6.283);
          ctx.fill();
        });
      });
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - last < 70) return;
      last = t; update(t); draw(t);
    }
    function start() { if (!raf && !RM && vis.on && !document.hidden) raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new ResizeObserver(resize).observe(cv);
    resize();
  })();

  /* ===== 3. Rack units: pull out / accordion ===== */
  (function initUnits() {
    const units = $$('.unit');
    const setOpen = (u, open) => {
      u.classList.toggle('open', open);
      $('.unit-face', u).setAttribute('aria-expanded', String(open));
    };
    units.forEach(u => $('.unit-face', u).addEventListener('click', () => setOpen(u, !u.classList.contains('open'))));

    // Desktop: units pull out by themselves when they reach the middle of the screen
    if (!RM && matchMedia('(min-width: 900px)').matches) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { setOpen(e.target, true); io.unobserve(e.target); } });
      }, { rootMargin: '-42% 0px -42% 0px' });
      units.forEach(u => io.observe(u));
    }
  })();

  /* ===== Fake htop bars ===== */
  (function initHtop() {
    const box = $('#htop');
    const rows = ['CPU', 'MEM', 'LINUX', 'DOCKER', 'NGINX', 'NETWORK', 'BASH', 'GIT'].map(name => {
      const row = document.createElement('div'), l = document.createElement('span'), b = document.createElement('span');
      row.className = 'bar'; l.className = 'bl'; b.className = 'bb';
      l.textContent = name;
      row.append(l, b); box.append(row);
      return { b, v: rnd(3, 7) };
    });
    const vis = watch(box);
    function render() {
      rows.forEach(r => {
        r.b.textContent = '▮'.repeat(r.v) + '▯'.repeat(8 - r.v);
        r.b.className = 'bb' + (r.v >= 8 ? ' h' : r.v >= 6 ? ' m' : '');
      });
    }
    render();
    if (RM) return;
    setInterval(() => {
      if (!vis.on || document.hidden) return;
      rows.forEach(r => { r.v = Math.max(1, Math.min(8, r.v + rnd(-2, 2))); });
      render();
    }, 800);
  })();

  /* ===== Copy email ===== */
  $('#copyMail').addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(CONFIG.EMAIL);
      ok = true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = CONFIG.EMAIL; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.append(ta); ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch (e2) { /* ignore */ }
    }
    toast(ok ? 'copied to clipboard' : 'copy failed: select the email above');
  });

  /* ===== 4. Terminal ===== */
  (function initTerminal() {
    const box = $('#termBox'), out = $('#termOut'), inp = $('#termIn'), tgl = $('#termToggle');
    const COMMANDS = ['help', 'whoami', 'ls', 'cat about', 'stack', 'experience', 'contact', 'uptime', 'neofetch', 'sudo hire me', 'clear', 'exit'];
    const FILES = ['about.txt', 'stack.txt', 'experience.txt', 'contact.txt'];
    const hist = []; let hi = 0, greeted = false;
    const prompt = () => $('#prompt').textContent;

    // Everything goes through textContent: user text is never parsed as HTML
    function print(text, cls) {
      const d = document.createElement('div');
      d.className = 'tl' + (cls ? ' ' + cls : '');
      d.textContent = text;
      out.append(d);
      out.scrollTop = out.scrollHeight;
    }
    const printLines = (lines, cls) => lines.forEach(l => print(l, cls));

    const ABOUT = ['2nd-year Computer Engineering @ UCC.', 'English B1, improving every day.', 'Obsessed with servers, hardware assembly and infrastructure.'];
    const STACK = 'Linux, Docker, Nginx, Networking, SQL, Git, Bash, CI/CD, Cloud, Monitoring, Hardware assembly';
    const EXPERIENCE = ['Bettermin (now): mining tech startup mixing AI and biotechnology.', 'Freelance: I build and deploy projects for clients, from setup to going live.'];
    const linkTxt = u => (u === '#' ? '(link coming soon)' : u);

    function neofetch() {
      const logo = [
        ' ╔══════════════╗ ',
        ' ║ ▮▮▮▮▮▮  ● ○ ║ ',
        ' ╠══════════════╣ ',
        ' ║ ▮▮▮▮▮▮  ● ● ║ ',
        ' ╠══════════════╣ ',
        ' ║ ▮▮▮▮▮▮  ○ ● ║ ',
        ' ╠══════════════╣ ',
        ' ║ ▮▮▮▮▮▮  ● ● ║ ',
        ' ╚══════════════╝ '
      ];
      const info = [
        `guest@${LNAME}`,
        '-------------',
        `OS: ${CONFIG.NAME} OS (hand-built)`,
        `Host: ${CONFIG.LOCATION}`,
        'Kernel: student-6.x',
        `Uptime: ${uptimeStr()}`,
        'Shell: bash',
        'CPU: caffeine-powered (8 threads)',
        'Memory: 2nd year / infinite curiosity'
      ];
      printLines(logo.map((l, i) => l + (info[i] || '')));
    }

    const cmds = {
      help: () => printLines(['Commands:', '  help  whoami  ls  cat <file>  stack  experience', '  contact  uptime  neofetch  sudo hire me  clear  exit', 'Tip: Tab completes, arrows show history, ` toggles this window.']),
      whoami: () => print(ABOUT[0] + ' Servers, racks, infrastructure.'),
      ls: () => print(FILES.join('  ')),
      stack: () => print(STACK),
      experience: () => printLines(EXPERIENCE),
      contact: () => printLines([`email:    ${CONFIG.EMAIL}`, `github:   ${linkTxt(CONFIG.GITHUB)}`]),
      uptime: () => print('up ' + uptimeStr()),
      neofetch,
      clear: () => { out.textContent = ''; },
      exit: () => setOpen(false),
      cat: args => {
        const f = (args[0] || '').replace(/\.txt$/, '');
        if (!f) return print('usage: cat <file>', 'warn');
        if (f === 'about') return printLines(ABOUT);
        if (f === 'stack') return print(STACK);
        if (f === 'experience') return printLines(EXPERIENCE);
        if (f === 'contact') return cmds.contact();
        print(`cat: ${args[0].slice(0, 40)}: No such file`, 'err');
      }
    };

    function run(raw) {
      print(prompt() + ' ' + raw, 'cmd');
      const line = raw.trim().replace(/\s+/g, ' ').toLowerCase();
      if (!line) return;
      hist.push(line); hi = hist.length;
      if (line === 'sudo hire me') {
        printLines(['[sudo] password for guest: ********', 'Access granted. Great decision.', 'Opening your mail client...']);
        setTimeout(() => { location.href = 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent("Let's work together"); }, 900);
        return;
      }
      const [cmd, ...args] = line.split(' ');
      if (cmd === 'sudo') return print('sudo: you are not in the sudoers file. This incident will be reported.', 'err');
      if (Object.prototype.hasOwnProperty.call(cmds, cmd)) return cmds[cmd](args);
      print(`bash: ${cmd.slice(0, 40)}: command not found`, 'err');
    }

    function complete() {
      const v = inp.value.toLowerCase().replace(/^\s+/, '');
      if (!v) return;
      const m = COMMANDS.filter(c => c.startsWith(v));
      if (m.length === 1) { inp.value = m[0]; return; }
      if (m.length > 1) {
        let p = m[0];
        m.forEach(c => { while (!c.startsWith(p)) p = p.slice(0, -1); });
        inp.value = p;
        print(m.join('  '), 'dim');
      }
    }

    function setOpen(open) {
      box.hidden = !open;
      tgl.setAttribute('aria-expanded', String(open));
      if (open) {
        if (!greeted) { greeted = true; printLines([`Connected to ${LNAME}@portfolio.`, 'Type "help" to start.'], 'dim'); }
        inp.focus();
      } else if (document.activeElement === inp) tgl.focus();
    }

    tgl.addEventListener('click', () => setOpen(box.hidden));
    document.addEventListener('keydown', e => {
      if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setOpen(box.hidden); }
      else if (e.key === 'Escape' && !box.hidden) setOpen(false);
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { run(inp.value); inp.value = ''; }
      else if (e.key === 'Tab') { e.preventDefault(); complete(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); inp.value = hi < hist.length - 1 ? hist[++hi] : ((hi = hist.length), ''); }
    });
    box.addEventListener('click', e => { if (!window.getSelection().toString() && e.target !== tgl) inp.focus(); });
  })();

  /* ===== 5. Log ticker ===== */
  (function initTicker() {
    const ip = () => `10.0.${rnd(0, 255)}.${rnd(2, 254)}`;
    const logs = [
      ['ok', 'nginx reloaded'],
      ['info', `new visitor connected from ${ip()}`],
      ['warn', 'coffee level low'],
      ['ok', 'docker: all containers healthy'],
      ['info', 'ssh: key accepted'],
      ['ok', 'backup finished, no drama'],
      ['warn', 'fan 3 is being dramatic'],
      ['info', `new visitor connected from ${ip()}`],
      ['ok', 'certificates renewed'],
      ['info', 'cron: ran 1 job, nobody noticed'],
      ['warn', 'disk usage 71%, still fine'],
      ['ok', 'firewall: 0 intruders today'],
      ['info', `new visitor connected from ${ip()}`],
      ['ok', 'uptime is looking good'],
      ['warn', 'someone said "it works on my machine"']
    ];
    const track = $('#tickerTrack');
    const build = () => {
      const g = document.createElement('span');
      logs.forEach(([lvl, msg]) => {
        const item = document.createElement('span'), tag = document.createElement('span');
        item.className = 'item'; tag.className = 'lg ' + lvl;
        tag.textContent = '[' + lvl.toUpperCase() + ']';
        item.append(tag, msg);
        g.append(item);
      });
      return g;
    };
    track.append(build(), build());  // two copies = seamless loop
  })();
})();
