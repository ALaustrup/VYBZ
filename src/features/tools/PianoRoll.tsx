/**
 * Lightweight clickable piano roll — place / remove notes on a pitch × time grid.
 */

import { useMemo, useRef, type MouseEvent } from "react";
import { cx } from "@/lib/utils";

export type PianoNote = {
  id: string;
  midi: number;
  time: number;
  duration: number;
  velocity: number;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK = new Set([1, 3, 6, 8, 10]);

function label(m: number): string {
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

type Props = {
  notes: PianoNote[];
  /** Inclusive MIDI range (low → high visually inverted). */
  midiMin?: number;
  midiMax?: number;
  /** Visible duration in seconds. */
  seconds?: number;
  pxPerSec?: number;
  rowH?: number;
  onPlace: (midi: number, time: number) => void;
  onRemove: (id: string) => void;
};

export function PianoRoll({
  notes,
  midiMin = 48,
  midiMax = 72,
  seconds = 8,
  pxPerSec = 64,
  rowH = 16,
  onPlace,
  onRemove,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pitches = useMemo(() => {
    const out: number[] = [];
    for (let m = midiMax; m >= midiMin; m--) out.push(m);
    return out;
  }, [midiMin, midiMax]);

  const width = Math.max(320, seconds * pxPerSec);
  const height = pitches.length * rowH;

  function cellFromEvent(e: MouseEvent) {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    const y = e.clientY - rect.top + el.scrollTop;
    const col = Math.max(0, Math.floor(x / (pxPerSec / 4))); // 16th notes
    const time = (col * 0.25);
    const row = Math.max(0, Math.min(pitches.length - 1, Math.floor(y / rowH)));
    const midi = pitches[row]!;
    return { midi, time: Math.min(seconds - 0.25, time) };
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60" data-testid="piano-roll">
      <div className="flex max-h-[min(420px,50vh)] overflow-auto">
        <div className="sticky left-0 z-[1] shrink-0 border-r border-white/10 bg-ink-900/95">
          {pitches.map((m) => (
            <div
              key={m}
              className={cx(
                "flex w-12 items-center justify-end pr-1.5 font-mono text-[9px]",
                BLACK.has(m % 12) ? "bg-white/[0.04] text-white/35" : "text-white/50"
              )}
              style={{ height: rowH }}
            >
              {m % 12 === 0 ? label(m) : ""}
            </div>
          ))}
        </div>
        <div
          ref={gridRef}
          className="relative cursor-crosshair"
          style={{ width, height, minWidth: width }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-note]")) return;
            const cell = cellFromEvent(e);
            if (cell) onPlace(cell.midi, cell.time);
          }}
        >
          {/* grid lines */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: `${pxPerSec / 4}px ${rowH}px, 100% ${rowH}px`,
            }}
          />
          {pitches.map((m, i) =>
            BLACK.has(m % 12) ? (
              <div
                key={`bg-${m}`}
                className="pointer-events-none absolute left-0 right-0 bg-white/[0.03]"
                style={{ top: i * rowH, height: rowH }}
              />
            ) : null
          )}
          {notes.map((n) => {
            if (n.midi < midiMin || n.midi > midiMax) return null;
            const row = midiMax - n.midi;
            const left = n.time * pxPerSec;
            const w = Math.max(6, n.duration * pxPerSec);
            return (
              <button
                key={n.id}
                type="button"
                data-note
                title={`${label(n.midi)} @ ${n.time.toFixed(2)}s — click to remove`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(n.id);
                }}
                className="absolute rounded-sm border border-veil-300/50 bg-veil-400/70 shadow-[0_0_8px_rgb(var(--accent-rgb)/0.35)] hover:bg-veil-300"
                style={{
                  left,
                  top: row * rowH + 1,
                  width: w,
                  height: rowH - 2,
                }}
              />
            );
          })}
        </div>
      </div>
      <p className="border-t border-white/8 px-3 py-1.5 text-[10px] text-white/35">
        Click empty grid to place a ¼-note · click a block to remove · scroll for range
      </p>
    </div>
  );
}
