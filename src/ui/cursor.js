export function initCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const dot = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  let x = -100, y = -100, rx = x, ry = y, raf = 0;

  const tick = () => {
    rx += (x - rx) * 0.2;
    ry += (y - ry) * 0.2;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(tick) : 0;
  };

  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px,${y}px)`;
    if (!raf) raf = requestAnimationFrame(tick);
    const hot = e.target instanceof Element && e.target.closest('a, button, input, [role="button"]');
    ring.classList.toggle('hot', !!hot);
  }, { passive: true });
  document.documentElement.classList.add('has-cursor');
}
