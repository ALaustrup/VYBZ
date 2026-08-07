import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { Progress } from "@/components/ui/Progress";
import type { ScanProgress } from "@/features/prepare/scanProgress";

type PrepareScanStageProps = {
  trackName?: string | null;
  artName?: string | null;
  /** Live analysis progress — drives the determinate scanning meter. */
  progress: ScanProgress;
};

/**
 * Full-screen scanning visual — shown while probes and readiness run client-side.
 * Progress is driven by real probe stages (not a cosmetic timer).
 */
export function PrepareScanStage({ trackName, artName, progress }: PrepareScanStageProps) {
  const reduce = useReducedMotion();
  const pct = progress.percent;

  const bars = useMemo(
    () => Array.from({ length: 32 }, (_, i) => 0.25 + ((i * 17) % 13) / 16),
    []
  );

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-10 text-center"
      data-testid="prepare-scan-stage"
      role="status"
      aria-live="polite"
      aria-busy={pct < 100}
    >
      <div className="forge-glass relative w-full overflow-hidden p-6 md:p-8">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[1]">
          <p className="nexus-eyebrow">Analyzing your release</p>
          <p className="mt-3 font-display text-lg text-white">{trackName ?? "Your track"}</p>
          {artName ? <p className="mt-1 text-xs text-white/45">Cover: {artName}</p> : null}

          <div
            className="relative mx-auto mt-8 flex h-28 w-full max-w-md items-end justify-center gap-[3px] px-2"
            aria-hidden
            data-testid="prepare-scan-meter"
          >
            {bars.map((base, i) => {
              const activity = 0.35 + (pct / 100) * 0.65;
              const heightPct = Math.max(8, base * 100 * activity);
              if (reduce) {
                return (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-suite-cyan/50"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              }
              return (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-suite-cyan/20 to-suite-cyan"
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.008 }}
                />
              );
            })}
          </div>

          <div className="mt-6 w-full" data-testid="prepare-scan-progress">
            <Progress value={pct} label="Track analysis scan progress" className="h-2" />
            <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-white/40">
              <span data-testid="prepare-scan-stage-label">{progress.label}</span>
              <span data-testid="prepare-scan-percent">{pct}%</span>
            </div>
          </div>

          <p className="mt-5 text-[11px] text-white/30">
            Measured on your device — no cloud upload during the scan.
          </p>
        </div>
      </div>
    </div>
  );
}
