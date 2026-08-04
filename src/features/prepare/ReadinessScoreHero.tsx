import { motion, useReducedMotion } from "framer-motion";
import type { ReadinessSummary } from "@/features/prepare/readinessScore";

const RING: Record<ReadinessSummary["level"], string> = {
  hold: "from-suite-danger/80 to-suite-danger/30 text-suite-danger",
  caution: "from-suite-warning/80 to-suite-warning/30 text-suite-warning",
  ready: "from-suite-success/80 to-suite-success/30 text-suite-success",
};

const HEADLINE: Record<ReadinessSummary["level"], string> = {
  hold: "text-suite-danger",
  caution: "text-suite-warning",
  ready: "text-suite-success",
};

export function ReadinessScoreHero({
  summary,
  artistName,
  title,
}: {
  summary: ReadinessSummary;
  artistName?: string | null;
  title: string;
}) {
  const reduce = useReducedMotion();
  const ring = RING[summary.level];

  return (
    <section className="forge-glass relative overflow-hidden p-5 md:p-7" data-testid="prepare-readiness-score">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1] flex flex-col items-center text-center">
        <p className="nexus-eyebrow">Release readiness</p>
        <p className="mt-2 font-display text-xl text-white">{title}</p>
        {artistName ? <p className="text-sm text-white/45">{artistName}</p> : null}

        <div className="relative mt-8 flex h-36 w-36 items-center justify-center">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br opacity-25 blur-xl ${ring}`} aria-hidden />
          {!reduce ? (
            <motion.div
              className={`flex h-full w-full flex-col items-center justify-center rounded-full border-2 bg-black/20 backdrop-blur-sm ${ring.split(" ").slice(2).join(" ")}`}
              style={{ borderColor: "currentColor" }}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="font-display text-4xl font-semibold tabular-nums">{summary.score}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">Score</span>
            </motion.div>
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-center rounded-full border-2 bg-black/20 ${ring.split(" ").slice(2).join(" ")}`}
              style={{ borderColor: "currentColor" }}
            >
              <span className="font-display text-4xl font-semibold tabular-nums">{summary.score}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">Score</span>
            </div>
          )}
        </div>

        <h2 className={`mt-6 text-lg font-semibold ${HEADLINE[summary.level]}`}>{summary.headline}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">{summary.subline}</p>

        {summary.level === "hold" ? (
          <p className="mt-3 text-xs text-white/35">Red — resolve critical issues before you publish.</p>
        ) : summary.level === "caution" ? (
          <p className="mt-3 text-xs text-white/35">Amber — your track plays, but distribution may push back.</p>
        ) : (
          <p className="mt-3 text-xs text-white/35">Green — measured checks look solid for release.</p>
        )}
      </div>
    </section>
  );
}
