import type { AudioProbe } from "@vybz/domain/releases";

function fmt(n: number | null | undefined, digits = 1, suffix = ""): string {
  if (n == null || Number.isNaN(n)) return "Not measured";
  return `${n.toFixed(digits)}${suffix}`;
}

/**
 * Measured advanced-analysis strip for Finalize results (M5).
 * Only renders values present on the probe — never fabricates.
 */
export function AdvancedAnalysisPanel({ probe }: { probe: AudioProbe | null | undefined }) {
  if (!probe?.loudnessMeasured) return null;

  const rows: Array<{ label: string; value: string }> = [
    {
      label: "Integrated",
      value:
        probe.integratedLufs != null
          ? `${probe.integratedLufs.toFixed(1)} LUFS`
          : probe.integratedLufsApprox != null
            ? `~${probe.integratedLufsApprox.toFixed(1)} LUFS (est.)`
            : "Not measured",
    },
    { label: "True peak", value: fmt(probe.truePeakDbtp, 1, " dBTP") },
    { label: "Sample peak", value: fmt(probe.peakDbfs, 1, " dBFS") },
    { label: "Crest factor", value: fmt(probe.crestFactorDb, 1, " dB") },
    {
      label: "L/R correlation",
      value:
        probe.stereoCorrelation == null ? "Not measured" : probe.stereoCorrelation.toFixed(2),
    },
    { label: "Loudness range", value: fmt(probe.loudnessRangeLu, 1, " LU") },
  ];

  if (probe.spectralBalance) {
    const { lowShare, midShare, highShare } = probe.spectralBalance;
    rows.push({
      label: "Spectrum L/M/H",
      value: `${Math.round(lowShare * 100)}/${Math.round(midShare * 100)}/${Math.round(highShare * 100)}%`,
    });
  }

  if (probe.clippedSamples != null) {
    rows.push({
      label: "Clipped samples",
      value: String(probe.clippedSamples),
    });
  }

  if (probe.silenceLeadInSeconds != null || probe.silenceLeadOutSeconds != null) {
    rows.push({
      label: "Silence in/out",
      value: `${fmt(probe.silenceLeadInSeconds, 1, "s")} / ${fmt(probe.silenceLeadOutSeconds, 1, "s")}`,
    });
  }

  if (probe.dcOffsetAbs != null) {
    rows.push({
      label: "DC offset",
      value:
        probe.dcOffsetDbfs != null
          ? `${probe.dcOffsetAbs.toFixed(4)} (${probe.dcOffsetDbfs.toFixed(1)} dBFS)`
          : probe.dcOffsetAbs.toFixed(4),
    });
  }

  if (probe.monoLossDb != null) {
    rows.push({ label: "Mono fold-down", value: fmt(probe.monoLossDb, 1, " dB") });
  }

  if (probe.momentaryLufs != null || probe.shortTermLufs != null) {
    rows.push({
      label: "Momentary / short-term",
      value: `${fmt(probe.momentaryLufs, 1, " LUFS")} / ${fmt(probe.shortTermLufs, 1, " LUFS")}`,
    });
  }

  return (
    <section className="forge-glass relative p-4 md:p-5" data-testid="prepare-advanced-analysis">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1]">
        <p className="nexus-eyebrow">Advanced analysis</p>
        <p className="mt-1 text-xs text-white/40">
          Measured on your device. Heuristics are labelled in findings — not standards claims.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] uppercase tracking-wide text-white/35">{row.label}</dt>
              <dd className="mt-0.5 text-sm tabular-nums text-white/85">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
