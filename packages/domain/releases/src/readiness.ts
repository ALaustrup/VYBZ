import type {
  FindingCategory,
  FindingSeverity,
  ReleaseFinding,
  ReleaseStatus,
} from "./types";

/** Portable probe result from readiness worker (serializable). */
export type AudioProbe = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  container?: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  durationSeconds?: number;
  titleFromName?: string;
  artistFromName?: string;
  /** Optional composer tag from audio metadata / filename heuristics. */
  composerFromName?: string;
  /** Measured sample peak in dBFS — present only when PCM was analyzed. */
  peakDbfs?: number;
  /** Measured RMS in dBFS — present only when PCM was analyzed. */
  rmsDbfs?: number;
  /** Approximate integrated loudness (LUFS-like) — pre-M4 gated RMS; prefer `integratedLufs`. */
  integratedLufsApprox?: number;
  /** BS.1770-4 integrated loudness when measured (LUFS). */
  integratedLufs?: number;
  momentaryLufs?: number;
  shortTermLufs?: number;
  loudnessRangeLu?: number;
  /** True peak via oversampling (dBTP). */
  truePeakDbtp?: number;
  loudnessProvenance?: {
    standard: "BS.1770-4";
    meterVersion: string;
    sampleRate: number;
    channelCount: number;
    truePeakOversample: number;
    environment: string;
  };
  /** True when loudness metrics were measured from PCM, not inferred. */
  loudnessMeasured?: boolean;
  /** How the PCM was obtained: in-worker WAV decode, or host Web Audio decode. */
  loudnessMethod?: "pcm-wav" | "decoded";
  /** Rate the loudness analysis ran at. */
  loudnessSampleRate?: number;
  /** True when the decoder resampled, so sample peak may shift slightly. */
  loudnessResampled?: boolean;
  /** Declared bitrate for compressed containers. */
  bitrateKbps?: number;
  bitrateMode?: "cbr" | "vbr";
  /** True when duration was derived from bitrate rather than declared. */
  durationEstimated?: boolean;
  codecProfile?: string;
};

export type ArtworkProbe = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  format?: string;
};

export type ReleaseContextProbe = {
  title: string;
  artistName: string | null;
  hasAudio: boolean;
  hasArtwork: boolean;
  audio?: AudioProbe | null;
  artwork?: ArtworkProbe | null;
};

export type FindingDraft = Omit<
  ReleaseFinding,
  "id" | "releaseId" | "ownerId" | "createdAt" | "updatedAt" | "status" | "assetId"
> & { assetId?: string | null };

function finding(
  code: string,
  severity: FindingSeverity,
  category: FindingCategory,
  title: string,
  detail: string
): FindingDraft {
  return { code, severity, category, title, detail, assetId: null };
}

/** Pure readiness rules — $0 client compute; no I/O. */
export function evaluateReadiness(ctx: ReleaseContextProbe): FindingDraft[] {
  const out: FindingDraft[] = [];

  if (!ctx.title.trim()) {
    out.push(
      finding(
        "METADATA_TITLE_MISSING",
        "blocking",
        "metadata",
        "Release title required",
        "Set a title before packaging this release."
      )
    );
  }

  if (!ctx.artistName?.trim()) {
    out.push(
      finding(
        "METADATA_ARTIST_MISSING",
        "warning",
        "metadata",
        "Artist name missing",
        "Add a primary artist for distribution metadata."
      )
    );
  }

  if (!ctx.hasAudio) {
    out.push(
      finding(
        "AUDIO_MISSING",
        "blocking",
        "audio",
        "No audio attached",
        "Import at least one audio master to run readiness."
      )
    );
  } else if (ctx.audio) {
    out.push(...evaluateAudio(ctx.audio));
  }

  if (!ctx.hasArtwork) {
    out.push(
      finding(
        "ARTWORK_MISSING",
        "warning",
        "artwork",
        "No artwork attached",
        "Most distributors require square cover art (typically 3000×3000)."
      )
    );
  } else if (ctx.artwork) {
    out.push(...evaluateArtwork(ctx.artwork));
  }

  return out;
}

