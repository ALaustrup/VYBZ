import { useCallback, useEffect, useRef, useState } from "react";
import { getSnapshot, subscribe } from "@/lib/audioBus";
import { OverlayPortal } from "@/lib/overlayPortal";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";
import { activeSpark, type Spark } from "./sparkEngine";
import { answerSpark, markSparkShown } from "./sparkApi";

/**
 * The listener's side of a spark.
 *
 * Quiet dots during the passage, then the prompt just after it, then it bursts.
 * The clock is read on a rAF loop from the AudioBus snapshot rather than through
 * a hook, because `currentTime` ticks constantly and re-rendering the whole tree
 * on every tick to animate a ring would be absurd.
 *
 * Nothing here touches the audio graph — playback stays dry.
 */
export function SparkOverlay({ trackId, sparks }: { trackId: string; sparks: Spark[] }) {
  const reduce = useReduceFx();
  const [current, setCurrent] = useState<{ spark: Spark; phase: string; progress: number } | null>(
    null,
  );
  const [answered, setAnswered] = useState<Record<string, number>>({});
  const shownRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);

  // A new track means a new set of exposures.
  useEffect(() => {
    shownRef.current = new Set();
    setAnswered({});
    setCurrent(null);
  }, [trackId]);

  const tick = useCallback(() => {
    const snap = getSnapshot();
    if (!snap.playing || snap.track?.id !== trackId || sparks.length === 0) {
      setCurrent((c) => (c === null ? c : null));
    } else {
      const found = activeSpark(sparks, snap.currentTime);
      setCurrent((prev) => {
        if (!found) return prev === null ? prev : null;
        if (
          prev &&
          prev.spark.id === found.spark.id &&
          prev.phase === found.state.phase &&
          Math.abs(prev.progress - found.state.progress) < 0.02
        ) {
          return prev; // avoid a render per frame
        }
        return { spark: found.spark, phase: found.state.phase, progress: found.state.progress };
      });
    }
    frameRef.current = requestAnimationFrame(tick);
  }, [sparks, trackId]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick);
    const unsub = subscribe(() => undefined);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      unsub();
    };
  }, [tick]);

  // Record the exposure once the prompt is actually on screen.
  useEffect(() => {
    if (!current || current.phase !== "live") return;
    const id = current.spark.id;
    if (shownRef.current.has(id)) return;
    shownRef.current.add(id);
    void markSparkShown(id);
  }, [current]);

  if (!current) return null;
  const { spark, phase, progress } = current;
  const chosen = answered[spark.id];

  async function choose(index: number) {
    setAnswered((a) => ({ ...a, [spark.id]: index }));
    await answerSpark(spark.id, index);
  }

  return (
    <OverlayPortal>
      <div
        className="pointer-events-none fixed inset-x-0 z-[82] flex justify-center px-3"
        style={{ bottom: "calc(var(--dock-reserve, 6.25rem) + 0.75rem)" }}
        data-testid="spark-overlay"
        data-spark-phase={phase}
      >
        {phase === "dots" ? (
          <div
            className="mat-surface-strong pointer-events-none flex items-center gap-1.5 rounded-full px-3 py-2"
            aria-hidden
            data-testid="spark-dots"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cx(
                  "h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-rgb))]",
                  !reduce && "animate-pulse",
                )}
                style={{ opacity: 0.35 + 0.65 * Math.max(0, Math.min(1, progress * 3 - i)) }}
              />
            ))}
          </div>
        ) : chosen === undefined ? (
          <div
            role="group"
            aria-label={spark.question}
            className="mat-surface-strong pointer-events-auto w-full max-w-sm rounded-2xl border border-white/12 p-3 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]"
            data-testid="spark-prompt"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex h-5 w-5 shrink-0" aria-hidden>
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(rgb(var(--accent-rgb)) ${progress * 360}deg, rgba(255,255,255,0.12) 0deg)`,
                  }}
                />
                <span className="absolute inset-[3px] rounded-full bg-ink-950" />
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90">
                {spark.question}
              </p>
            </div>
            <div className="flex gap-1.5">
              {spark.options.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => void choose(i)}
                  data-testid={`spark-option-${i}`}
                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl bg-white/[0.06] px-2 py-2 transition hover:bg-white/[0.12] active:scale-95"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {o.emoji}
                  </span>
                  <span className="truncate text-[11px] text-white/70">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="mat-surface-strong pointer-events-none rounded-full px-3 py-2 text-[12px] text-white/70"
            data-testid="spark-answered"
            role="status"
          >
            {spark.options[chosen]?.emoji} Sent — thanks
          </div>
        )}
      </div>
    </OverlayPortal>
  );
}
