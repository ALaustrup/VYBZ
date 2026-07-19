import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { readBands, usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";

type IconEl = HTMLImageElement | SVGSVGElement | null;

/**
 * Drives an audio-reactive "neochrome" neon pulse on the brand mark. While
 * anything plays through the shared AudioBus it (a) fades + scales a painted
 * radial halo element behind the icon and (b) flashes the icon's brightness and
 * size — a beat-style pulse auto-scaled to the track. Everything rests fully off
 * when silent, and honors the reduced-motion preference.
 */
function useReactiveGlow(
  enabled: boolean,
  iconRef: React.RefObject<IconEl>,
  haloRef: React.RefObject<HTMLSpanElement | null>,
) {
  const { playing } = usePlayer();
  const reduce = useReduceFx();

  useEffect(() => {
    const icon = iconRef.current;
    const halo = haloRef.current;
    const reset = () => {
      if (icon) { icon.style.filter = ""; icon.style.transform = ""; }
      if (halo) { halo.style.opacity = "0"; halo.style.transform = "scale(0.6)"; }
    };
    if (!enabled || (!icon && !halo)) { reset(); return; }

    const apply = (g: number) => {
      // g: ~0 (silent) .. ~1.6 (loud transient).
      if (icon) {
        icon.style.filter = `brightness(${(1 + g * 0.55).toFixed(3)}) saturate(${(1 + g * 0.6).toFixed(3)})`;
        icon.style.transform = `scale(${(1 + Math.min(0.24, g * 0.2)).toFixed(3)})`;
        icon.style.willChange = "filter, transform";
      }
      if (halo) {
        halo.style.opacity = Math.min(0.95, 0.16 + g * 0.72).toFixed(3);
        halo.style.transform = `scale(${(0.85 + Math.min(1.7, g * 1.25)).toFixed(3)})`;
      }
    };

    if (reduce) { if (playing) apply(0.5); else reset(); return; }

    let raf = 0;
    let eased = 0;
    // React to how much the current energy exceeds its own moving baseline
    // (beat-style), auto-scaled by the track's typical deviation, so it keeps
    // pulsing on any track instead of ramping up once and saturating.
    let base = 0;
    let sc = 0.02;
    const tick = () => {
      if (!playing) { reset(); eased = 0; base = 0; sc = 0.02; return; }
      const b = readBands();
      const v = b.bass * 0.7 + b.level * 0.3; // bass carries the beat
      base += (v - base) * (base ? 0.03 : 1); // slow baseline → larger swings
      const dev = v - base;
      sc += (Math.abs(dev) - sc) * 0.05; // adaptive typical deviation
      const norm = dev / Math.max(sc * 1.3, 0.006);
      const pulse = Math.max(-1, Math.min(1.6, norm));
      const target = Math.max(0.06, 0.4 + pulse * 0.78);
      const k = target > eased ? 0.6 : 0.2; // fast attack, slower release
      eased += (target - eased) * k;
      apply(eased);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [enabled, playing, reduce, iconRef, haloRef]);
}

/**
 * The VYBZ icon. Uses the official artwork at `/brand/icon.svg` (preferred) or
 * `/brand/icon.png` once dropped into `public/brand/`; until then it renders a
 * hand-built fallback mark so nothing looks broken. The official icon is
 * full-color, so it renders as an image (size classes still apply).
 *
 * When `reactive` is set, the mark glows with an audio-reactive neon pulse tied
 * to whatever is playing through the shared AudioBus.
 */
export function BrandMark({
  className,
  title = "VYBZ",
  reactive = false,
}: {
  className?: string;
  title?: string;
  reactive?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const iconRef = useRef<IconEl>(null);
  const haloRef = useRef<HTMLSpanElement | null>(null);
  useReactiveGlow(reactive, iconRef, haloRef);

  const mark = !failed ? (
    <img
      ref={iconRef as React.RefObject<HTMLImageElement>}
      src="/brand/icon.svg"
      onError={(e) => {
        const el = e.currentTarget;
        if (!el.dataset.triedPng) {
          el.dataset.triedPng = "1";
          el.src = "/brand/icon.png";
        } else {
          setFailed(true);
        }
      }}
      alt={title}
      className={cx("select-none object-contain", className)}
      draggable={false}
    />
  ) : (
    // Fallback: hand-built linked-nodes mark (currentColor-themeable).
    <svg
      ref={iconRef as React.RefObject<SVGSVGElement>}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
      stroke="currentColor"
    >
      <g strokeWidth={6} strokeLinecap="round">
        <line x1="28.9" y1="22.6" x2="37.1" y2="21.4" />
        <line x1="24.6" y1="31.8" x2="28.4" y2="38.3" />
        <line x1="42.0" y1="28.1" x2="37.0" y2="38.0" />
      </g>
      <g strokeWidth={5}>
        <circle cx="20" cy="24" r="6.5" />
        <circle cx="46" cy="20" r="6.5" />
        <circle cx="33" cy="46" r="6.5" />
      </g>
    </svg>
  );

  if (!reactive) return mark;

  // Reactive: wrap with a painted radial halo behind the icon that fades and
  // scales with the audio (a real element, so it reads clearly and captures).
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      <span ref={haloRef} aria-hidden className="vybz-mark-halo pointer-events-none absolute inset-0" />
      <span className="relative z-10 inline-flex">{mark}</span>
    </span>
  );
}

/**
 * The VYBZ wordmark. Uses the official artwork at `/brand/wordmark.svg`
 * (preferred) or `/brand/wordmark.png` once it's dropped into `public/brand/`.
 * Until then it falls back to a styled text lockup so the app always looks
 * intentional — never broken.
 */
export function Wordmark({
  className,
  imgClassName,
  textClassName,
}: {
  className?: string;
  // Kept for API compatibility with existing call sites; unused now that the
  // wordmark renders as text.
  imgClassName?: string;
  textClassName?: string;
}) {
  // Rendered as a styled gradient text lockup rather than an image: the legacy
  // artwork spelled the old brand, and this guarantees the "VYBZ" wordmark reads
  // correctly everywhere until official VYBZ artwork is dropped into
  // `public/brand/`. Economical, professional, on-brand ("VYBZ: Find Yours.").
  void imgClassName;
  return (
    <span
      className={cx(
        "select-none font-display font-black tracking-tight text-gradient",
        textClassName,
        className
      )}
    >
      VYBZ
    </span>
  );
}

/**
 * Brand lockup for headers/nav/intro: the official VYBZ logo. Renders the real
 * horizontal artwork (`/brand/logo-white.svg`), with an optional subtle
 * audio-reactive glow that breathes while audio plays (no layout shift).
 */
export function BrandLockup({
  className,
  height = "h-7",
  reactive = true,
  variant = "white",
}: {
  className?: string;
  /** Tailwind height class for the logo (width auto). */
  height?: string;
  reactive?: boolean;
  variant?: "white" | "color" | "black";
}) {
  const ref = useRef<HTMLImageElement | null>(null);
  const { playing } = usePlayer();
  const reduce = useReduceFx();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!reactive || reduce || !playing) { el.style.filter = ""; return; }
    let raf = 0, eased = 0;
    const tick = () => {
      const lvl = readBands().level;
      eased += (lvl - eased) * 0.25;
      const g = Math.min(1, eased * 1.4);
      el.style.filter = `drop-shadow(0 0 ${(6 + g * 14).toFixed(1)}px rgba(0,255,150,${(0.15 + g * 0.5).toFixed(3)})) drop-shadow(0 0 ${(12 + g * 30).toFixed(1)}px rgba(0,161,255,${(0.1 + g * 0.4).toFixed(3)}))`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [reactive, reduce, playing]);

  const src =
    variant === "color" ? "/brand/logo.svg"
    : variant === "black" ? "/brand/logo-black.svg"
    : "/brand/logo-white.svg";
  return (
    <span className={cx("inline-flex items-center", className)}>
      <img ref={ref} src={src} alt="VYBZ" draggable={false}
        className={cx("w-auto select-none object-contain", height)} />
    </span>
  );
}