/**
 * Provenance suffix for measured loudness values. States how the PCM was obtained
 * so an expert can judge the number and a newcomer is not misled.
 */
function loudnessProvenance(audio: AudioProbe): string {
  if (audio.loudnessMethod === "decoded") {
    return audio.loudnessResampled
      ? " (measured from decoded audio; decoder resampled, so peak may differ slightly from the source)"
      : " (measured from decoded audio)";
  }
  if (audio.loudnessMethod === "pcm-wav") return " (measured from file PCM)";
  return "";
}

export function evaluateAudio(audio: AudioProbe): FindingDraft[] {
  const out: FindingDraft[] = [];
  const name = audio.fileName.toLowerCase();

  if (!/\.(wav|flac|aiff?|mp3|m4a|ogg)$/i.test(audio.fileName)) {
    out.push(
      finding(
        "AUDIO_FORMAT_UNKNOWN",
        "warning",
        "audio",
        "Unrecognized audio extension",
        `File “${audio.fileName}” may not be accepted by all distributors.`
      )
    );
  }

  if (audio.sizeBytes <= 0) {
    out.push(
      finding(
        "AUDIO_EMPTY",
        "blocking",
        "audio",
        "Empty audio file",
        "The selected file has zero bytes."
      )
    );
  }

  if (audio.sampleRate !== undefined && audio.sampleRate < 44100) {
    out.push(
      finding(
        "AUDIO_SAMPLE_RATE_LOW",
        "warning",
        "audio",
        "Sample rate below 44.1 kHz",
        `Detected ${audio.sampleRate} Hz. Prefer 44.1 kHz or higher for release masters.`
      )
    );
  }

  if (audio.durationSeconds !== undefined && audio.durationSeconds < 1) {
    out.push(
      finding(
        "AUDIO_DURATION_SHORT",
        "blocking",
        "audio",
        "Track too short",
        "Duration is under one second."
      )
    );
  }

  if (/[^\w.\- ()[\]]/.test(audio.fileName) || /\s{2,}/.test(audio.fileName)) {
    out.push(
      finding(
        "FILENAME_INVALID",
        "info",
        "metadata",
        "Filename may need cleanup",
        `Consider simplifying “${audio.fileName}” before delivery.`
      )
    );
  }

  const provenance = loudnessProvenance(audio);

  if (audio.loudnessMeasured && audio.peakDbfs !== undefined) {
    if (audio.peakDbfs >= -0.1) {
      out.push(
        finding(
          "AUDIO_PEAK_CLIP",
          "blocking",
          "audio",
          "Sample peak reaches full scale",
          `Sample peak measured at ${audio.peakDbfs.toFixed(1)} dBFS${provenance}. Lower your limiter ceiling and re-export so peaks land below −1 dBFS.`
        )
      );
    } else if (audio.peakDbfs > -1) {
      const truePeakNote =
        audio.truePeakDbtp != null
          ? ` True peak measured at ${audio.truePeakDbtp.toFixed(1)} dBTP.`
          : " True peak was not measured on this path.";
      out.push(
        finding(
          "AUDIO_PEAK_HOT",
          "warning",
          "audio",
          "Sample peak close to full scale",
          `Sample peak measured at ${audio.peakDbfs.toFixed(1)} dBFS${provenance}.${truePeakNote} Leaving 1 dB of headroom protects against codec overshoot.`
        )
      );
    }
  }

  if (audio.loudnessMeasured && audio.truePeakDbtp != null && audio.truePeakDbtp > -1) {
    out.push(
      finding(
        "AUDIO_TRUE_PEAK_HOT",
        "warning",
        "audio",
        "True peak close to full scale",
        `True peak measured at ${audio.truePeakDbtp.toFixed(1)} dBTP${provenance} (BS.1770-4 oversampled). Codec conversion may clip; leave more limiter headroom.`
      )
    );
  }

  const integrated =
    audio.integratedLufs ??
    (audio.loudnessMeasured ? audio.integratedLufsApprox : undefined);
  const bsCertified = audio.integratedLufs != null && audio.loudnessProvenance?.standard === "BS.1770-4";
  const methodLabel = bsCertified
    ? "BS.1770-4"
    : "estimated, not standards-certified";

  if (audio.loudnessMeasured && integrated !== undefined) {
    const lufs = integrated;
    if (lufs > -8) {
      out.push(
        finding(
          "AUDIO_LOUDNESS_HOT",
          "warning",
          "audio",
          "Track reads loud for streaming",
          `Integrated loudness ${lufs.toFixed(1)} LUFS${provenance} — ${methodLabel}. Streaming platforms normalise near −14 LUFS.`
        )
      );
    } else if (lufs < -22) {
      out.push(
        finding(
          "AUDIO_LOUDNESS_QUIET",
          "warning",
          "audio",
          "Track reads quiet",
          `Integrated loudness ${lufs.toFixed(1)} LUFS${provenance} — ${methodLabel}. Consider gentle gain or limiting so listeners do not need to turn up.`
        )
      );
    }
  }

  if (!audio.loudnessMeasured) {
    out.push(
      finding(
        "AUDIO_LOUDNESS_NOT_MEASURED",
        "info",
        "audio",
        "Loudness not measured",
        "This device could not decode the audio, so loudness and peak are unavailable. Import a WAV, FLAC or MP3 master to measure them."
      )
    );
  }

  if (name.endsWith(".mp3") || audio.mimeType.includes("mpeg")) {
    const bitrate = audio.bitrateKbps ? ` Declared bitrate ${audio.bitrateKbps} kbps.` : "";
    out.push(
      finding(
        "AUDIO_LOSSY_MASTER",
        "warning",
        "audio",
        "Lossy master detected",
        `MP3 has already discarded audio data that mastering cannot recover.${bitrate} Upload the WAV, FLAC or AIFF from your mastering chain when you have it.`
      )
    );
  }

  return out;
}

