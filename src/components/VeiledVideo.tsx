import { useEffect, useRef, useState } from "react";

interface VeiledVideoProps {
  src: string;
  /** Community reveal level 0..1. */
  level?: number;
  nsfw?: boolean;
  /** Non-destructive trim window (seconds). Plays only this slice, looped. */
  clipStart?: number;
  clipEnd?: number;
  /** Pause playback (e.g. off-screen in a mosaic) to save battery. */
  paused?: boolean;
  /** Bottom caption scrim (for text-over-media). Off for plain media viewers. */
  scrim?: boolean;
  className?: string;
}

/**
 * A real uploaded video, shown artfully veiled (mirrors VeiledPhoto's blur/scale
 * treatment) and looped within an optional ≤15s "virtual trim" window — we never
 * re-encode the source, we just clamp playback. Muted + inline so it autoplays
 * everywhere, including iOS.
 */
export function VeiledVideo({
  src,
  level,
  nsfw = false,
  clipStart,
  clipEnd,
  paused = false,
  scrim = true,
  className,
}: VeiledVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Visibility-gated playback: only clips actually on screen play, so a scrolling
  // landing feed stays smooth (and battery-friendly) yet resumes instantly.
  const [onScreen, setOnScreen] = useState(true);
  const lvl = level != null ? Math.max(0, Math.min(1, level)) : 0;
  const maxBlur = nsfw ? 64 : 48;
  // Crisp at full clarity (0 blur), veils progressively as the community Veils it.
  const blurPx = lvl >= 0.985 ? 0 : (1 - lvl) * maxBlur;
  const brightness = 0.78 + lvl * 0.22;
  // Only overscan (to hide blur fringes) while actually blurred; fit the frame
  // exactly when clear so the full upload is shown at any resolution.
  const blurred = blurPx > 0.5;
  const scale = blurred ? 1.06 + (1 - lvl) * 0.2 : 1;

  // Enforce the trim window: start at clipStart, loop back at clipEnd.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const start = Math.max(0, clipStart ?? 0);
    const onLoaded = () => {
      if (start > 0 && v.currentTime < start) v.currentTime = start;
    };
    const onTime = () => {
      const end = clipEnd ?? Infinity;
      if (v.currentTime >= end || v.currentTime < start - 0.05) {
        v.currentTime = start;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [clipStart, clipEnd]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting && entry.intersectionRatio > 0.3),
      { threshold: [0, 0.3, 0.6] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused || !onScreen) v.pause();
    else void v.play().catch(() => {});
  }, [paused, onScreen]);

  return (
    <div
      ref={wrapRef}
      className={className}
      data-protect-media
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#191c22",
      }}
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noremoteplayback noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "absolute",
          inset: blurred ? "-10%" : 0,
          width: blurred ? "120%" : "100%",
          height: blurred ? "120%" : "100%",
          objectFit: "cover",
          filter: blurPx
            ? `blur(${blurPx}px) saturate(1.05) brightness(${brightness})`
            : "none",
          transform: `scale(${scale})`,
          transition:
            "filter 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      {/* Bottom scrim for caption legibility — only meaningful while clear, and
          much lighter so it never darkens the media into looking low-quality. */}
      {scrim && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(5,3,7,0.72) 0%, transparent 42%)",
          }}
        />
      )}
    </div>
  );
}
