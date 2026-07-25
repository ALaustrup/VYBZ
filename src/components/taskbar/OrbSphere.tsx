import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { usePlayer } from "@/lib/audioBus";
import { useChromaBoost, useFxScale, useReduceFx } from "@/lib/display";
import { createOrbEngine, morphIdFromFx } from "@/lib/gpu/orbEngine";
import { resolvePlaybackVisuals } from "@/lib/playbackCustomization";
import { sampleReactiveFrame, type ReactiveVisualFrame } from "@/lib/reactiveVisualRuntime";
import { getWidgetPrefs } from "@/lib/vdock/widgetPrefs";
import { cx } from "@/lib/utils";
import type { PostFx } from "@/types";

interface OrbSphereProps {
  open: boolean;
  flash: boolean;
  /** Force idle default sphere (joystick hover / aim). */
  calm?: boolean;
  /** Normalized stick throw in screen space (−THROW..THROW from joystick). */
  stick?: { x: number; y: number };
  onClick?: () => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  className?: string;
}

/** Compact hit target — spill canvas may be larger but is not clickable. */
const HIT = 72;
/** Drawing surface — headroom so Max morphs / aura never clip the canvas edge. */
const DRAW = 200;
const CORE_R = HIT * 0.34;
/** Hard silhouette cap (leaves ~30% canvas margin for soft aura). */
const MAX_R = DRAW * 0.28;

/** Idle neochrome plasma stops (cyan → mint → violet → magenta → electric). */
const NEO = ["#00ffc8", "#5b8cff", "#c77dff", "#ff5d8f", "#00a1ff", "#34f5a0", "#ffe566"];

/**
 * Canvas Orb — idle neochrome sphere; while playing, uploader morph + palette
 * driven by `sampleReactiveFrame` (bands / onset / beat / spectrum).
 */
