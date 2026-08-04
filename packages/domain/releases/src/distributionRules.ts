/**
 * Distribution readiness rules — loudness, ISRC, artwork DPI.
 * Pure / deterministic; safe for portable or remote-job result payloads.
 */
import type { FindingCategory, FindingSeverity } from "./types";
import type { ArtworkProbe, FindingDraft } from "./readiness";

export type LoudnessMetrics = {
  /** Integrated loudness (LUFS). Negative number, e.g. -14. */
  integratedLufs?: number | null;
  /** True peak in dBTP. Only set by an oversampling true-peak meter. */
  truePeakDb?: number | null;
  /** Sample peak in dBFS. Not a substitute for true peak. */
  samplePeakDbfs?: number | null;
};

export type DistributionContext = {
  title: string;
  artistName?: string | null;
  /** International Standard Recording Code — with or without dashes. */
  isrc?: string | null;
  hasAudio: boolean;
  hasArtwork: boolean;
  loudness?: LoudnessMetrics | null;
  artwork?: (ArtworkProbe & { dpi?: number | null }) | null;
  /** When true, treat missing loudness as blocking (remote job expected). */
  requireLoudness?: boolean;
};

function finding(
  code: string,
  severity: FindingSeverity,
  category: FindingCategory,
  title: string,
  detail: string
): FindingDraft {
  return { code, severity, category, title, detail, assetId: null };
}

/** ISRC: 12 alphanumeric (CC-XXX-YY-NNNNN) with optional separators. */
export function normalizeIsrc(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsrc(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const n = normalizeIsrc(raw);
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(n);
}

/**
 * Apply distribution packaging checks (portable or remote metrics).
 * Streaming target ≈ −14 LUFS; warn hot masters; DPI for print artwork.
 */
export function evaluateDistribution(ctx: DistributionContext): FindingDraft[] {
  const out: FindingDraft[] = [];

  if (!ctx.title.trim()) {
    out.push(
      finding(
        "DIST_TITLE_MISSING",
        "blocking",
        "metadata",
        "Title required for distribution",
        "Set a release title before packaging."
      )
    );
  }

  if (!ctx.hasAudio) {
    out.push(
      finding(
        "DIST_AUDIO_MISSING",
        "blocking",
        "audio",
        "Audio master required",
        "Attach a distribution master before export."
      )
    );
  }

  out.push(...evaluateIsrc(ctx.isrc));
  out.push(...evaluateLoudness(ctx.loudness, ctx.requireLoudness === true));
  if (ctx.hasArtwork && ctx.artwork) {
    out.push(...evaluateArtworkDpi(ctx.artwork));
  } else if (!ctx.hasArtwork) {
    out.push(
      finding(
        "DIST_ARTWORK_MISSING",
        "warning",
        "artwork",
        "Cover art missing",
        "Most DSPs require square cover art ≥1400px."
      )
    );
  }

  return out;
}

export function evaluateIsrc(isrc: string | null | undefined): FindingDraft[] {
  if (!isrc?.trim()) {
    return [
      finding(
        "DIST_ISRC_MISSING",
        "warning",
        "metadata",
        "ISRC not set",
        "Add a valid ISRC before submitting to most distributors."
      ),
    ];
  }
  if (!isValidIsrc(isrc)) {
    return [
      finding(
        "DIST_ISRC_INVALID",
        "blocking",
        "metadata",
        "ISRC format invalid",
        `“${isrc}” is not a valid ISRC (expected CC-XXX-YY-NNNNN).`
      ),
    ];
  }
  return [];
}

export function evaluateLoudness(
  loudness: LoudnessMetrics | null | undefined,
  requireLoudness: boolean
): FindingDraft[] {
  const out: FindingDraft[] = [];
  const lufs = loudness?.integratedLufs;

  if (lufs == null || Number.isNaN(lufs)) {
    if (requireLoudness) {
      out.push(
        finding(
          "DIST_LOUDNESS_MISSING",
          "blocking",
          "audio",
          "Loudness analysis missing",
          "Run a loudness job (portable or remote) before packaging."
        )
      );
    } else {
      out.push(
        finding(
          "DIST_LOUDNESS_UNKNOWN",
          "info",
          "audio",
          "Loudness not measured",
          "Optional: run analysis for LUFS / true-peak checks."
        )
      );
    }
    return out;
  }

  // Hot master risk for streaming
  if (lufs > -9) {
    out.push(
      finding(
        "DIST_LOUDNESS_HOT",
        "blocking",
        "audio",
        "Master too loud",
        `Integrated ${lufs.toFixed(1)} LUFS exceeds −9 LUFS. Reduce gain before distribution.`
      )
    );
  } else if (lufs > -12) {
    out.push(
      finding(
        "DIST_LOUDNESS_ABOVE_STREAM",
        "warning",
        "audio",
        "Louder than streaming target",
        `Integrated ${lufs.toFixed(1)} LUFS. Many platforms normalize near −14 LUFS.`
      )
    );
  } else if (lufs < -20) {
    out.push(
      finding(
        "DIST_LOUDNESS_QUIET",
        "warning",
        "audio",
        "Master quieter than typical",
        `Integrated ${lufs.toFixed(1)} LUFS. Confirm intentional dynamics.`
      )
    );
  }

  const truePeak = loudness?.truePeakDb;
  if (truePeak != null && !Number.isNaN(truePeak) && truePeak > -1) {
    out.push(
      finding(
        "DIST_TRUE_PEAK_HIGH",
        "warning",
        "audio",
        "True peak above −1 dBTP",
        `True peak ${truePeak.toFixed(1)} dBTP may clip after codec conversion.`
      )
    );
  }

  const samplePeak = loudness?.samplePeakDbfs;
  if (samplePeak != null && !Number.isNaN(samplePeak) && samplePeak > -1) {
    out.push(
      finding(
        "DIST_SAMPLE_PEAK_HIGH",
        "warning",
        "audio",
        "Sample peak above −1 dBFS",
        `Sample peak ${samplePeak.toFixed(1)} dBFS. True peak is not measured yet, and codec conversion typically adds overshoot above sample peak.`
      )
    );
  }

  return out;
}

export function evaluateArtworkDpi(
  art: ArtworkProbe & { dpi?: number | null }
): FindingDraft[] {
  const out: FindingDraft[] = [];
  if (art.dpi != null && art.dpi > 0 && art.dpi < 300) {
    out.push(
      finding(
        "DIST_ARTWORK_DPI_LOW",
        "warning",
        "artwork",
        "Artwork DPI below 300",
        `Detected ${art.dpi} DPI. Print-ready art is typically 300 DPI.`
      )
    );
  }
  if (art.width != null && art.height != null) {
    if (art.width < 1400 || art.height < 1400) {
      out.push(
        finding(
          "DIST_ARTWORK_TOO_SMALL",
          "blocking",
          "artwork",
          "Artwork below store minimum",
          `Detected ${art.width}×${art.height}. Require at least 1400×1400.`
        )
      );
    }
  }
  return out;
}

export type DistributionVerdict = "pass" | "fail" | "warnings";

export function distributionVerdict(findings: { severity: FindingSeverity }[]): DistributionVerdict {
  if (findings.some((f) => f.severity === "blocking")) return "fail";
  if (findings.some((f) => f.severity === "warning")) return "warnings";
  return "pass";
}
