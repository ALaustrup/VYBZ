import { describe, expect, it } from "vitest";
import { STEM_SET_FORMAT } from "./stemManifest";
import { buildStemSetZip, type AssembledStem } from "./stemAssemble";

function fakeStem(role: string): AssembledStem {
  const wavBytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  return {
    id: crypto.randomUUID(),
    role,
    sourceName: `${role}.wav`,
    fileName: "",
    wavBytes,
    metrics: {
      peakDbfs: -3,
      rmsDbfs: -14,
      durationSeconds: 1,
      sampleRate: 48000,
      channels: 2,
    },
    sha256: "deadbeef",
    corrections: [],
  };
}

describe("buildStemSetZip", () => {
  it("packs manifest, readme, and stem WAVs", async () => {
    const { zip, manifestJson } = await buildStemSetZip({
      title: "Demo",
      stems: [fakeStem("vocals"), fakeStem("drums")],
    });
    expect(zip.byteLength).toBeGreaterThan(100);
    const manifest = JSON.parse(manifestJson) as { format: string; stems: unknown[] };
    expect(manifest.format).toBe(STEM_SET_FORMAT);
    expect(manifest.stems).toHaveLength(2);
    // ZIP local file signature
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
  });
});
