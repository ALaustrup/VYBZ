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

    const loud = findings.find((f) => f.code === "AUDIO_LOUDNESS_HOT");
    expect(loud?.detail).toContain("not standards-certified");

    expect(findings.some((f) => f.code === "AUDIO_LOUDNESS_NOT_MEASURED")).toBe(false);
    expect(findings.find((f) => f.code === "AUDIO_LOSSY_MASTER")?.detail).toContain("320 kbps");
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
