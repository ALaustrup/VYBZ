import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  /** Answered sparks whose confirmation has had its moment. */
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const shownRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);

  // A new track means a new set of exposures.
  useEffect(() => {
    shownRef.current = new Set();
    setAnswered({});
    setDismissed({});
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
  if (chosen !== undefined && dismissed[spark.id]) return null;

  async function choose(index: number) {
    const id = spark.id;
    setAnswered((a) => ({ ...a, [id]: index }));
    // Thank them and get out of the way. The window may have 15 seconds left,
    // and a confirmation does not need them.
    window.setTimeout(() => setDismissed((d) => ({ ...d, [id]: true })), 2200);
    await answerSpark(id, index);
  }

  return (
    <OverlayPortal>
      <div
        className="pointer-events-none fixed inset-x-0 z-[82] flex justify-center px-3"
        style={{ bottom: "calc(var(--dock-reserve, 6.25rem) + 0.75rem)" }}
        data-testid="spark-overlay"
        data-spark-phase={phase}
      >
        <AnimatePresence mode="wait">
          {phase === "dots" ? (
            <motion.div
              key="dots"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mat-surface-strong pointer-events-none flex items-center gap-2 rounded-full px-3.5 py-2.5"
              aria-hidden
              data-testid="spark-dots"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cx(
                    "h-2 w-2 rounded-full bg-[rgb(var(--accent-rgb))]",
                    !reduce && "animate-pulse",
                  )}
                  style={{
                    opacity: 0.3 + 0.7 * Math.max(0, Math.min(1, progress * 3 - i)),
                    animationDelay: `${i * 160}ms`,
                  }}
                />
              ))}
            </motion.div>
          ) : chosen === undefined ? (
            <motion.div
              key="prompt"
              // The arrival has to be noticeable or the window is spent noticing it.
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              role="group"
              aria-label={spark.question}
              className="mat-surface-strong pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-[rgb(var(--accent-rgb)/0.35)] shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)]"
              data-testid="spark-prompt"
            >
              <div className="p-3">
                <p className="mb-2 text-[13px] font-medium text-white/90">{spark.question}</p>
                <div className="flex gap-1.5">
                  {spark.options.map((o, i) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => void choose(i)}
                      data-testid={`spark-option-${i}`}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl bg-white/[0.06] px-2 py-2.5 transition hover:bg-white/[0.14] active:scale-95"
                    >
                      <span className="text-xl leading-none" aria-hidden>
                        {o.emoji}
                      </span>
                      <span className="truncate text-[11px] text-white/75">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Time left, readable peripherally — a 20px ring was not. */}
              <div className="h-1 w-full bg-white/[0.06]" aria-hidden>
                <div
                  className="h-full bg-[rgb(var(--accent-rgb)/0.8)]"
                  style={{ width: `${Math.max(0, 100 - progress * 100)}%` }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mat-surface-strong pointer-events-none rounded-full px-3.5 py-2 text-[12px] text-white/75"
              data-testid="spark-answered"
              role="status"
            >
              {spark.options[chosen]?.emoji} Sent — thanks
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OverlayPortal>
  );
}
