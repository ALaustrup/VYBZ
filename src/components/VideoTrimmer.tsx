import { useEffect, useRef } from "react";
import { Scissors } from "lucide-react";
import { MAX_CLIP_SECONDS } from "@/lib/media";

interface VideoTrimmerProps {
  src: string;
  duration: number;
  start: number;
  /** Max clip window in seconds (tier-dependent). Defaults to the baseline. */
  maxSeconds?: number;
  onChange: (start: number) => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Lightweight non-destructive trimmer: choose the start of a ≤15s window. We
 * never re-encode — the chosen window is stored as clip_start/clip_end and the
 * player simply loops within it. Works for any size/codec, including 8K, on iOS.
 */
export function VideoTrimmer({
  src,
  duration,
  start,
  maxSeconds = MAX_CLIP_SECONDS,
  onChange,
}: VideoTrimmerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const clipLen = Math.min(maxSeconds, duration);
  const maxStart = Math.max(0, duration - clipLen);
  const end = Math.min(duration, start + clipLen);

  // Keep the preview scrubbing to the chosen start.
  useEffect(() => {
    const v = ref.current;
    if (v && Math.abs(v.currentTime - start) > 0.2) {
      try {
        v.currentTime = start;
      } catch {
        // ignore seeking errors before metadata is ready
      }
    }
  }, [start]);

  return (
    <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-200">
        <Scissors className="h-3.5 w-3.5" />
        Trim to {Math.round(clipLen)}s
      </div>
      <div className="relative mb-2 h-28 overflow-hidden rounded-xl bg-black">
        <video
          ref={ref}
          src={src}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
      <input
        type="range"
        min={0}
        max={maxStart}
        step={0.1}
        value={Math.min(start, maxStart)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-400"
        aria-label="Clip start"
      />
      <div className="mt-1 flex justify-between text-[11px] text-white/55">
        <span>Start {fmt(start)}</span>
        <span>
          {fmt(start)} – {fmt(end)}
        </span>
        <span>End {fmt(duration)}</span>
      </div>
    </div>
  );
}
