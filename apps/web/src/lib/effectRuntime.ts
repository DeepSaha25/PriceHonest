import type { WebGLRenderer } from 'three';

export function effectBudget() {
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const compact = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const constrained = compact || (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4) || (device.deviceMemory !== undefined && device.deviceMemory <= 4) || device.connection?.saveData === true;
  return {
    fps: constrained ? 24 : 30,
    pixels: constrained ? 420_000 : 1_000_000,
    pixelRatio: constrained ? 0.85 : 1.25,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

export function resizeEffect(renderer: WebGLRenderer, element: HTMLElement, budget: ReturnType<typeof effectBudget>, scale = 1) {
  const width = Math.max(1, element.clientWidth);
  const height = Math.max(1, element.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, budget.pixelRatio, Math.sqrt(budget.pixels * scale / (width * height)));
  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  return { width: renderer.domElement.width, height: renderer.domElement.height };
}

/** One bounded clock per effect. Hidden/off-screen effects have no recurring RAF. */
export function startEffectRuntime(element: HTMLElement, options: {
  frame: (elapsed: number, delta: number) => void;
  resize: (scale: number) => void;
  fps?: number;
  canvas?: HTMLCanvasElement;
}) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fps = options.fps ?? effectBudget().fps;
  let visible = false;
  let lost = false;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let scale = 1;
  let slowFrames = 0;
  let first = true;
  let dirty = true;

  const active = () => visible && !document.hidden && !lost && !disposed;
  const frame = (now: number) => {
    raf = 0;
    if (!active()) return;
    const delta = last ? now - last : 1000 / fps;
    if (delta >= 1000 / fps - 1) {
      if (dirty) { options.resize(scale); dirty = false; }
      last = now;
      elapsed += motion.matches ? 0 : Math.min(delta, 100) / 1000;
      const started = performance.now();
      options.frame(elapsed, delta / 1000);
      // Reduce pixel work if the renderer itself persistently blocks the main thread.
      const behind = delta > 1000 / fps * 1.8 || performance.now() - started > 1000 / fps * 0.65;
      slowFrames = behind ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames >= 8 && scale > 0.35) { scale = Math.max(0.35, scale * 0.75); dirty = true; slowFrames = 0; }
      first = false;
    }
    if (!motion.matches) raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    element.dataset.effectState = !active() ? 'paused' : motion.matches ? 'still' : 'animated';
    if (active() && (!motion.matches || first || dirty)) raf = requestAnimationFrame(frame);
  };
  const resize = () => { dirty = true; sync(); };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 });
  const sizeObserver = new ResizeObserver(resize);
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; sync(); };
  const contextRestored = () => { lost = false; dirty = true; first = true; sync(); };
  observer.observe(element);
  sizeObserver.observe(element);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', resize);
  options.canvas?.addEventListener('webglcontextlost', contextLost);
  options.canvas?.addEventListener('webglcontextrestored', contextRestored);
  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
    sizeObserver.disconnect();
    document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', resize);
    options.canvas?.removeEventListener('webglcontextlost', contextLost);
    options.canvas?.removeEventListener('webglcontextrestored', contextRestored);
  };
}
