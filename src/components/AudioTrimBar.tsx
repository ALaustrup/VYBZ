import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { cx } from "@/lib/utils";
import { fmtClock, type TrimRange } from "@/lib/audioEdit";

interface AudioTrimBarProps {
  duration: number;
  range: TrimRange;
  onChange: (range: TrimRange) => void;
  peaks?: number[];
  accent?: string;
  className?: string;
}

/** Dual-handle trim control for selecting an upload window. */
export function AudioTrimBar({ duration, range, onChange, peaks, accent = "#a87cf8", className }: AudioTrimBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dur = Math.max(0.05, duration || 0.05);
  const startPct = (range.startSec / dur) * 100;
  const endPct = (range.endSec / dur) * 100;

  const posFromEvent = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }, []);

  const drag = (which: "start" | "end") => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const t = posFromEvent(ev.clientX) * dur;
      if (which === "start") {
        onChange({ startSec: Math.min(t, range.endSec - 0.05), endSec: range.endSec });
      } else {
        onChange({ startSec: range.startSec, endSec: Math.max(t, range.startSec + 0.05) });
      }
    };
    const up = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className={cx("space-y-2", className)}>
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>Trim · {fmtClock(range.startSec)} – {fmtClock(range.endSec)}</span>
        <span className="tabular-nums text-white/35">{fmtClock(range.endSec - range.startSec)} selected</span>
      </div>
      <div ref={trackRef} className="relative h-12 touch-none select-none overflow-hidden rounded-xl bg-ink-950/80">
        {peaks && peaks.length > 0 && (
          <div className="absolute inset-0 flex items-end gap-px px-1 opacity-40">
            {peaks.filter((_, i) => i % Math.max(1, Math.floor(peaks.length / 64)) === 0).map((p, i) => (
              <span key={i} className="flex-1 rounded-sm bg-white/50" style={{ height: `${Math.max(8, p * 100)}%` }} />
            ))}
          </div>
        )}
        <div
          className="absolute inset-y-0 bg-white/[0.06]"
          style={{ left: 0, width: `${startPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-white/[0.06]"
          style={{ left: `${endPct}%`, right: 0 }}
        />
        <div
          className="absolute inset-y-0 rounded-md border border-white/25"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(1, endPct - startPct)}%`,
            boxShadow: `inset 0 0 0 1px ${accent}55`,
            background: `${accent}22`,
          }}
        />
        <button
          type="button"
          aria-label="Trim start"
          onPointerDown={drag("start")}
          className="absolute top-0 z-10 h-full w-4 -translate-x-1/2 cursor-ew-resize"
          style={{ left: `${startPct}%` }}
        >
          <span className="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white shadow" style={{ background: accent }} />
        </button>
        <button
          type="button"
          aria-label="Trim end"
          onPointerDown={drag("end")}
          className="absolute top-0 z-10 h-full w-4 -translate-x-1/2 cursor-ew-resize"
          style={{ left: `${endPct}%` }}
        >
          <span className="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white shadow" style={{ background: accent }} />
        </button>
      </div>
    </div>
  );
}
