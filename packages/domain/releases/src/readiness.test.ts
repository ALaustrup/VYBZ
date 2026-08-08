import { describe, expect, it } from "vitest";
import {
  deriveReleaseStatus,
  evaluateReadiness,
  buildReleaseProject,
  parseArtistTitleFromFilename,
} from "@vybz/domain/releases";

describe("evaluateReadiness", () => {
  it("blocks when audio is missing", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: false,
      hasArtwork: false,
    });
    expect(findings.some((f) => f.code === "AUDIO_MISSING" && f.severity === "blocking")).toBe(true);
    expect(findings.some((f) => f.code === "ARTWORK_MISSING")).toBe(true);
  });

  it("flags measured loudness when present", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: true,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 44100,
        durationSeconds: 120,
        loudnessMeasured: true,
        peakDbfs: 0.2,
        integratedLufsApprox: -6,
      },
      artwork: {
        fileName: "cover.png",
        mimeType: "image/png",
        sizeBytes: 100,
        width: 3000,
        height: 3000,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_PEAK_CLIP")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_LOUDNESS_HOT")).toBe(true);
  });

  it("reports Not measured instead of fabricating loudness", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 44100,
        durationSeconds: 120,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_LOUDNESS_NOT_MEASURED")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_LOUDNESS_HOT")).toBe(false);
    expect(findings.some((f) => f.code === "AUDIO_LOUDNESS_QUIET")).toBe(false);
    expect(findings.some((f) => f.code.startsWith("AUDIO_PEAK"))).toBe(false);
  });

  it("discloses decode provenance and never calls sample peak a true peak", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.mp3",
        mimeType: "audio/mpeg",
        sizeBytes: 4_000_000,
        sampleRate: 44100,
        durationSeconds: 210,
        bitrateKbps: 320,
        loudnessMeasured: true,
        loudnessMethod: "decoded",
        loudnessResampled: true,
        peakDbfs: -0.4,
        integratedLufsApprox: -5.2,
      },
    });

    const peak = findings.find((f) => f.code === "AUDIO_PEAK_HOT");
    expect(peak?.title).toContain("Sample peak");
    expect(peak?.detail).toContain("decoded audio");
    expect(peak?.detail).toContain("resampled");
    expect(peak?.detail).not.toMatch(/measured true peak/i);
    expect(peak?.detail).toMatch(/True peak was not measured/i);

    const loud = findings.find((f) => f.code === "AUDIO_LOUDNESS_HOT");
    expect(loud?.detail).toContain("not standards-certified");

    expect(findings.some((f) => f.code === "AUDIO_LOUDNESS_NOT_MEASURED")).toBe(false);
    expect(findings.find((f) => f.code === "AUDIO_LOSSY_MASTER")?.detail).toContain("320 kbps");
  });

  it("prefers BS.1770 integrated loudness and reports true peak when measured", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 120,
        loudnessMeasured: true,
        loudnessMethod: "pcm-wav",
        peakDbfs: -0.5,
        integratedLufsApprox: -4,
        integratedLufs: -5.5,
        truePeakDbtp: -0.2,
        loudnessProvenance: {
          standard: "BS.1770-4",
          meterVersion: "m4.bs1770.1",
          sampleRate: 48000,
          channelCount: 2,
          truePeakOversample: 4,
          environment: "portable",
        },
      },
    });
    const loud = findings.find((f) => f.code === "AUDIO_LOUDNESS_HOT");
    expect(loud?.detail).toContain("-5.5 LUFS");
    expect(loud?.detail).toContain("BS.1770-4");
    expect(loud?.detail).not.toContain("not standards-certified");
    expect(findings.some((f) => f.code === "AUDIO_TRUE_PEAK_HOT")).toBe(true);
  });

  it("emits M5 dynamics and stereo findings from measured metrics only", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 120,
        loudnessMeasured: true,
        peakDbfs: -1,
        rmsDbfs: -4,
        crestFactorDb: 3,
        stereoCorrelation: -0.5,
        loudnessRangeLu: 2,
        spectralBalance: { lowShare: 0.7, midShare: 0.2, highShare: 0.1 },
        integratedLufs: -14,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_DYNAMICS_CRUSHED")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_STEREO_OUT_OF_PHASE")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_LRA_LOW")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_SPECTRAL_BASS_HEAVY")).toBe(true);
  });

  it("flags clipped samples and long edge silence when measured", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 60,
        channels: 2,
        loudnessMeasured: true,
        peakDbfs: -0.5,
        clippedSamples: 120,
        maxClipRun: 8,
        silenceLeadInSeconds: 4.2,
        silenceLeadOutSeconds: 5.5,
        integratedLufs: -14,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_CLIPPING_SAMPLES")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_SILENCE_LEAD_IN")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_SILENCE_LEAD_OUT")).toBe(true);
  });

  it("flags DC offset and mono fold-down loss when measured", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 60,
        loudnessMeasured: true,
        peakDbfs: -3,
        dcOffsetAbs: 0.02,
        dcOffsetDbfs: -34,
        monoLossDb: -9.5,
        integratedLufs: -14,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_DC_OFFSET")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_MONO_COMPAT_LOSS")).toBe(true);
  });

  it("flags channel imbalance and momentary spikes when measured", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 60,
        loudnessMeasured: true,
        peakDbfs: -3,
        channelBalanceDb: 4.5,
        leftRmsDbfs: -12,
        rightRmsDbfs: -16.5,
        integratedLufs: -14,
        momentaryLufs: -4,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_CHANNEL_IMBALANCE")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_MOMENTARY_SPIKE")).toBe(true);
  });

  it("flags low PLR and side-heavy stereo when measured", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 60,
        loudnessMeasured: true,
        peakDbfs: -1,
        truePeakDbtp: -0.5,
        integratedLufs: -8,
        plrDb: 4.5,
        sideToMidDb: -3,
        midRmsDbfs: -14,
        sideRmsDbfs: -17,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_PLR_LOW")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_STEREO_SIDE_HEAVY")).toBe(true);
  });

  it("flags intersample overshoot and mains hum when measured", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: false,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 48000,
        durationSeconds: 60,
        loudnessMeasured: true,
        peakDbfs: -2,
        truePeakDbtp: -0.3,
        ispOvershootDb: 1.7,
        mainsHumHz: 60,
        mainsHumProminenceDb: 18,
      },
    });
    expect(findings.some((f) => f.code === "AUDIO_IS_PEAK_RISK")).toBe(true);
    expect(findings.some((f) => f.code === "AUDIO_MAINS_HUM")).toBe(true);
  });

  it("flags small non-square artwork", () => {
    const findings = evaluateReadiness({
      title: "Song",
      artistName: "Artist",
      hasAudio: true,
      hasArtwork: true,
      audio: {
        fileName: "Artist - Song.wav",
        mimeType: "audio/wav",
        sizeBytes: 1000,
        sampleRate: 44100,
        durationSeconds: 120,
      },
      artwork: {
        fileName: "cover.png",
        mimeType: "image/png",
        sizeBytes: 100,
        width: 800,
        height: 600,
      },
    });
    expect(findings.some((f) => f.code === "ARTWORK_TOO_SMALL")).toBe(true);
    expect(findings.some((f) => f.code === "ARTWORK_NOT_SQUARE")).toBe(true);
  });

  it("derives blocked status from open blocking findings", () => {
    expect(deriveReleaseStatus([{ severity: "blocking", status: "open" }])).toBe("blocked");
    expect(deriveReleaseStatus([])).toBe("ready");
  });
});

describe("buildReleaseProject", () => {
  it("trims title and supports idempotency key", () => {
    const p = buildReleaseProject({
      ownerId: "u1",
      title: "  Hello  ",
      idempotencyKey: "k1",
    });
    expect(p.title).toBe("Hello");
    expect(p.idempotencyKey).toBe("k1");
    expect(p.status).toBe("draft");
  });
});

describe("parseArtistTitleFromFilename", () => {
  it("splits Artist - Title", () => {
    expect(parseArtistTitleFromFilename("Ada - Neon.wav")).toEqual({
      artistFromName: "Ada",
      titleFromName: "Neon",
    });
  });
});
