import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const SCAN_LINES = [
  "Reading your master…",
  "Measuring loudness and peaks…",
  "Checking artwork dimensions…",
  "Building your release report…",
];

type PrepareScanStageProps = {
  trackName?: string | null;
  artName?: string | null;
};

/**
 * Full-screen scanning visual — shown while probes and readiness run client-side.
 */
export function PrepareScanStage({ trackName, artName }: PrepareScanStageProps) {
  const reduce = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % SCAN_LINES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

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
      aria-busy="true"
    >
      <div className="forge-glass relative w-full overflow-hidden p-6 md:p-8">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[1]">
          <p className="nexus-eyebrow">Analyzing your release</p>
          <p className="mt-3 font-display text-lg text-white">
            {trackName ?? "Your track"}
          </p>
          {artName ? (
            <p className="mt-1 text-xs text-white/45">Cover: {artName}</p>
          ) : null}

          <div
            className="relative mx-auto mt-8 flex h-28 w-full max-w-md items-end justify-center gap-[3px] px-2"
            aria-hidden
          >
            {bars.map((base, i) =>
              reduce ? (
                <span
                  key={i}
                  className="w-1 rounded-full bg-suite-cyan/50"
                  style={{ height: `${base * 100}%` }}
                />
              ) : (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-suite-cyan/20 to-suite-cyan"
                  initial={{ height: `${base * 40}%` }}
                  animate={{ height: [`${base * 35}%`, `${base * 100}%`, `${base * 45}%`] }}
                  transition={{
                    duration: 0.9 + (i % 5) * 0.08,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.03,
                  }}
                />
              )
            )}
          </div>

          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            {!reduce ? (
              <motion.div
                className="h-full rounded-full bg-suite-cyan/80"
                initial={{ width: "8%" }}
                animate={{ width: ["8%", "72%", "94%"] }}
                transition={{ duration: 2.4, ease: "easeOut" }}
              />
            ) : (
              <div className="h-full w-2/3 rounded-full bg-suite-cyan/80" />
            )}
          </div>

          <p className="mt-5 text-sm text-white/55">{SCAN_LINES[lineIdx]}</p>
          <p className="mt-2 text-[11px] text-white/30">
            Measured on your device — no cloud upload during the scan.
          </p>
        </div>
      </div>
    </div>
  );
}
