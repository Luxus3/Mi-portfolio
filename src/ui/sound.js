// Procedural fan hum: filtered noise + low drone. OFF by default; starts only on user click.
export function initSound() {
  const btn = document.getElementById('btn-sound');
  let ctx = null;
  let master = null;
  let on = false;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    noise.connect(bp).connect(ng).connect(master);
    noise.start();

    [[55, 0.18], [110.7, 0.08]].forEach(([f, g]) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(lp).connect(og).connect(master);
      o.start();
    });
    return true;
  }

  async function set(next) {
    if (next && !ctx && !build()) return;
    on = next;
    if (on) await ctx.resume();
    master.gain.setTargetAtTime(on ? 0.22 : 0, ctx.currentTime, 0.2);
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'SOUND: ON' : 'SOUND: OFF';
  }

  btn.addEventListener('click', () => set(!on));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (on) ctx.resume();
  });
}
