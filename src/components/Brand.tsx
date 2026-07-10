import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { readBands, usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";

/**
 * Drives an audio-reactive "neochrome" neon glow on the brand mark. Reads the
 * shared AudioBus level while anything is playing and writes a layered
 * drop-shadow (green→blue) that pulses with the audio; keeps a soft resting glow
 * when idle. No-op (or a single static glow) when reactivity/motion is disabled.
 */
function useReactiveGlow(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const { playing } = usePlayer();
  const reduce = useReduceFx();

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      if (el) el.style.filter = "";
      return;
    }
    const glow = (g: number) => {
      // g: 0 (resting) .. ~1.2 (loud). Two stacked shadows read as neon.
      const inner = 4 + g * 11;
      const outer = 9 + g * 26;
      el.style.filter =
        `drop-shadow(0 0 ${inner}px rgba(0,255,143,${0.28 + g * 0.5})) ` +
        `drop-shadow(0 0 ${outer}px rgba(0,161,255,${0.18 + g * 0.42}))`;
    };
    if (reduce) { glow(0.15); return; }

    let raf = 0;
    let eased = 0.12;
    const tick = () => {
      const lvl = playing ? readBands().level : 0;
      const target = playing ? 0.12 + lvl * 1.05 : 0.12;
      // Fast attack, slow release so pulses pop then settle.
      const k = target > eased ? 0.5 : 0.12;
      eased += (target - eased) * k;
      glow(eased);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [enabled, playing, reduce]);

  return ref;
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
  const glowRef = useReactiveGlow(reactive);

  if (!failed) {
    return (
      <img
        ref={glowRef as React.RefObject<HTMLImageElement>}
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
    );
  }

  // Fallback: hand-built linked-nodes mark (currentColor-themeable).
  return (
    <svg
      ref={glowRef as React.RefObject<SVGSVGElement>}
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
 * Brand lockup for headers/nav: the icon mark next to the "myvyb" wordmark.
 * Both fall back gracefully to a hand-built mark / styled text if the official
 * artwork is missing, so the header never looks broken.
 */
export function BrandLockup({
  className,
  markClassName = "h-6 w-6 text-veil-300",
  wordClassName,
  reactive = true,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
  reactive?: boolean;
}) {
  return (
    <span className={cx("flex items-center gap-2", className)}>
      <BrandMark className={markClassName} reactive={reactive} />
      <Wordmark imgClassName="h-5 w-auto" textClassName={cx("text-2xl", wordClassName)} />
    </span>
  );
}