export function OrbSphere({
  open,
  flash,
  calm = false,
  stick = { x: 0, y: 0 },
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ariaLabel,
  className,
}: OrbSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const { playing, track } = usePlayer();
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const chroma = useChromaBoost();
  const visuals = useMemo(
    () => resolvePlaybackVisuals({
      seed: track?.seed,
      accent: track?.accent,
      fx: track?.fx,
      playback: track?.playback,
    }),
    [track?.seed, track?.accent, track?.fx, track?.playback],
  );
  const { accent, seed, palette: pal, pulseScale, rimIntensity, specularFollow, fx } = visuals;
  const palKey = pal.join(",");
  const live = playing && !!track && !calm;

  const frame = useRef({
    playing: playing && !!track,
    live,
    open,
    flash,
    calm,
    stickX: stick.x,
    stickY: stick.y,
    reduce,
    fxScale,
    chroma,
    pulseScale,
    rimIntensity,
    specularFollow,
    fx,
    palKey,
    accent,
    seed,
    monitorCue: false,
  });
  frame.current = {
    playing: playing && !!track,
    live,
    open,
    flash,
    calm,
    stickX: stick.x,
    stickY: stick.y,
    reduce,
    fxScale,
    chroma,
    pulseScale,
    rimIntensity,
    specularFollow,
    fx,
    palKey,
    accent,
    seed,
    monitorCue: getWidgetPrefs().monitorCue,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    // ── WebGL2 elite path (falls through to Canvas2D) ─────────────────────
    const gpu = createOrbEngine(canvas);
    if (gpu) {
      const dpr0 = Math.min(2, window.devicePixelRatio || 1);
      gpu.resize(DRAW, dpr0);
      let raf = 0;
      let t = 0;
      let flashA = 0;
      let liveBlend = frame.current.live ? 1 : 0;
      let hidden = document.hidden;
      const onVis = () => { hidden = document.hidden; };
      const mid = DRAW / 2;
      const ptr = { x: mid, y: mid, tx: mid, ty: mid, inside: false };
      const onMove = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        ptr.inside = Math.hypot(dx, dy) < r.width * 0.55;
      };
      window.addEventListener("pointermove", onMove);
      document.addEventListener("visibilitychange", onVis);

      const drawGpu = () => {
        if (!hidden) {
          const f = frame.current;
          t += 0.016;
          const targetBlend = f.calm || f.monitorCue ? 0 : f.live ? 1 : 0;
          const blendRate = f.calm || f.monitorCue ? 0.22 : f.live ? 0.1 : 0.038;
          liveBlend += (targetBlend - liveBlend) * blendRate;
          if (f.flash) flashA = 1;
          else flashA *= 0.88;
          const analysing = !f.reduce && f.fxScale > 0.02 && f.playing && !f.monitorCue;
          const rv = sampleReactiveFrame(analysing);
          const uploadColors = f.palKey.split(",").map((c) => vividHex(c, f.chroma));
          const neo = neoChromeAt(t);
          const colors = blendPalettes(neo, uploadColors, liveBlend);
          const morphW = smoothstep(liveBlend, 0.12, 0.72);
          const morph = morphW < 0.08 ? 0 : morphIdFromFx(f.fx);
          gpu.draw({
            time: t,
            liveBlend,
            calm: f.calm || f.monitorCue,
            stickX: f.stickX,
            stickY: f.stickY,
            fxScale: f.reduce ? 0 : f.fxScale,
            flash: Math.max(flashA, rv.onset * 0.4 * liveBlend),
            morph,
            palette: colors,
            rv,
          });
          void ptr;
        }
        raf = requestAnimationFrame(drawGpu);
      };
      raf = requestAnimationFrame(drawGpu);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("visibilitychange", onVis);
        gpu.destroy();
      };
    }

    // ── Canvas2D fallback ─────────────────────────────────────────────────
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(DRAW * dpr);
      canvas.height = Math.floor(DRAW * dpr);
      canvas.style.width = `${DRAW}px`;
      canvas.style.height = `${DRAW}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const mid = DRAW / 2;
    const ptr = {
      x: mid - HIT * 0.12,
      y: mid - HIT * 0.18,
      tx: mid - HIT * 0.12,
      ty: mid - HIT * 0.18,
      inside: false,
    };
    const onMove = (e: PointerEvent) => {
      const f = frame.current;
      const r = wrap.getBoundingClientRect();
      const hx = e.clientX - r.left;
      const hy = e.clientY - r.top;
      const dx = hx - r.width / 2;
      const dy = hy - r.height / 2;
      const hit = Math.hypot(dx, dy) < r.width * 0.55;
      ptr.inside = hit;
      if (hit && f.specularFollow && f.live) {
        ptr.tx = mid + dx * 0.55;
        ptr.ty = mid + dy * 0.55;
      } else {
        ptr.tx = mid - HIT * 0.12;
        ptr.ty = mid - HIT * 0.18;
      }
    };
    const onLeave = () => {
      ptr.inside = false;
      ptr.tx = mid - HIT * 0.12;
      ptr.ty = mid - HIT * 0.18;
    };
    window.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let t = 0;
    let flashA = 0;
    /** 0 = idle plasma sphere, 1 = uploader live form */
    let liveBlend = frame.current.live ? 1 : 0;
    let hidden = document.hidden;
    const onVis = () => { hidden = document.hidden; };

    const draw = () => {
      if (hidden) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const f = frame.current;
      t += 0.016;

      const targetBlend = f.calm || f.monitorCue ? 0 : f.live ? 1 : 0;
      const blendRate = f.calm || f.monitorCue ? 0.22 : f.live ? 0.1 : 0.038;
      liveBlend += (targetBlend - liveBlend) * blendRate;
      if (Math.abs(liveBlend - targetBlend) < 0.002) liveBlend = targetBlend;

      const stickPx = HIT * 0.55;
      const stickCx = mid + f.stickX * stickPx;
      const stickCy = mid + f.stickY * stickPx;

      ptr.x += (ptr.tx - ptr.x) * 0.14;
      ptr.y += (ptr.ty - ptr.y) * 0.14;
      if (f.flash) flashA = 1;
      else flashA *= 0.88;

      // Keep analysing while a track plays (even if calm) so joystick ring can share beat.
      const analysing = !f.reduce && f.fxScale > 0.02 && f.playing && !f.monitorCue;
      const rv = sampleReactiveFrame(analysing);
      const reactive = analysing && !f.calm && f.live;
      // Soft ducks amplitude further; Max lets onset/beat punch through
      const ampCap = Math.min(1.35, f.fxScale);
      const softGate = ampCap < 0.8 ? 0.72 : 1;

      const drive = reactive
        ? (rv.bass * 0.42 + rv.sub * 0.35 + rv.level * 0.38 + rv.beat * 0.55 + rv.onset * 0.35) *
          ampCap *
          softGate *
          (0.45 + f.pulseScale * 1.25)
        : 0;
      const pulse = Math.min(1.05, drive) * liveBlend;
      const R = Math.min(CORE_R + pulse * (5 + ampCap * 4) + rv.beat * 2.2 * liveBlend, MAX_R);

      // Sub squash — kick “weight” without leaving canvas
      const squashY = 1 - rv.sub * 0.07 * liveBlend * ampCap;
      const squashX = 1 + rv.sub * 0.05 * liveBlend * ampCap;

      const uploadColors = f.palKey.split(",").map((c) => vividHex(c, f.chroma));
      const neo = neoChromeAt(t);
      const colors = blendPalettes(neo, uploadColors, liveBlend);
      const uploadMorph = morphMode(f.fx);
      const morphW = smoothstep(liveBlend, 0.12, 0.72);
      const morph: Morph = morphW < 0.08 ? "sphere" : uploadMorph;

      // Specular drifts toward spectral brightness while live
      if (reactive && liveBlend > 0.4) {
        ptr.tx += (mid + (rv.centroid - 0.45) * R * 0.9 - ptr.tx) * 0.04;
        ptr.ty += (mid - R * 0.22 - rv.high * R * 0.15 - ptr.ty) * 0.04;
      }

      ctx.clearRect(0, 0, DRAW, DRAW);

      ctx.save();
      ctx.translate(stickCx, stickCy);
      ctx.scale(squashX, squashY);
      const cx = 0;
      const cy = 0;

      // Soft aura
      const auraR = Math.min(R * (1.32 + pulse * 0.18 + rv.beat * 0.12), DRAW * 0.44);
      if (!f.reduce && (ptr.inside || f.open || liveBlend > 0.02 || liveBlend < 0.98)) {
        const rim = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, auraR);
        const idleA = (0.14 + 0.08 * Math.sin(t * 0.55)) * (1 - liveBlend);
        const liveA =
          liveBlend *
          (0.07 + pulse * 0.22 + rv.beat * 0.14) *
          (0.4 + f.rimIntensity * 1.15) *
          Math.min(1, Math.max(0.35, ampCap));
        const rimA = idleA + liveA;
        rim.addColorStop(0, hexA(colors[0], rimA));
        rim.addColorStop(0.55, hexA(colors[1], rimA * 0.42));
        rim.addColorStop(1, hexA(colors[2], 0));
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spectrum corona — outside silhouette so playback is obviously tracked
      if (reactive && liveBlend > 0.25 && ampCap > 0.25) {
        drawSpectrumCorona(ctx, cx, cy, R, rv, colors, ampCap * liveBlend, f.fxScale);
      }

      // Beat shock ring
      if (reactive && rv.beat > 0.18 && liveBlend > 0.4) {
        ctx.strokeStyle = hexA(colors[0], (0.12 + rv.beat * 0.35) * liveBlend);
        ctx.lineWidth = 1.2 + rv.beat * 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(R * (1.15 + rv.beat * 0.35), MAX_R * 1.35), 0, Math.PI * 2);
        ctx.stroke();
      }

      const morphPulse = pulse * morphW;
      const morphScale = ampCap * morphW;

      ctx.save();
      pathMorph(ctx, morph, cx, cy, R, t, rv, morphPulse, morphScale, morphW);
      ctx.clip();

      const body = ctx.createRadialGradient(
        ptr.x - stickCx,
        ptr.y - stickCy,
        R * 0.05,
        cx,
        cy,
        R * 1.05,
      );
      const flashBoost = flashA > 0.05 ? flashA : rv.onset * 0.45 * liveBlend;
      body.addColorStop(0, flashBoost > 0.05 ? `rgba(255,255,255,${0.9 * flashBoost + 0.5})` : "#f8fbff");
      body.addColorStop(0.28, hexA(colors[0], 0.95));
      body.addColorStop(0.62, hexA(colors[1], 1));
      body.addColorStop(1, hexA(colors[2], 0.92));
      ctx.fillStyle = body;
      ctx.fillRect(-DRAW, -DRAW, DRAW * 2, DRAW * 2);

      // Idle neochrome plasma filaments
      if (liveBlend < 0.9 && !f.reduce) {
        const plasmaA = 0.3 * (1 - liveBlend);
        ctx.globalAlpha = plasmaA;
        for (let layer = 0; layer < 3; layer++) {
          const speed = 0.28 + layer * 0.12;
          const rad = R * (0.42 + layer * 0.14);
          ctx.strokeStyle = hexA(colors[(layer + Math.floor(t * 0.4)) % colors.length], 0.55 + layer * 0.12);
          ctx.lineWidth = 1.05 + layer * 0.25;
          ctx.beginPath();
          for (let i = 0; i <= 52; i++) {
            const a = (i / 52) * Math.PI * 2 + t * speed + layer;
            const wob =
              Math.sin(a * (2 + layer) + t * (0.6 + layer * 0.2)) * (1.6 + layer) +
              Math.cos(a * 3 - t * 0.45) * (0.8 + layer * 0.4);
            const x = cx + Math.cos(a) * (rad + wob);
            const y = cy + Math.sin(a * (1.05 + layer * 0.05)) * (rad * 0.72 + wob * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        const bloom = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.85);
        bloom.addColorStop(0, hexA(colors[0], 0.22 * (1 - liveBlend)));
        bloom.addColorStop(0.55, hexA(colors[1], 0.1 * (1 - liveBlend)));
        bloom.addColorStop(1, hexA(colors[2], 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Live internal filaments — mid/high weave
      if (reactive && morphW > 0.35 && !f.reduce && ampCap > 0.4) {
        ctx.globalAlpha = 0.22 + rv.presence * 0.25;
        ctx.strokeStyle = hexA(colors[Math.floor(t * 3) % colors.length], 0.7);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        const spins = 36;
        for (let i = 0; i <= spins; i++) {
          const a = (i / spins) * Math.PI * 2 + t * (1.2 + rv.centroid);
          const fi = Math.floor((i / spins) * rv.spectrum.length) % Math.max(1, rv.spectrum.length);
          const v = (rv.spectrum[fi] || 0) / 255;
          const rr = R * (0.28 + v * 0.42 * ampCap);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a * (1.05 + rv.high * 0.2)) * rr * 0.78;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const sx = ptr.x - stickCx;
      const sy = ptr.y - stickCy;
      const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.45);
      spec.addColorStop(0, `rgba(255,255,255,${0.55 + flashA * 0.4 + rv.onset * 0.25 * liveBlend})`);
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.fillRect(-DRAW, -DRAW, DRAW * 2, DRAW * 2);

      if (reactive && morphW > 0.55 && morph === "bars") {
        const n = 14;
        for (let i = 0; i < n; i++) {
          const v = (rv.spectrum[Math.floor((i / n) * rv.spectrum.length)] || 0) / 255;
          const bh = Math.min(R * 0.9, (4 + v * R * (1.2 + ampCap * 0.35)) * Math.max(0.35, ampCap));
          const x = cx - R * 0.72 + (i / (n - 1)) * R * 1.44;
          ctx.fillStyle = hexA(colors[i % colors.length], 0.42 + v * 0.5);
          ctx.fillRect(x - 1.5, cy + R * 0.35 - bh, 3, bh);
        }
      } else if (reactive && morphW > 0.55 && morph === "liquid") {
        ctx.strokeStyle = hexA(colors[Math.floor(t * 2) % colors.length], 0.35 + pulse * 0.45);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2 + t * 1.15;
          const wob = Math.sin(a * 3 + rv.mid * 10) * (2 + pulse * 4.5 * ampCap) + rv.onset * 3;
          const rr = Math.min(R * 0.55 + wob, MAX_R * 0.8);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a * 1.2) * (rr * 0.55);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // High shimmer motes
      if (reactive && rv.high > 0.12 && ampCap > 0.5 && morphW > 0.4) {
        const motes = Math.floor(4 + rv.high * 8 * ampCap);
        for (let i = 0; i < motes; i++) {
          const a = t * 2.4 + i * 1.7 + rv.centroid * 4;
          const rr = R * (0.35 + ((i * 17) % 10) / 10 * 0.5);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a * 1.3) * rr * 0.75;
          ctx.fillStyle = hexA(colors[i % colors.length], 0.15 + rv.high * 0.35);
          ctx.beginPath();
          ctx.arc(x, y, 0.8 + rv.onset * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore(); // clip

      ctx.strokeStyle = hexA("#ffffff", 0.14 + (ptr.inside ? 0.18 : 0) + pulse * 0.14 + rv.beat * 0.1);
      ctx.lineWidth = 1.15;
      pathMorph(ctx, morph, cx, cy, R, t, rv, morphPulse, morphScale, morphW);
      ctx.stroke();

      ctx.restore(); // squash / stick

      raf = requestAnimationFrame(draw);
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <button
      ref={wrapRef}
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-label={ariaLabel ?? (open ? "Close actions" : "Open actions")}
      aria-expanded={open}
      className={cx(
        "relative z-10 grid h-[72px] w-[72px] place-items-center rounded-full outline-none touch-none focus-visible:ring-2 focus-visible:ring-veil-400/60",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </button>
  );
}

type Morph = "sphere" | "blob" | "ring" | "bars" | "liquid";

function morphMode(fx: PostFx): Morph {
  switch (fx) {
    case "pulse": return "blob";
    case "bars": return "bars";
    case "ripple": return "ring";
    case "aurora": return "liquid";
    case "off":
    case "glow":
    default: return "sphere";
  }
}

function drawSpectrumCorona(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  rv: ReactiveVisualFrame,
  colors: string[],
  strength: number,
  fxScale: number,
) {
  const spokes = fxScale >= 1 ? 48 : 28;
  const outer = Math.min(R * (1.55 + rv.beat * 0.2), DRAW * 0.46);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const fi = Math.floor((i / spokes) * rv.spectrum.length) % Math.max(1, rv.spectrum.length);
    const v = (rv.spectrum[fi] || 0) / 255;
    const len = (v * (outer - R) * (0.55 + strength * 0.55)) * (0.35 + strength);
    if (len < 0.6) continue;
    const x0 = cx + Math.cos(a) * (R * 1.02);
    const y0 = cy + Math.sin(a) * (R * 1.02);
    const x1 = cx + Math.cos(a) * (R * 1.02 + len);
    const y1 = cy + Math.sin(a) * (R * 1.02 + len);
    ctx.strokeStyle = hexA(colors[i % colors.length], (0.14 + v * 0.45) * strength);
    ctx.lineWidth = fxScale >= 1 ? 1.35 : 1.05;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function neoChromeAt(t: number): string[] {
  const n = NEO.length;
  const speed = 0.09;
  const phase = t * speed;
  const i = Math.floor(phase) % n;
  const f = phase - Math.floor(phase);
  const a = NEO[i];
  const b = NEO[(i + 1) % n];
  const c = NEO[(i + 2) % n];
  return [lerpHex(a, b, f), lerpHex(b, c, f), lerpHex(c, NEO[(i + 3) % n], f), a];
}

function blendPalettes(idle: string[], live: string[], w: number): string[] {
  const n = Math.max(idle.length, live.length, 3);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(lerpHex(idle[i % idle.length], live[i % live.length] ?? idle[0], w));
  }
  return out;
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function pathMorph(
  ctx: CanvasRenderingContext2D,
  morph: Morph,
  cx: number,
  cy: number,
  R: number,
  t: number,
  rv: ReactiveVisualFrame,
  pulse: number,
  fxScale: number,
  morphW: number,
) {
  ctx.beginPath();
  const freq = rv.spectrum;
  if (morph === "sphere" || morph === "bars" || morphW < 0.12) {
    // Always FFT-warp silhouette when reactive enough — “obviously tracks” the drop
    if (pulse > 0.04 && morphW > 0.2 && fxScale > 0.2) {
      const n = 42;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const fi = Math.floor((i / n) * freq.length) % Math.max(1, freq.length);
        const f = (freq[fi] || 0) / 255;
        const warp =
          f * pulse * (2.4 + fxScale * 2.2) * morphW +
          rv.beat * 1.6 * morphW +
          rv.onset * 1.2 * morphW;
        const rr = Math.min(R + warp, MAX_R);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      return;
    }
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    return;
  }
  if (morph === "ring") {
    const inner = R * (0.55 - pulse * 0.1 * morphW - rv.beat * 0.04);
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.arc(cx, cy, Math.max(4, inner), 0, Math.PI * 2, true);
    return;
  }
  const n = 52;
  const amp = (0.45 + Math.min(fxScale, 1.2) * 0.4) * morphW;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const fi = Math.floor((i / n) * freq.length) % Math.max(1, freq.length);
    const f = (freq[fi] || 0) / 255;
    const warp =
      morph === "liquid"
        ? Math.sin(a * 4 + t * 2.2) * (1.6 + rv.high * 4) * amp +
          f * 3.4 * pulse * amp +
          rv.onset * 2.2 * amp
        : Math.sin(a * 3 + t * 1.6 + rv.bass * 2.4) * (2 + pulse * 3.6) * amp +
          rv.mid * 2.4 * amp +
          f * 2.4 * pulse +
          rv.beat * 1.8 * amp;
    const rr = Math.min(R + warp, MAX_R);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseRgb(a);
  const pb = parseRgb(b);
  if (!pa || !pb) return a;
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * u);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * u);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * u);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function parseRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "");
  if (m.length < 6) return null;
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function vividHex(hex: string, boost: number): string {
  if (boost < 0.01) return hex.startsWith("#") ? hex : `#${hex}`;
  const m = hex.replace("#", "");
  if (m.length < 6) return hex;
  let r = parseInt(m.slice(0, 2), 16) / 255;
  let g = parseInt(m.slice(2, 4), 16) / 255;
  let b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const s2 = Math.min(1, s + boost * 0.55 + (1 - s) * boost * 0.35);
  const l2 = Math.min(0.72, Math.max(0.18, l + boost * 0.12 * (l < 0.45 ? 1 : -0.35)));
  const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
  const p = 2 * l2 - q;
  const hue2rgb = (tt: number) => {
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  r = Math.round(hue2rgb(h + 1 / 3) * 255);
  g = Math.round(hue2rgb(h) * 255);
  b = Math.round(hue2rgb(h - 1 / 3) * 255);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return `rgba(0,161,255,${a})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}
