import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useScene } from "../hooks/useScene";

type Props = {
  text: string;
  font?: "serif" | "sans";
  /** Largest font size in CSS px; the text shrinks to fit narrower containers. */
  maxSize?: number;
  align?: "left" | "center";
  /** Hold the assembly animation until this turns true (the hero waits for the loader). */
  start?: boolean;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  size: number;
  alpha: number;
  warm: boolean;
  phase: number;
  delay: number;
};

const PALETTE = {
  sky: { ink: "#e8eef8", tint: "#6ef0c6" },
  water: { ink: "#6b4a2b", tint: "#b83a12" },
} as const;
const RADIUS = 70;

const fontFor = (font: "serif" | "sans", size: number) =>
  font === "serif" ? `italic 400 ${size}px "Instrument Serif"` : `600 ${size}px "Geist Variable"`;

/**
 * Decorative text drawn as thousands of particles on a 2D canvas. They drift in
 * from scattered dust when the title first scrolls into view, shimmer, and
 * scatter away from the pointer. Always pair it with a real heading for
 * screen readers; this element is aria-hidden.
 */
export function ParticleTitle({ text, font = "serif", maxSize = 180, align = "left", start = true, className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;
  const scene = useScene();

  useEffect(() => {
    const { ink, tint } = PALETTE[scene];
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let inView = false;
    let startedAt = -1;
    let assembled = false;
    let disposed = false;
    let lastWidth = -1;
    let resizeTimer = 0;
    const pointer = { x: -1e4, y: -1e4 };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!start) return;
      const elapsed = startedAt < 0 ? 0 : (now - startedAt) / 1000;
      let moving = false;
      for (const warmPass of [false, true]) {
        ctx.fillStyle = warmPass ? tint : ink;
        for (const p of particles) {
          if (p.warm !== warmPass) continue;
          const live = reduce || assembled || elapsed > p.delay;
          if (live && !reduce) {
            p.vx += (p.tx - p.x) * 0.06;
            p.vy += (p.ty - p.y) * 0.06;
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < RADIUS * RADIUS) {
              const d = Math.sqrt(d2) || 1;
              const force = (1 - d / RADIUS) * 3.2;
              p.vx += (dx / d) * force;
              p.vy += (dy / d) * force;
            }
            p.vx *= 0.8;
            p.vy *= 0.8;
            p.x += p.vx;
            p.y += p.vy;
            if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05) moving = true;
          }
          const twinkle = reduce ? 1 : 0.7 + 0.3 * Math.sin(now * 0.0021 + p.phase);
          ctx.globalAlpha = p.alpha * twinkle * (live ? 1 : 0.2);
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
      if (!assembled && startedAt >= 0 && elapsed > 1.6 && !moving) assembled = true;
    };

    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        if (!inView || disposed) return;
        if (startedAt < 0) startedAt = now;
        draw(now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const build = async () => {
      try {
        await document.fonts.load(fontFor(font, 100));
      } catch {
        // The fallback face still renders.
      }
      if (disposed) return;
      width = wrap.clientWidth;
      if (width === 0) return;
      lastWidth = width;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = fontFor(font, 100);
      const probe = ctx.measureText(text);
      const probeInk = probe.actualBoundingBoxLeft + probe.actualBoundingBoxRight;
      const size = Math.max(24, Math.min(maxSize, (width / Math.max(probeInk, 1)) * 100 * 0.97));
      ctx.font = fontFor(font, size);
      const m = ctx.measureText(text);
      const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const padY = size * 0.16;
      height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + padY * 2);

      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      canvas.style.height = `${height}px`;

      const off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext("2d", { willReadFrequently: true });
      if (!o) return;
      o.scale(dpr, dpr);
      o.font = fontFor(font, size);
      o.fillStyle = "#fff";
      const x0 = (align === "center" ? (width - ink) / 2 : 1) + m.actualBoundingBoxLeft;
      o.fillText(text, x0, padY + m.actualBoundingBoxAscent);
      const { data } = o.getImageData(0, 0, off.width, off.height);

      const step = Math.max(2, Math.round((size / 48) * dpr));
      const settled = reduce || assembled;
      const next: Particle[] = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (data[(y * off.width + x) * 4 + 3] < 128) continue;
          const tx = x / dpr + (Math.random() - 0.5) * (step / dpr) * 0.6;
          const ty = y / dpr + (Math.random() - 0.5) * (step / dpr) * 0.6;
          next.push({
            tx,
            ty,
            x: settled ? tx : tx + (Math.random() - 0.5) * width * 0.9,
            y: settled ? ty : ty + (Math.random() - 0.5) * height * 4,
            vx: 0,
            vy: 0,
            size: (step / dpr) * (0.5 + Math.random() * 0.45),
            alpha: 0.55 + Math.random() * 0.45,
            warm: Math.random() < 0.13,
            phase: Math.random() * Math.PI * 2,
            delay: Math.random() * 0.45 + (tx / width) * 0.6,
          });
        }
      }
      particles = next;
      draw(performance.now());
      if (!reduce && inView && start) loop();
    };

    const onPointer = (event: PointerEvent) => {
      if (!inView) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
    };

    const visibility = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !reduce && start) loop();
        else cancelAnimationFrame(raf);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    visibility.observe(canvas);

    const resize = new ResizeObserver(() => {
      if (wrap.clientWidth === lastWidth) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => void build(), lastWidth < 0 ? 0 : 140);
    });
    resize.observe(wrap);

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      visibility.disconnect();
      resize.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [text, font, maxSize, align, start, reduce, scene]);

  return (
    <div ref={wrapRef} aria-hidden className={className}>
      <canvas ref={canvasRef} className="block h-0 w-full" />
    </div>
  );
}