export function evaluateArtwork(art: ArtworkProbe): FindingDraft[] {
  const out: FindingDraft[] = [];

  if (art.width !== undefined && art.height !== undefined) {
    if (art.width < 1400 || art.height < 1400) {
      out.push(
        finding(
          "ARTWORK_TOO_SMALL",
          "blocking",
          "artwork",
          "Artwork below 1400px",
          `Detected ${art.width}×${art.height}. Many stores require at least 1400×1400.`
        )
      );
    } else if (art.width < 3000 || art.height < 3000) {
      out.push(
        finding(
          "ARTWORK_BELOW_RECOMMENDED",
          "warning",
          "artwork",
          "Artwork below 3000px",
          `Detected ${art.width}×${art.height}. 3000×3000 is the common recommended size.`
        )
      );
    }

    if (art.width !== art.height) {
      out.push(
        finding(
          "ARTWORK_NOT_SQUARE",
          "warning",
          "artwork",
          "Artwork is not square",
          `Detected ${art.width}×${art.height}. Cover art is usually 1:1.`
        )
      );
    }
  } else {
    out.push(
      finding(
        "ARTWORK_DIMENSIONS_UNKNOWN",
        "info",
        "artwork",
        "Could not read artwork dimensions",
        "Re-export as PNG or JPEG if checks look incomplete."
      )
    );
  }

  return out;
}

export function deriveReleaseStatus(findings: { severity: FindingSeverity; status: string }[]): ReleaseStatus {
  const open = findings.filter((f) => f.status === "open");
  if (open.some((f) => f.severity === "blocking")) return "blocked";
  if (open.length === 0) return "ready";
  return "draft";
}

export function parseArtistTitleFromFilename(fileName: string): {
  artistFromName?: string;
  titleFromName?: string;
} {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  const parts = base.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { artistFromName: parts[0]!.trim(), titleFromName: parts.slice(1).join(" - ").trim() };
  }
  return { titleFromName: base };
}
