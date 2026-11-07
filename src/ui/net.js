// Real latency to our own origin. Returns ms (float) or null on failure.
export async function measure(timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = performance.now();
  try {
    await fetch(location.origin + '/?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
    return performance.now() - start;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
