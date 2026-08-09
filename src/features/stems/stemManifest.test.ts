import { describe, expect, it } from "vitest";
import {
  STEM_SET_FORMAT,
  buildStemManifest,
  inferStemRole,
  stemWavFileName,
} from "./stemManifest";

describe("stemManifest", () => {
  it("infers common stem roles from filenames", () => {
    expect(inferStemRole("Vocals_Lead.wav")).toBe("vocals");
    expect(inferStemRole("01_drums.aiff")).toBe("drums");
    expect(inferStemRole("bass.wav")).toBe("bass");
  });

  it("builds a versioned manifest with isolation note", () => {
    const m = buildStemManifest({
      title: "My Track",
      createdAt: "2026-08-08T00:00:00.000Z",
      stems: [
        {
          role: "vocals",
          fileName: "01_vocals.wav",
          sourceName: "vocals.wav",
          sha256: "abc",
          byteLength: 10,
          metrics: {
            peakDbfs: -1,
            rmsDbfs: -12,
            durationSeconds: 1,
            sampleRate: 48000,
            channels: 2,
          },
          corrections: [],
        },
      ],
    });
    expect(m.format).toBe(STEM_SET_FORMAT);
    expect(m.note).toMatch(/Not added to Library/i);
    expect(m.note).toMatch(/Not AI source separation/i);
    expect(m.stems).toHaveLength(1);
  });

  it("avoids colliding stem WAV names", () => {
    const used = new Set<string>();
    const a = stemWavFileName("vocals", 0, used);
    const b = stemWavFileName("vocals", 0, used);
    expect(a).toBe("01_vocals.wav");
    expect(b).not.toBe(a);
  });
});
